// ════════════════════════════════════════════════════════════════
//  Filaha Flock — firmware entry point
//
//  Loop:
//   1. read STCC4 (+ MiCS when flagged) + battery
//   2. compose "FILAHA|DEV01|CO2:..|T:..|H:..|BAT:..|OK"
//   3. send SMS to the farmer's phone running the app
//   4. evaluate local danger thresholds (debounced) → explicit ALERT
//   5. watch USB → battery transitions → POWER_CUT / CLEAR
// ════════════════════════════════════════════════════════════════
#include <Arduino.h>
extern "C" { #include "esp_sleep.h" }
#include "config.h"
#include "format.h"
#include "modem.h"
#include "sensors.h"
#include "feedback.h"

// ── State ────────────────────────────────────────────────────────
static unsigned long s_last_send_ms        = 0;
static unsigned long s_last_power_check_ms = 0;
static unsigned long s_last_alert_ms       = 0;
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
  Serial.printf (  "  Target    :  %s\n", FILAHA_FARMER_NUMBER);
  Serial.printf (  "  Cadence   :  %lu s\n", DATA_INTERVAL_MS / 1000UL);
#if FILAHA_HAS_NH3
  Serial.println(  "  NH₃ sensor:  ENABLED");
#else
  Serial.println(  "  NH₃ sensor:  disabled (flip FILAHA_HAS_NH3 when MiCS arrives)");
#endif
  Serial.println(F("──────────────────────────────────────────────"));
}

void setup() {
  Serial.begin(115200);
  delay(300);
  log_banner();

  // Tell us if we came back from deep sleep (power button woke us up).
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

  delay(SENSOR_WARMUP_MS);                 // let the STCC4 settle
}

// Sustained-danger debouncer. Bumps the relevant streak; fires an ALERT
// once the streak reaches DANGER_CONFIRM_SAMPLES, and not more often than
// ALERT_REFIRE_MS. The app does its own dedup — this layer just stops a
// single noisy spike from costing an SMS.
static void evaluate_local_danger(const SensorReading& r) {
  String payload;
  bool   fire = false;

  if (r.has_co2 && r.co2_ppm >= CO2_DANGER_PPM) {
    if (++s_streak_co2 >= DANGER_CONFIRM_SAMPLES) {
      fire = true; payload = alert_payload_sensor("CO2", r.co2_ppm, "ppm");
    }
  } else { s_streak_co2 = 0; }

  if (r.has_nh3 && r.nh3_ppm >= NH3_DANGER_PPM) {
    if (++s_streak_nh3 >= DANGER_CONFIRM_SAMPLES) {
      fire = true; payload = alert_payload_sensor("NH3", r.nh3_ppm, "ppm");
    }
  } else { s_streak_nh3 = 0; }

  if (r.has_temp && (r.temp_c >= TEMP_HIGH_C || r.temp_c <= TEMP_LOW_C)) {
    if (++s_streak_temp >= DANGER_CONFIRM_SAMPLES) {
      fire = true; payload = alert_payload_sensor("TEMP", r.temp_c, "C");
    }
  } else { s_streak_temp = 0; }

  if (r.has_hum && (r.hum_pct >= HUM_HIGH_PCT || r.hum_pct <= HUM_LOW_PCT)) {
    if (++s_streak_hum >= DANGER_CONFIRM_SAMPLES) {
      fire = true; payload = alert_payload_sensor("HUM", r.hum_pct, "%");
    }
  } else { s_streak_hum = 0; }

  if (!fire) return;

  const unsigned long now = millis();
  if (now - s_last_alert_ms < ALERT_REFIRE_MS) return;
  s_last_alert_ms = now;

  String sms = filaha_alert_sms(FILAHA_DEVICE_ID, payload);
  modem_send_sms(FILAHA_FARMER_NUMBER, sms);
  buzzer_pulse(LOCAL_BUZZER_MS);              // audible local cue, respects mute
}

static void check_power_transition() {
  const unsigned long now = millis();
  if (now - s_last_power_check_ms < 5000UL) return;     // 5 s poll is plenty
  s_last_power_check_ms = now;

  const bool on_usb = power_is_on_usb();
  if (s_was_on_usb && !on_usb) {
    Serial.println("[power] USB LOST — sending POWER_CUT");
    String sms = filaha_alert_sms(FILAHA_DEVICE_ID, alert_payload_power_cut());
    modem_send_sms(FILAHA_FARMER_NUMBER, sms);
  } else if (!s_was_on_usb && on_usb) {
    Serial.println("[power] USB restored — sending CLEAR");
    String sms = filaha_clear_sms(FILAHA_DEVICE_ID,
                                  String("POWER_RESTORED|on AC"));
    modem_send_sms(FILAHA_FARMER_NUMBER, sms);
  }
  s_was_on_usb = on_usb;
}

// ── Button events ────────────────────────────────────────────────
static void handle_button_events() {
  const FilahaButton ev = feedback_consume_event();
  if (ev == BTN_NONE) return;

  switch (ev) {
    case BTN_TEST_ALARM: {
      Serial.println("[btn] TEST ALARM — sending test ALERT");
      buzzer_pulse(400);
      String sms = filaha_alert_sms(FILAHA_DEVICE_ID,
                                    String("TEST|farmer pressed test button"));
      modem_send_sms(FILAHA_FARMER_NUMBER, sms);
      break;
    }
    case BTN_POWER_LONG:
      Serial.println("[btn] POWER long-press — powering down");
      // Politely tell the app we're going dark.
      modem_send_sms(FILAHA_FARMER_NUMBER,
                     filaha_alert_sms(FILAHA_DEVICE_ID,
                                      String("POWER_CUT|manual shutdown")));
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
  feedback_loop();
  handle_button_events();
  modem_loop();
  check_power_transition();

  const unsigned long now = millis();
  if (now - s_last_send_ms >= DATA_INTERVAL_MS) {
    s_last_send_ms = now;

    SensorReading r;
    if (sensors_read(r)) {
      const String sms = filaha_data_sms(FILAHA_DEVICE_ID, r);
      modem_send_sms(FILAHA_FARMER_NUMBER, sms);
      evaluate_local_danger(r);
    } else {
      Serial.println("[loop] no usable sensor reading this cycle");
    }
  }

  delay(50);   // minimal idle yield; real power-saving sleep is a v0.2 item
}
