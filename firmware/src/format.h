// ════════════════════════════════════════════════════════════════
//  format.h — FILAHA SMS encoding
//  Produces strings that match the app's parser BYTE-FOR-BYTE.
//  Keep in lockstep with src/utils/smsParser.js on the app side.
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

// "FILAHA|DEV01|CO2:850|NH3:4.2|T:28.4|H:60|BAT:87|OK"
// Fields are omitted when their `has_*` flag is false.
String filaha_data_sms(const char* device_id, const SensorReading& r);

// "FILAHA|DEV01|ALERT|<payload>"
String filaha_alert_sms(const char* device_id, const String& payload);

// "FILAHA|DEV01|CLEAR|<payload>"
String filaha_clear_sms(const char* device_id, const String& payload);

// Common payload builders:
String alert_payload_sensor(const char* key, float value, const char* unit);
String alert_payload_power_cut();          // assembles "POWER_CUT|running on battery"
