#include <Arduino.h>
#include <Wire.h>
#include <math.h>
#include <string.h>
#include "config.h"
#include "lcd.h"

#if FILAHA_HAS_LCD

#define LCD_COLS 20
#define LCD_ROWS 4

// PCF8574 → HD44780 wiring used by the common backpacks (YwRobot / LCM1602):
//   P0 RS · P1 RW · P2 EN · P3 backlight · P4..P7 D4..D7  (4-bit mode)
#define PIN_RS 0x01
#define PIN_RW 0x02
#define PIN_EN 0x04
#define PIN_BL 0x08

#define LCD_REPROBE_MS 30000UL

static uint8_t       s_addr        = 0;
static bool          s_present     = false;
static bool          s_fault       = false;     // a transfer was NACKed
static uint8_t       s_bl          = FILAHA_LCD_BACKLIGHT ? PIN_BL : 0;
static unsigned long s_probe_at    = 0;
static bool          s_logged_gone = false;
static char          s_shadow[LCD_ROWS][LCD_COLS + 1];   // what is on the glass

// ── bus layer ─────────────────────────────────────────────────────
// One I²C transaction carries both bytes of an enable pulse (EN high, then
// low); at 100 kHz each byte lasts ~90 µs, far above the HD44780's 450 ns
// minimum. On any NACK the fault flag is set and everything above it unwinds.
static void lcd_put4(uint8_t nibble, uint8_t rs) {
  if (s_fault) return;
  const uint8_t v = (uint8_t)((nibble << 4) | rs | s_bl);
  Wire.beginTransmission(s_addr);
  Wire.write((uint8_t)(v | PIN_EN));
  Wire.write(v);
  if (Wire.endTransmission() != 0) { s_fault = true; return; }
  delayMicroseconds(40);                        // slowest ordinary instruction ≈ 37 µs
}

static void lcd_send(uint8_t b, uint8_t rs) { lcd_put4(b >> 4, rs); lcd_put4(b & 0x0F, rs); }
static void lcd_cmd(uint8_t c)              { lcd_send(c, 0); }
static void lcd_data(uint8_t c)             { lcd_send(c, PIN_RS); }

static const uint8_t ROW_BASE[LCD_ROWS] = { 0x00, 0x40, 0x14, 0x54 };   // 20×4 DDRAM map
static void set_cursor(int row, int col) { lcd_cmd((uint8_t)(0x80 | (ROW_BASE[row] + col))); }

static bool ack(uint8_t addr) {
  Wire.beginTransmission(addr);
  return Wire.endTransmission() == 0;
}

// ── the status signs ──────────────────────────────────────────────
// The ROM has no battery or signal glyphs, so they live in the controller's
// eight user-defined characters (CGRAM, 5×8 dots, bit 4 = leftmost dot). They are
// loaded once per initialisation, before the first draw.
enum Sign : uint8_t { SG_PLUG = 0, SG_BAT_FULL, SG_BAT_HALF, SG_BAT_LOW, SG_SIG3, SG_SIG2, SG_SIG1, SG_NONET };
static const uint8_t SIGNS[8][8] = {
  { 0x0A, 0x0A, 0x1F, 0x1F, 0x1F, 0x0E, 0x04, 0x04 },   // plug: on mains
  { 0x00, 0x1E, 0x1E, 0x1F, 0x1F, 0x1E, 0x1E, 0x00 },   // battery, horizontal: full
  { 0x00, 0x1E, 0x1A, 0x1B, 0x1B, 0x1A, 0x1E, 0x00 },   //                      half
  { 0x00, 0x1E, 0x12, 0x13, 0x13, 0x12, 0x1E, 0x00 },   //                      empty
  { 0x00, 0x01, 0x01, 0x05, 0x05, 0x15, 0x15, 0x15 },   // signal: three bars
  { 0x00, 0x00, 0x00, 0x04, 0x04, 0x14, 0x14, 0x14 },   //         two
  { 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x10, 0x10 },   //         one
  { 0x00, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x00, 0x00 },   // cross: no link to the servers
};

static void load_signs() {
  lcd_cmd(0x40);                                    // CGRAM address 0
  for (int i = 0; i < 8; i++)
    for (int j = 0; j < 8; j++) lcd_data(SIGNS[i][j]);
}

// HD44780 power-on sequence for 4-bit mode (datasheet fig. 24).
static bool hw_init() {
  s_fault = false;
  delay(50);                                    // controller needs >40 ms after Vcc
  lcd_put4(0x3, 0); delay(5);
  lcd_put4(0x3, 0); delayMicroseconds(150);
  lcd_put4(0x3, 0); delayMicroseconds(150);
  lcd_put4(0x2, 0);                                 // → 4-bit
  lcd_cmd(0x28);                                    // 4-bit, 2-line addressing, 5×8
  lcd_cmd(0x08);                                    // display off
  lcd_cmd(0x01); delay(3);                          // clear
  lcd_cmd(0x06);                                    // entry mode: increment, no shift
  lcd_cmd(0x0C);                                    // display on, no cursor, no blink
  load_signs();
  return !s_fault;
}

static bool probe_and_init() {
  uint8_t found = 0;
#if FILAHA_LCD_ADDR
  if (ack(FILAHA_LCD_ADDR)) found = FILAHA_LCD_ADDR;
#else
  if (ack(0x27))      found = 0x27;             // PCF8574
  else if (ack(0x3F)) found = 0x3F;             // PCF8574A
#endif
  if (!found) return false;
  s_addr = found;
  memset(s_shadow, 0, sizeof s_shadow);         // force a full redraw
  if (!hw_init()) return false;
  s_present = true;
  s_logged_gone = false;
  Serial.printf("[lcd] 20x4 display at 0x%02X\n", s_addr);
  return true;
}

