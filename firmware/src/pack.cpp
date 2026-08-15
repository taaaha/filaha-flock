#include "pack.h"
#include <math.h>

static int16_t  clamp_i16(long v) { return v >  32767 ?  32767 : (v < -32768 ? -32768 : (int16_t)v); }
static uint16_t clamp_u16(long v) { return v >  65535 ?  65535 : (v <      0 ?      0 : (uint16_t)v); }
static uint8_t  clamp_pct(float v){ return v > 100.0f ?  100   : (v <   0.0f ?      0 : (uint8_t)lroundf(v)); }

size_t pack_telemetry(const SensorReading& r, uint8_t out[8]) {
  const int16_t  temp = clamp_i16(lroundf((r.has_temp ? r.temp_c  : 0.0f) * 10.0f));
  const uint8_t  hum  = r.has_hum ? clamp_pct(r.hum_pct) : 0;
  const uint16_t co2  = clamp_u16(lroundf(r.has_co2 ? r.co2_ppm : 0.0f));
  const uint16_t nh3  = clamp_u16(lroundf((r.has_nh3 ? r.nh3_ppm : 0.0f) * 100.0f));
  // 255 is the "unknown" sentinel (on USB the sense circuit is dark and no
  // battery reading exists yet) — pass it through; clamp real values to 0-100.
  const uint8_t  bat  = !r.has_bat ? 0
                        : (r.bat_pct == 255 ? 255
                        : (r.bat_pct < 0 ? 0 : (r.bat_pct > 100 ? 100 : (uint8_t)r.bat_pct)));

  out[0] = (uint8_t)(temp >> 8); out[1] = (uint8_t)(temp & 0xFF);   // temp int16 BE
  out[2] = hum;                                                      // hum  uint8
  out[3] = (uint8_t)(co2 >> 8);  out[4] = (uint8_t)(co2 & 0xFF);    // co2  uint16 BE
  out[5] = (uint8_t)(nh3 >> 8);  out[6] = (uint8_t)(nh3 & 0xFF);    // nh3  uint16 BE
  out[7] = bat;                                                      // bat  uint8
  return 8;
}
