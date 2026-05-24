#include "format.h"

static void append_field(String& s, const char* key, float v, int decimals) {
  s += '|';
  s += key;
  s += ':';
  s += String(v, decimals);
}

String filaha_data_sms(const char* device_id, const SensorReading& r) {
  String s; s.reserve(96);
  s  = "FILAHA|";
  s += device_id;
  if (r.has_co2)   append_field(s, "CO2", r.co2_ppm, 0);
  if (r.has_nh3)   append_field(s, "NH3", r.nh3_ppm, 1);
  if (r.has_temp)  append_field(s, "T",   r.temp_c,  1);
  if (r.has_hum)   append_field(s, "H",   r.hum_pct, 0);
  if (r.has_bat) { s += "|BAT:"; s += r.bat_pct; }
  s += "|OK";                                          // required suffix
  return s;
}

String filaha_alert_sms(const char* device_id, const String& payload) {
  String s; s.reserve(64);
  s  = "FILAHA|";
  s += device_id;
  s += "|ALERT|";
  s += payload;
  return s;
}

String filaha_clear_sms(const char* device_id, const String& payload) {
  String s; s.reserve(64);
  s  = "FILAHA|";
  s += device_id;
  s += "|CLEAR|";
  s += payload;
  return s;
}

String alert_payload_sensor(const char* key, float value, const char* unit) {
  String p; p.reserve(32);
  p  = key;
  p += ':';
  p += String(value, 1);
  p += unit;
  p += " danger";
  return p;
}

String alert_payload_power_cut() {
  // Final assembled SMS becomes:
  //   FILAHA|DEV01|ALERT|POWER_CUT|running on battery
  // which contains both "|ALERT|" and "|POWER_CUT|" tokens — exactly what
  // the native receiver (SmsReceiver.java) and the JS parser look for.
  return String("POWER_CUT|running on battery");
}
