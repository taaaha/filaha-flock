// ════════════════════════════════════════════════════════════════
//  format.h — the messages the farmer actually reads
//
//  Every SMS this device sends is written for a farmer, not an
//  engineer: short, plain words, no jargon, no codes to decode.
//
//  Messages are built as UTF-16 so they can be sent as Unicode (UCS2)
//  SMS, which is the only way Arabic survives the trip. A Unicode SMS
//  carries 70 CHARACTERS, not 160 - so every template below is written
//  to fit well inside that. Keep new messages short for the same reason.
// ════════════════════════════════════════════════════════════════
#pragma once
#include <Arduino.h>

struct SensorReading {
  bool   has_co2;   float co2_ppm;
  bool   has_nh3;   float nh3_ppm;
  bool   has_temp;  float temp_c;
  bool   has_hum;   float hum_pct;
  bool   has_bat;   int   bat_pct;
};

// Farmer-facing SMS language (set FILAHA_SMS_LANG in config.h).
#define FILAHA_LANG_AR 0
#define FILAHA_LANG_FR 1

// A Unicode SMS holds 70 characters. Buffers are sized with a little slack.
#define FILAHA_SMS_MAX_U16 80

// What went wrong, kept language-neutral so the wording is chosen at send
// time rather than baked in when the danger is detected.
enum FilahaDanger {
  FD_CO2_HIGH = 0,
  FD_NH3_HIGH,
  FD_TEMP_HIGH,
  FD_TEMP_LOW,
  FD_HUM_HIGH,
  FD_HUM_LOW,
};

// Each builder writes UTF-16 code units into `out` and returns how many it
// wrote. None of them ever overflow `cap`.
size_t filaha_sms_danger(char16_t* out, size_t cap, const char* device_id,
                         FilahaDanger kind, float value, int lang);
size_t filaha_sms_power_cut(char16_t* out, size_t cap, const char* device_id,
                            int bat_pct, int lang);
size_t filaha_sms_power_back(char16_t* out, size_t cap, const char* device_id,
                             int bat_pct, int lang);
size_t filaha_sms_daily(char16_t* out, size_t cap, const char* device_id,
                        const SensorReading& r, int lang);
size_t filaha_sms_test(char16_t* out, size_t cap, const char* device_id, int lang);
size_t filaha_sms_shutdown(char16_t* out, size_t cap, const char* device_id, int lang);

// Flatten a UTF-16 message into plain ASCII for the GSM 7-bit fallback path.
// Anything outside ASCII becomes '?' — which is why the fallback is always
// built from the FRENCH text, deliberately written without accents so it
// survives this trip unchanged. Returns the number of chars written.
size_t filaha_u16_to_ascii(const char16_t* in, size_t len, char* out, size_t cap);
