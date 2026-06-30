#include <Wire.h>
#include <math.h>
#include "config.h"
#include "sensors.h"

// ── CO₂ + temp + humidity via Sensirion STCC4 (DFRobot Gravity SEN0678) ─
//    Default I²C address per Sensirion: 0x64. Skipped entirely in TEST_MODE.
#if !FILAHA_TEST_MODE
  #include "DFRobot_STCC4.h"
  static DFRobot_STCC4 stcc4(&Wire);
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
// Returns volts.
static float read_vbat() {
  const int raw = analogRead(BATTERY_ADC_PIN);
  // ADC: 0..4095 → 0..3.3 V, divider ×2 → battery V.
  return (raw / 4095.0f) * 3.3f * 2.0f;
}

static int vbat_to_pct(float v) {
  // Simple linear LiPo curve: 3.30 V (empty) … 4.20 V (full).
  // Good enough for a status indicator — replace with a lookup table later.
  float pct = (v - 3.30f) / (4.20f - 3.30f) * 100.0f;
  if (pct < 0)   pct = 0;
  if (pct > 100) pct = 100;
  return (int)pct;
}

bool sensors_begin() {
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(I2C_FREQ_HZ);
  analogReadResolution(12);

#if FILAHA_TEST_MODE
  Serial.println("[sensors] TEST MODE — synthetic CO₂/T/H, real battery only");
#else
  Serial.println("[sensors] STCC4 begin…");
  if (stcc4.begin() != 0) {
    Serial.println("[sensors] STCC4 NOT found — heartbeat mode (BAT only)");
    stcc4_ready = false;
  } else {
    stcc4_ready = true;
    // STCC4 produces a sample every ~5 s in periodic mode — fits our 30 s cadence.
    stcc4.startPeriodicMeasurement();
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
  if (stcc4_ready) {
    float co2 = NAN, t = NAN, h = NAN;
    if (stcc4.readMeasurement(&co2, &t, &h) == 0) {
      if (!isnan(co2)) { out.has_co2  = true; out.co2_ppm  = co2; }
      if (!isnan(t))   { out.has_temp = true; out.temp_c   = t;   }
      if (!isnan(h))   { out.has_hum  = true; out.hum_pct  = h;   }
    } else {
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

  const float vbat = read_vbat();
  out.has_bat = true;
  out.bat_pct = vbat_to_pct(vbat);

  // Always succeed — the battery field alone is enough to prove the device
  // is alive. SMS goes out every cycle no matter the sensor state.
  return true;
}

bool power_is_on_usb() {
  // On the LilyGO T-A7670G the USB/charger raises the VBAT-sense above the
  // open-circuit LiPo max (~4.20 V). If we read above ~4.22 V, USB is in.
  // Crude but reliable; a proper PMIC query is a follow-up.
  return read_vbat() > 4.22f;
}

int power_battery_pct() {
  return vbat_to_pct(read_vbat());
}
