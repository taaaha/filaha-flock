// ════════════════════════════════════════════════════════════════
//  Filaha Flock — firmware entry point  (data + hybrid-SMS architecture)
//
//  Loop:
//   1. read STCC4 (+ MiCS when flagged) + battery
//   2. pack 5 metrics into 8 bytes, PUBLISH over MQTT (2G data) every 60 s
//   3. on confirmed danger → human-readable emergency SMS + ring the farmer
//   4. once a day (HEARTBEAT_HOUR) → one plain-text report SMS
//   5. watch USB → battery transitions → POWER_CUT SMS
//
//  SMS/calls originate from the DEVICE and are read by the farmer directly.
//  The app no longer reads SMS (Google Play forbids it) — it pulls data from
//  the cloud REST API instead.
// ════════════════════════════════════════════════════════════════
#include <Arduino.h>
extern "C" { #include "esp_sleep.h" }
#include "esp_task_wdt.h"
#include "config.h"
#include "format.h"
#include "modem.h"
#include "net.h"
#include "pack.h"
#include "sensors.h"
#include "feedback.h"

// ── State ────────────────────────────────────────────────────────
static unsigned long s_last_send_ms        = 0;
static unsigned long s_last_power_check_ms = 0;
static unsigned long s_last_alert_ms       = 0;
static unsigned long s_last_clock_ms       = 0;
static long          s_last_heartbeat_day  = -1;
static bool          s_was_on_usb          = true;
static int           s_streak_co2          = 0;
static int           s_streak_nh3          = 0;
static int           s_streak_temp         = 0;
static int           s_streak_hum          = 0;

// ── Boot banner ──────────────────────────────────────────────────
static void log_banner() {
  Serial.println();
  Serial.println(F("──────────────────────────────────────────────"));
  Serial.printf (  "  Filaha Flock firmware v%s\n", FILAHA_FIRMWARE_VERSION);
  Serial.printf (  "  Device ID :  %s\n", FILAHA_DEVICE_ID);
  Serial.printf (  "  MQTT      :  %s:%d  topic filaha/%s/telemetry\n",
                   FILAHA_MQTT_HOST, FILAHA_MQTT_PORT, FILAHA_DEVICE_ID);
  Serial.printf (  "  Farmer SMS:  %s\n", FILAHA_FARMER_NUMBER);
  Serial.printf (  "  Cadence   :  %lu s\n", TELEMETRY_INTERVAL_MS / 1000UL);
#if FILAHA_HAS_NH3
  Serial.println(  "  NH3 sensor:  ENABLED");
#else
  Serial.println(  "  NH3 sensor:  disabled (flip FILAHA_HAS_NH3 when MiCS arrives)");
#endif
  Serial.println(F("──────────────────────────────────────────────"));
}

void setup() {
  Serial.begin(115200);
  delay(300);
  log_banner();

  // Hardware watchdog: if the loop ever stalls (a blocking AT command hanging
  // on a dying tower), the chip reboots itself and comes back alone.
  esp_task_wdt_init(WATCHDOG_TIMEOUT_S, true);   // (timeout seconds, panic→reboot)
  esp_task_wdt_add(NULL);                        // watch this (loop) task

  const esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();
  if (cause == ESP_SLEEP_WAKEUP_EXT0) {
    Serial.println("[boot] woke from deep sleep via POWER button");
  }

  feedback_begin();                        // buttons + buzzer

  if (!sensors_begin()) {
    Serial.println("[boot] sensors_begin reported failure — will keep trying in loop()");
  }
  if (!modem_begin()) {
    Serial.println("[boot] modem_begin failed — will retry network attach inside modem_loop()");
  }
  if (!net_begin()) {
    Serial.println("[boot] net_begin (GPRS+MQTT) not up yet — net_loop() will retry");
  }

  delay(SENSOR_WARMUP_MS);                  // let the STCC4 settle
}

// Sustained-danger debouncer. Bumps the relevant streak; once a streak reaches
// DANGER_CONFIRM_SAMPLES (and not more often than ALERT_REFIRE_MS) it fires the
// emergency: a human-readable SMS to the farmer AND a voice call (the lifeline,
// works with no internet/server). A single noisy spike never triggers it.
static void evaluate_critical(const SensorReading& r) {
  const char* what = nullptr;
  float       value = 0;
  const char* unit  = "";

  if (r.has_co2 && r.co2_ppm >= CO2_DANGER_PPM) {
    if (++s_streak_co2 >= DANGER_CONFIRM_SAMPLES) { what = "CO2 eleve";      value = r.co2_ppm; unit = " ppm"; }
  } else { s_streak_co2 = 0; }

  if (r.has_nh3 && r.nh3_ppm >= NH3_DANGER_PPM) {
    if (++s_streak_nh3 >= DANGER_CONFIRM_SAMPLES) { what = "Ammoniac eleve"; value = r.nh3_ppm; unit = " ppm"; }
  } else { s_streak_nh3 = 0; }

  if (r.has_temp && (r.temp_c >= TEMP_HIGH_C || r.temp_c <= TEMP_LOW_C)) {
    if (++s_streak_temp >= DANGER_CONFIRM_SAMPLES) {
      what  = (r.temp_c >= TEMP_HIGH_C) ? "Temperature haute" : "Temperature basse";
      value = r.temp_c; unit = " C";
    }
  } else { s_streak_temp = 0; }

  if (r.has_hum && (r.hum_pct >= HUM_HIGH_PCT || r.hum_pct <= HUM_LOW_PCT)) {
    if (++s_streak_hum >= DANGER_CONFIRM_SAMPLES) {
      what  = (r.hum_pct >= HUM_HIGH_PCT) ? "Humidite haute" : "Humidite basse";
      value = r.hum_pct; unit = " %";
    }
  } else { s_streak_hum = 0; }

  if (!what) return;

  const unsigned long now = millis();
  if (now - s_last_alert_ms < ALERT_REFIRE_MS) return;
  s_last_alert_ms = now;

  buzzer_pulse(LOCAL_BUZZER_MS);                       // local audible cue, respects mute
#if CRITICAL_SMS_ENABLED
  modem_send_sms(FILAHA_FARMER_NUMBER, filaha_critical_sms(FILAHA_DEVICE_ID, what, value, unit));
#endif
#if CRITICAL_CALL_ENABLED
  modem_place_call(FILAHA_FARMER_NUMBER, CRITICAL_RING_MS);
#endif
}

// One plain-text report a day, at HEARTBEAT_HOUR local time. Uses the network
// clock; if the modem hasn't synced time yet we simply skip until it has.
static void maybe_send_heartbeat(const SensorReading& r) {
#if HEARTBEAT_ENABLED
  const unsigned long now = millis();
  if (now - s_last_clock_ms < 60000UL) return;        // poll the clock at most once a minute
  s_last_clock_ms = now;

  int hour; long day;
  if (!net_get_clock(hour, day)) return;
  if (hour == HEARTBEAT_HOUR && day != s_last_heartbeat_day) {
    s_last_heartbeat_day = day;
    Serial.println("[hb] sending daily report SMS");
    modem_send_sms(FILAHA_FARMER_NUMBER, filaha_heartbeat_sms(FILAHA_DEVICE_ID, r));
  }
#endif
}

static void check_power_transition() {
  const unsigned long now = millis();
  if (now - s_last_power_check_ms < 5000UL) return;
  s_last_power_check_ms = now;

  const bool on_usb = power_is_on_usb();
  if (s_was_on_usb && !on_usb) {
    Serial.println("[power] USB LOST — sending POWER_CUT SMS");
    modem_send_sms(FILAHA_FARMER_NUMBER,
                   filaha_critical_sms(FILAHA_DEVICE_ID, "Coupure de courant", power_battery_pct(), " % batt"));
  } else if (!s_was_on_usb && on_usb) {
    Serial.println("[power] USB restored");
  }
  s_was_on_usb = on_usb;
}

// ── Button events ────────────────────────────────────────────────
static void handle_button_events() {
  const FilahaButton ev = feedback_consume_event();
  if (ev == BTN_NONE) return;

  switch (ev) {
    case BTN_TEST_ALARM: {
      Serial.println("[btn] TEST ALARM — sending test SMS");
      buzzer_pulse(400);
      modem_send_sms(FILAHA_FARMER_NUMBER,
                     filaha_critical_sms(FILAHA_DEVICE_ID, "Test du dispositif", 0, ""));
      break;
    }
    case BTN_POWER_LONG:
      Serial.println("[btn] POWER long-press — powering down");
      modem_send_sms(FILAHA_FARMER_NUMBER,
                     filaha_critical_sms(FILAHA_DEVICE_ID, "Arret manuel du dispositif", 0, ""));
      delay(200);
      enter_deep_sleep();                       // never returns
      break;
    case BTN_RESET:
      Serial.println("[btn] RESET — restarting");
      delay(150);
      ESP.restart();
      break;
    case BTN_MUTE:
    case BTN_NONE:
    default:
      break;                                   // Mute is handled inside feedback_loop
  }
}

void loop() {
  esp_task_wdt_reset();                          // feed the watchdog each pass
  feedback_loop();
  handle_button_events();
  modem_loop();
  net_loop();                                   // keep MQTT alive / reconnect
  check_power_transition();

  const unsigned long now = millis();
  if (now - s_last_send_ms >= TELEMETRY_INTERVAL_MS) {
    s_last_send_ms = now;

    SensorReading r;
    if (sensors_read(r)) {
      uint8_t pkt[8];
      const size_t n = pack_telemetry(r, pkt);
      net_publish(pkt, n);                      // routine data over 2G — no SMS
      evaluate_critical(r);                     // emergency lifeline (SMS + call)
      maybe_send_heartbeat(r);                  // once-a-day report
    } else {
      Serial.println("[loop] no usable sensor reading this cycle");
    }
  }

  delay(50);
}
