#include <Wire.h>
#include <math.h>
#include "config.h"
#include "sensors.h"

// ── CO₂ + temp + humidity via Sensirion STCC4 (DFRobot Gravity SEN0678) ─
//    Default I²C address per Sensirion: 0x64. Skipped entirely in TEST_MODE.
#if !FILAHA_TEST_MODE
  #include "DFRobot_STCC4.h"
  static DFRobot_STCC4_I2C stcc4(&Wire, 0x64);
static bool stcc4_ready = false;
#endif

#if FILAHA_HAS_NH3
  // ── NH₃ via MiCS-4514 (DFRobot Gravity SEN0377, I²C variant) ──────────
  #include "DFRobot_MICS.h"
  // Default Gravity I²C MiCS-4514 address — verify with the silkscreen.
  static DFRobot_MICS_I2C mics(&Wire, /*addr*/ 0x75);
  static bool mics_ready = false;
#endif

// Reads VBAT through the LilyGO voltage divider on BATTERY_ADC_PIN.
// Returns volts. Averaged over 5 samples — the modem's TX bursts put spikes
// on the rail that make single ADC reads jumpy.
static float read_vbat() {
  float sum = 0;
  for (int i = 0; i < 5; i++) {
    const int raw = analogRead(BATTERY_ADC_PIN);
    // ADC: 0..4095 → 0..3.3 V, divider ×2 → battery V.
    sum += (raw / 4095.0f) * 3.3f * 2.0f;
    delay(2);
  }
  return sum / 5.0f;
}

static int vbat_to_pct(float v) {
  // Simple linear LiPo curve: 3.30 V (empty) … 4.20 V (full).
  // Good enough for a status indicator — replace with a lookup table later.
  float pct = (v - 3.30f) / (4.20f - 3.30f) * 100.0f;
  if (pct < 0)   pct = 0;
  if (pct > 100) pct = 100;
  return (int)pct;
}

// Print every device that ACKs on the I²C bus. Invaluable for bring-up:
// it tells "no wiring/power" (nothing found) apart from "wrong address in
// code" (something found, but not where we look for it).
static void i2c_scan() {
  Serial.println("[i2c] scanning bus (SDA=21 SCL=22)…");
  int found = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("[i2c]   device found at 0x%02X\n", addr);
      found++;
    }
  }
  if (found == 0)
    Serial.println("[i2c]   NONE found — check 3V3/GND, SDA/SCL wiring and the I²C HUB");
  else
    Serial.printf("[i2c]   %d device(s) on the bus\n", found);
}

bool sensors_begin() {
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(I2C_FREQ_HZ);
  analogReadResolution(12);

  i2c_scan();   // list everything on the bus (debug the STCC4)

#if FILAHA_TEST_MODE
  Serial.println("[sensors] TEST MODE — synthetic CO₂/T/H, real battery only");
#else
 Serial.println("[sensors] STCC4 begin...");

if (!stcc4.begin())
{
    Serial.println("[sensors] STCC4 NOT found");
    stcc4_ready = false;
}
else
{
    stcc4_ready = true;
    Serial.println("[sensors] STCC4 detected");
    stcc4.startMeasurement();
}
#endif

#if FILAHA_HAS_NH3
  Serial.println("[sensors] MiCS-4514 begin…");
  mics_ready = (mics.begin() == 0);
  if (!mics_ready) {
    Serial.println("[sensors] MiCS NOT found — NH₃ field will be omitted");
  }
#endif

  return true;
}

