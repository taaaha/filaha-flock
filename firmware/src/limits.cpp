#include <Arduino.h>
#include <Preferences.h>
#include "config.h"
#include "limits.h"

static Limits s_limits;

static Limits defaults() {
  return limits_make(TEMP_LOW_C, TEMP_HIGH_C, HUM_LOW_PCT, HUM_HIGH_PCT,
                     CO2_DANGER_PPM, NH3_DANGER_PPM);
}

const Limits& limits_get() { return s_limits; }

void limits_begin() {
  s_limits = defaults();

  Preferences p;
  if (!p.begin("filaha", false)) {
    Serial.println("[limits] storage unavailable - using the built-in defaults");
    return;
  }
  if (p.isKey("tlo")) {
    Limits L = limits_make(p.getFloat("tlo", 0), p.getFloat("thi", 0),
                           p.getFloat("hlo", 0), p.getFloat("hhi", 0),
                           p.getFloat("co2", 0), p.getFloat("nh3", 0));
    char err[48];
    if (limits_valid(L, err, sizeof err)) {
      s_limits = L;
      Serial.println("[limits] loaded the limits saved by text message");
    } else {
      // A damaged record must never leave the box with nonsense limits.
      Serial.printf("[limits] saved limits rejected (%s) - using the defaults\n", err);
    }
  }
  p.end();
}

bool limits_set(const Limits& L) {
  char err[48];
  if (!limits_valid(L, err, sizeof err)) return false;

  Preferences p;
  if (!p.begin("filaha", false)) return false;
  p.putFloat("tlo", L.temp_lo);
  p.putFloat("thi", L.temp_hi);
  p.putFloat("hlo", L.hum_lo);
  p.putFloat("hhi", L.hum_hi);
  p.putFloat("co2", L.co2_hi);
  p.putFloat("nh3", L.nh3_hi);
  p.end();

  s_limits = L;
  return true;
}

void limits_reset() {
  Preferences p;
  if (p.begin("filaha", false)) {
    p.remove("tlo"); p.remove("thi"); p.remove("hlo");
    p.remove("hhi"); p.remove("co2"); p.remove("nh3");
    p.end();
  }
  s_limits = defaults();
}
