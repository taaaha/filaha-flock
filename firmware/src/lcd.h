// ════════════════════════════════════════════════════════════════
//  lcd.h — local 20×4 readout (HD44780 + PCF8574 I²C backpack)
//
//  The display is an AID, never a dependency. It sits on the same I²C bus as
//  the sensors, so every rule here exists to keep it from hurting them:
//    - optional: if nothing ACKs, one log line and the firmware carries on;
//    - never blocks: the first NACK aborts the refresh, there are no retries
//      inside a draw;
//    - self-healing: while absent it is re-probed every 30 s, so a loose wire
//      or a hot-plugged screen recovers without a reboot.
//
//  The HD44780 character ROM has no Arabic, so the screen carries numbers and
//  short Latin codes. The farmer's language lives in the app and the SMS.
// ════════════════════════════════════════════════════════════════
#pragma once
#include "config.h"
#include "format.h"

// What the loop already knows. Passed in rather than re-measured: the mains
// detector is stateful (power_logic.h) and must only ever be sampled by its
// owner, so the display takes the committed verdict instead of asking again.
struct LcdStatus {
  bool on_mains;    // committed mains/battery state
  int  bat_pct;     // 0..100, or <0 when unknown
  bool cloud_ok;    // MQTT link up
  int  rssi_dbm;    // signal strength in dBm, 0 when unknown
};

#if FILAHA_HAS_LCD
bool lcd_begin();                                   // false = no display found (not an error)
void lcd_show(const SensorReading& r, const LcdStatus& s);
void lcd_message(const char* l0, const char* l1 = "", const char* l2 = "", const char* l3 = "");
void lcd_off();                                     // backlight + display off (before deep sleep)
#else
inline bool lcd_begin() { return false; }
inline void lcd_show(const SensorReading&, const LcdStatus&) {}
inline void lcd_message(const char*, const char* = "", const char* = "", const char* = "") {}
inline void lcd_off() {}
#endif
