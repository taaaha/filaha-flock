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

// Hardware truth (verified on this unit): the battery-sense divider only sees
// the cell while it is DISCHARGING. With USB/charger plugged in, the sense
// node reads ~0 V. So the signal is INVERTED but reliable:
//   vbat ≈ 0 V           → external power is feeding the board (USB in)
//   vbat in 3.0–4.2 V    → running on the battery
static int s_last_bat_pct = -1;   // last % measured while on battery (-1 = never)

bool power_is_on_usb() {
  return read_vbat() < 0.5f;
}

int power_battery_pct() {
  const float v = read_vbat();
  if (v >= 2.5f) {                       // discharging → a real measurement
    s_last_bat_pct = vbat_to_pct(v);
    return s_last_bat_pct;
  }
  return s_last_bat_pct;                 // on USB: sense is dark → last known
}
