#include <Wire.h>
#include <math.h>
#include "config.h"
#include "sensors.h"
#include "power_logic.h"

// Defined with the power section further down; declared here so sensors_begin()
// can initialise the detector and run its self-test at boot.
static void power_begin();

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
  power_begin();

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

#if FILAHA_VBUS_ADC_PIN >= 0
static float read_pin_v(int pin, float divider) {
  int raw = 0;
  for (int i = 0; i < 3; i++) { raw += analogRead(pin); delay(2); }
  return (raw / 3.0f / 4095.0f) * 3.3f * divider;
}
#endif

static PowerState        s_pwr;
static const PowerTuning s_pwr_tuning = {
  POWER_DROP_V, POWER_BOOT_GRACE_MS, POWER_RESTORE_LOCKOUT_MS,
  POWER_RIPPLE_WINDOW_MS, POWER_RIPPLE_MAINS_MAX, POWER_RESTORE_WINDOWS
};

bool power_is_on_usb() {
#if FILAHA_VBUS_ADC_PIN >= 0
  // Dedicated charger-presence sense — unambiguous and instant.
  s_pwr.mains = read_pin_v(FILAHA_VBUS_ADC_PIN, 2.0f) > FILAHA_VBUS_MIN_V;
  return s_pwr.mains;
#else
  return power_decide(s_pwr, s_pwr_tuning, read_vbat(), millis());
#endif
}

float power_vbat_volts() { return read_vbat(); }

// ── Boot self-test ────────────────────────────────────────────────
// Drives the REAL decision function (power_logic.h) through scripted sequences,
// including ones that cannot practically be reproduced on a bench: a cut whose
// rail rebounds the instant the transmit burst ends, and a full cell where the
// charger has terminated so plugged and unplugged read the same voltage. Runs
// on its own PowerState with a compressed timebase, so it cannot disturb the
// live detector. A FAIL means do not ship the unit.
#if FILAHA_POWER_SELFTEST

// Compressed timing so a case that models minutes stays a handful of samples.
#define PT_STEP_MS   2000UL
#define PT_WINDOW_MS 6000UL     // 3 samples per ripple window
#define PT_LOCKOUT   6000UL

static bool pwr_case(const char* name, const float* volts, const int* expect, int n) {
  PowerState st;
  power_state_init(st);
  const PowerTuning k = {
    POWER_DROP_V, 0 /* no boot grace */, PT_LOCKOUT,
    PT_WINDOW_MS, POWER_RIPPLE_MAINS_MAX, POWER_RESTORE_WINDOWS
  };
  unsigned long t = 1;                      // past the (zeroed) boot grace
  st.mains_ref = volts[0];                  // seed as the boot window would
  st.win_min = st.win_max = volts[0];
  st.win_ms  = t;

  bool pass = true;
  int  failed_at = -1;
  for (int i = 0; i < n; i++) {
    const bool got = power_decide(st, k, volts[i], t);
    if (expect[i] >= 0 && got != (expect[i] != 0)) {
      if (pass) failed_at = i;
      pass = false;
    }
    t += PT_STEP_MS;
  }
  Serial.print("[pwr-test] ");
  Serial.print(pass ? "PASS  " : "FAIL  ");
  Serial.print(name);
  if (!pass) {
    Serial.print("   (first wrong verdict at sample ");
    Serial.print(failed_at);
    Serial.print(")");
  }
  Serial.println();
  return pass;
}

static void power_selftest() {
  const int M = 1, B = 0;                   // expect mains / battery

  // Steady on the charger, including the worst noise excursion seen on a real
  // unit (4.110 against a 4.121 reference = 11 mV). Must never cry wolf.
  static const float v1[] = { 4.121f, 4.119f, 4.121f, 4.110f, 4.120f, 4.118f, 4.121f };
  static const int   e1[] = { M, M, M, M, M, M, M };

  // The charger pulled: the rail steps off the plateau onto the loaded cell.
  static const float v2[] = { 4.121f, 4.120f, 4.090f, 4.085f, 4.080f };
  static const int   e2[] = { M, M, B, B, B };

  // THE REGRESSION. A real cut, then the transmit burst ends and the cell
  // springs back above the cut threshold. The old symmetric restore fired here
  // and sent "power is back" seconds after every genuine cut. The rail is still
  // noisy — bursts keep sagging it — so it must stay on battery throughout.
  static const float v3[] = {
    4.121f, 4.121f,                          // on the charger
    4.088f,                                  // burst sag trips the cut
    4.115f, 4.112f, 4.060f,                  // rebound, then the next burst
    4.114f, 4.110f, 4.055f,                  // and again
    4.112f, 4.108f, 4.050f
  };
  static const int   e3[] = { M, M, B, B, B, B, B, B, B, B, B, B };

  // A genuine restore: the charger is back, so the bursts stop moving the rail
  // and it goes quiet at the plateau. Allowed to lag — the lockout plus two
  // quiet windows is the price of never crying wolf on the way back.
  static const float v4[] = {
    4.121f, 4.088f,                          // cut
    4.115f, 4.060f, 4.112f,                  // on battery: noisy
    4.120f, 4.121f, 4.120f,                  // charger back: quiet window 1
    4.121f, 4.120f, 4.121f,                  // quiet window 2
    4.121f, 4.120f, 4.121f
  };
  static const int   e4[] = { M, B, B, B, B, B, B, B, B, B, B, B, M, M };

  // A long cut: the cell drains far below the old plateau and must stay on
  // battery the whole way down, never mistaking a slow decline for a charger.
  static const float v5[] = { 4.121f, 4.080f, 4.000f, 3.900f, 3.820f, 3.760f, 3.700f };
  static const int   e5[] = { M, B, B, B, B, B, B };

  Serial.println("[pwr-test] verifying the live decision logic…");
  int ok = 0;
  ok += pwr_case("steady on charger, worst observed noise", v1, e1, 7);
  ok += pwr_case("charger pulled -> battery", v2, e2, 5);
  ok += pwr_case("cut, then burst rebound (no false 'power back')", v3, e3, 12);
  ok += pwr_case("charger genuinely restored -> rail goes quiet", v4, e4, 14);
  ok += pwr_case("long cut, cell draining", v5, e5, 7);
  Serial.print("[pwr-test] ");
  Serial.print(ok);
  Serial.println("/5 passed");
}
#endif  // FILAHA_POWER_SELFTEST

static void power_begin() {
  power_state_init(s_pwr);
#if FILAHA_POWER_SELFTEST
  power_selftest();
#endif
}

// Bench aid: the detector's own reasoning, one line. The ripple figure is the
// one number still worth watching on real hardware — it is what the restore
// decision rests on, and the threshold should be checked against what a genuine
// battery period actually produces on this unit.
void power_diag_print() {
#if FILAHA_POWER_DIAG
  static unsigned long s_last = 0;
  const unsigned long now = millis();
  if (s_last && now - s_last < 4000UL) return;
  s_last = now;

  Serial.print("[pwr] vbat=");   Serial.print(read_vbat(), 3);
  Serial.print(" ref=");         Serial.print(s_pwr.mains_ref, 3);
  Serial.print(" trip<");        Serial.print(s_pwr.mains_ref - POWER_DROP_V, 3);
  Serial.print(" ripple=");      Serial.print(s_pwr.ripple, 3);
  Serial.print(" quiet=");       Serial.print(s_pwr.quiet_runs);
  Serial.print(" -> ");          Serial.println(s_pwr.mains ? "MAINS" : "BATTERY");
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