bool sensors_read(SensorReading& out) {
  memset(&out, 0, sizeof(out));

#if FILAHA_TEST_MODE
  // Gently-varying synthetic values so the app shows the card "moving".
  // millis()/1000 drifts ~slowly; sin() gives a smooth wobble for temp.
  const unsigned long s = millis() / 1000UL;
  out.has_co2  = true; out.co2_ppm  = 800.0f + (float)((s * 7)  % 220);   // 800–1019
  out.has_temp = true; out.temp_c   = 24.0f  + (float)sin(s / 60.0f) * 2.0f;  // 22–26
  out.has_hum  = true; out.hum_pct  = 55.0f  + (float)((s * 3)  % 18);    // 55–72
#else
  // STCC4 → CO₂, temperature, humidity in one shot (only if present).
 if (stcc4_ready)
{
    uint16_t co2 = 0;
    float t = NAN;
    float h = NAN;
    uint16_t status = 0;

    if (stcc4.measurement(&co2, &t, &h, &status))
    {
        out.has_co2 = true;
        out.co2_ppm = (float)co2;

        out.has_temp = true;
        out.temp_c = t;

        out.has_hum = true;
        out.hum_pct = h;
    }
    else
    {
        Serial.println("[sensors] STCC4 read failed");
    }
}

  #if FILAHA_HAS_NH3
  if (mics_ready) {
    const float nh3 = mics.getGasData(NH3);   // ppm
    if (!isnan(nh3) && nh3 >= 0.0f) {
      out.has_nh3 = true;
      out.nh3_ppm = nh3;
    }
  }
  #endif
#endif

  // On battery → live measurement. On USB the sense circuit is dark, so we
  // report the last % measured on battery; 255 = "unknown" (never measured
  // since boot) which the server stores as null instead of a scary 0 %.
  const int bat = power_battery_pct();
  out.has_bat = true;
  out.bat_pct = (bat < 0) ? 255 : bat;

  // Always succeed — the battery field alone is enough to prove the device
  // is alive. SMS goes out every cycle no matter the sensor state.
  return true;
}

// ── Mains vs battery ──────────────────────────────────────────────
// The most safety-critical signal in the product, and it has been wrong twice,
// so this time it is built on something that cannot drift.
//
// The board offers ONE analog node: BATTERY_ADC_PIN, a divider on the BAT rail.
// With a battery permanently fitted — the normal installation — that node reads
// 3.3–4.2 V whether or not the charger is connected. v1.0.0 assumed a low
// reading meant "on battery", so with a battery always fitted it declared a
// power cut forever.
//
// Absolute thresholds cannot fix that either: the ESP32's SAR ADC is nonlinear
// and under-reads by an amount that varies chip to chip, so "4.13 V means
// charging" is only ever a guess about a particular unit.
//
// What IS reliable is the DIRECTION the rail moves, because every unit's error
// cancels out of a difference:
//
//   • Rising  → something is pushing charge in. Only the charger does that.
//   • Falling → the cell is being drained. Only happens off mains.
//   • Flat    → topped off on the charger (constant-voltage), or briefly
//               ambiguous. Either way: hold the last known state, never invent
//               a transition.
//
// A second, faster path covers the common case: a full battery unplugged from
// the charger drops away from the charging plateau immediately, so a fall of
// POWER_DROP_V below the highest level ever seen on mains is treated as a cut
// at once, without waiting for the trend window.
//
// Both tests are differences against a learned reference, so neither depends on
// the ADC being accurate — only on it being consistent, which it is.

static int           s_last_bat_pct = -1;    // last real cell % (-1 = no battery)
static bool          s_mains        = true;  // a device is installed plugged in
static float         s_mains_ref    = 0.0f;  // highest level seen while on mains
static float         s_anchor_v     = 0.0f;  // trend anchor
static unsigned long s_anchor_ms    = 0;

static float read_pin_v(int pin, float divider) {
  int raw = 0;
  for (int i = 0; i < 3; i++) { raw += analogRead(pin); delay(2); }
  return (raw / 3.0f / 4095.0f) * 3.3f * divider;
}