// ── drawing ───────────────────────────────────────────────────────
// Rows are composed in fixed-width fields, so the layout cannot overflow or
// shift: every number is printed at a fixed width and `put` truncates anything
// that would run past the row.
static void put(char* row, int col, const char* s) {
  while (*s && col < LCD_COLS) row[col++] = *s++;
}

static void draw_row(int row, const char* text) {
  if (s_fault) return;
  if (memcmp(s_shadow[row], text, LCD_COLS) == 0) return;   // unchanged → no traffic
  set_cursor(row, 0);
  for (int i = 0; i < LCD_COLS; i++) lcd_data((uint8_t)text[i]);
  if (!s_fault) memcpy(s_shadow[row], text, LCD_COLS);
}

static void finish_draw() {
  if (!s_fault) return;
  // The first NACK ends the refresh. Drop to "absent" and let the periodic
  // probe bring the display back, rather than stalling the safety loop.
  s_present = false;
  s_probe_at = millis() + LCD_REPROBE_MS;
  memset(s_shadow, 0, sizeof s_shadow);
  if (!s_logged_gone) {
    Serial.println("[lcd] lost the display - will keep probing");
    s_logged_gone = true;
  }
}

static bool usable(bool has, float v) { return has && isfinite(v); }

// Where a value goes on the value row. The two outer values are pinned one
// column in from the edges and the two inner ones are centred in their own
// five-column slots, so the row has equal margins whatever the digit counts.
// Each number sits under the label printed on the box.
static int value_col(int slot, int len) {
  switch (slot) {
    case 0:  return 1;                          // temperature: left, one in
    case 1:  return 5 + (5 - len + 1) / 2;      // humidity: centred in columns 5-9
    case 2:  return 10 + (5 - len) / 2;         // CO2: centred in columns 10-14
    default: return 19 - len;                   // NH3: right, ending one in
  }
}

void lcd_show(const SensorReading& r, const LcdStatus& s) {
  if (!s_present) {
    if ((long)(millis() - s_probe_at) < 0) return;
    s_probe_at = millis() + LCD_REPROBE_MS;
    if (!probe_and_init()) return;
  }

  char rows[LCD_ROWS][LCD_COLS + 1];
  for (int i = 0; i < LCD_ROWS; i++) { memset(rows[i], ' ', LCD_COLS); rows[i][LCD_COLS] = 0; }

  // ── Row 0: two small signs in the top-right corner, no words ──────
  //   network (column 17)   power (column 19, the corner)
  uint8_t net_sign = SG_NONET;
  if (s.cloud_ok) {
    const int dbm = s.rssi_dbm;                 // 0 = unknown
    net_sign = (dbm != 0 && dbm >= -95) ? SG_SIG3 : (dbm != 0 && dbm >= -105) ? SG_SIG2 : SG_SIG1;
  }
  uint8_t pow_sign = SG_PLUG;
  if (!s.on_mains)
    pow_sign = (s.bat_pct >= 60) ? SG_BAT_FULL : (s.bat_pct >= 25) ? SG_BAT_HALF : SG_BAT_LOW;
  rows[0][17] = (char)net_sign;
  rows[0][19] = (char)pow_sign;

  // ── Row 2: the four values and nothing else ───────────────────────
  // Labels and units are printed on the box under the window, so the screen
  // carries only numbers. Dangers are not marked here: the buzzer, the SMS and
  // the call raise those. A missing reading shows "--".
  char v[4][12];
  if (usable(r.has_temp, r.temp_c)) snprintf(v[0], sizeof v[0], "%.1f", fmaxf(-99.9f, fminf(99.9f, r.temp_c)));
  else                              strcpy(v[0], "--");
  if (usable(r.has_hum, r.hum_pct)) snprintf(v[1], sizeof v[1], "%.0f", fmaxf(0.0f, fminf(100.0f, r.hum_pct)));
  else                              strcpy(v[1], "--");
  if (usable(r.has_co2, r.co2_ppm)) snprintf(v[2], sizeof v[2], "%d", (int)fmaxf(0.0f, fminf(9999.0f, r.co2_ppm)));
  else                              strcpy(v[2], "--");
#if FILAHA_HAS_NH3
  if (usable(r.has_nh3, r.nh3_ppm)) snprintf(v[3], sizeof v[3], "%.1f", fmaxf(0.0f, fminf(999.9f, r.nh3_ppm)));
  else                              strcpy(v[3], "--");
#else
  strcpy(v[3], "--");                           // until the NH3 sensor is fitted
#endif
  for (int i = 0; i < 4; i++) put(rows[2], value_col(i, (int)strlen(v[i])), v[i]);

  for (int i = 0; i < LCD_ROWS; i++) draw_row(i, rows[i]);
  finish_draw();
}

void lcd_message(const char* l0, const char* l1, const char* l2, const char* l3) {
  if (!s_present) return;
  const char* in[LCD_ROWS] = { l0, l1, l2, l3 };
  for (int i = 0; i < LCD_ROWS; i++) {
    char row[LCD_COLS + 1];
    memset(row, ' ', LCD_COLS); row[LCD_COLS] = 0;
    put(row, 0, in[i] ? in[i] : "");
    draw_row(i, row);
  }
  finish_draw();
}

void lcd_off() {
  if (!s_present) return;
  s_bl = 0;                                     // the next write carries backlight-off
  s_fault = false;
  lcd_cmd(0x08);                                    // display off
  finish_draw();
}

bool lcd_begin() {
  s_probe_at = millis() + LCD_REPROBE_MS;
  if (probe_and_init()) return true;
  Serial.println("[lcd] no display on the I2C bus (optional) - continuing without it");
  return false;
}

#endif  // FILAHA_HAS_LCD