bool power_is_on_usb() {
#if FILAHA_VBUS_ADC_PIN >= 0
  // Dedicated charger-presence sense — unambiguous and instant.
  s_mains = read_pin_v(FILAHA_VBUS_ADC_PIN, 2.0f) > FILAHA_VBUS_MIN_V;
  return s_mains;
#else
  const float         v   = read_vbat();
  const unsigned long now = millis();

  // Rail dark → no battery fitted, so the charger must be feeding the board.
  if (v < 0.5f) { s_mains = true; return true; }

  // A device is always plugged in when it is switched on, so whatever the rail
  // reads during the first moments IS what "mains present" looks like on this
  // unit — this ADC, this divider, this battery. Learn it instead of assuming.
  if (now < POWER_BOOT_GRACE_MS) {
    if (v > s_mains_ref) s_mains_ref = v;
    s_anchor_v  = v;
    s_anchor_ms = now;
    s_mains     = true;
    return true;
  }

  // Fast path — a charged cell unplugged falls off the charging plateau at once.
  if (s_mains && s_mains_ref > 0.0f && v < s_mains_ref - POWER_DROP_V) {
    s_mains     = false;
    s_anchor_v  = v;
    s_anchor_ms = now;
    return false;
  }

  // Trend path — works in both directions and needs no calibration.
  if (s_anchor_v <= 0.0f) { s_anchor_v = v; s_anchor_ms = now; }

  if (v >= s_anchor_v + POWER_TREND_V) {          // charge going in
    s_mains     = true;
    s_anchor_v  = v;
    s_anchor_ms = now;
  } else if (v <= s_anchor_v - POWER_TREND_V) {   // charge coming out
    s_mains     = false;
    s_anchor_v  = v;
    s_anchor_ms = now;
  } else if (now - s_anchor_ms > POWER_TREND_WINDOW_MS) {
    s_anchor_v  = v;                              // flat — open a fresh window
    s_anchor_ms = now;
  }

  // The mains reference follows the rail up only, so a long cut cannot drag it
  // down and mask the next one.
  if (s_mains && v > s_mains_ref) s_mains_ref = v;

  return s_mains;
#endif
}

float power_vbat_volts() { return read_vbat(); }

// Bench aid: dump every spare ADC pin plus the detector's own state, so a
// plug/unplug on the bench shows exactly what this board does. If one of these
// pins turns out to carry a charger-presence divider, set FILAHA_VBUS_ADC_PIN
// to it and the heuristic above is bypassed completely.
void power_diag_print() {
#if FILAHA_POWER_DIAG
  // Once every few seconds, not on every poll - a line per second buries the
  // network and telemetry logs it is meant to sit alongside.
  static unsigned long s_last = 0;
  const unsigned long now = millis();
  if (s_last && now - s_last < 4000UL) return;
  s_last = now;

  static const int PINS[] = { 32, 33, 34, 35, 36, 39 };
  Serial.print("[pwr] ");
  for (unsigned i = 0; i < sizeof(PINS) / sizeof(PINS[0]); i++) {
    Serial.print(PINS[i]); Serial.print("=");
    Serial.print(read_pin_v(PINS[i], 1.0f), 2); Serial.print("V ");
  }
  Serial.print("| vbat="); Serial.print(read_vbat(), 3);
  Serial.print(" ref=");   Serial.print(s_mains_ref, 3);
  Serial.print(" anchor="); Serial.print(s_anchor_v, 3);
  Serial.print(" -> ");    Serial.println(s_mains ? "MAINS" : "BATTERY");
#endif
}

int power_battery_pct() {
  const float v = read_vbat();
  if (v >= 2.5f) {                     // a real cell is present and measurable
    s_last_bat_pct = vbat_to_pct(v);
    return s_last_bat_pct;
  }
  return -1;                           // genuinely no battery fitted
}

int power_battery_pct_settled() {
  // Just after the charger is pulled the rail takes a beat to settle, so a
  // single read can land below the measurable floor. Retry for ~300 ms.
  for (int i = 0; i < 6; i++) {
    const float v = read_vbat();
    if (v >= 2.5f) {
      s_last_bat_pct = vbat_to_pct(v);
      return s_last_bat_pct;
    }
    delay(50);
  }
  return s_last_bat_pct;
}
