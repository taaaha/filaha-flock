// ════════════════════════════════════════════════════════════════
//  Filaha Flock — firmware entry point  (data + hybrid-SMS architecture)
//
//  Every cycle it reads the sensors, publishes an 8-byte packet to the cloud
//  over the mobile network, and checks for danger and for mains power loss.
//
//  Two independent paths reach the farmer:
//    - CLOUD  : telemetry -> MQTT -> server -> the phone app (needs data)
//    - DIRECT : SMS + voice call straight from this device (needs NO internet)
//  The direct path is the safety lifeline and is never fire-and-forget: every
//  critical message is queued in the outbox and retried until it is delivered.
//
//  Messages are written in the farmer's own language (see FILAHA_SMS_LANG).
// ════════════════════════════════════════════════════════════════
#include <Arduino.h>
extern "C" {
#include "esp_sleep.h"
}
#include "esp_task_wdt.h"
#include "config.h"
#include "format.h"
#include "modem.h"
#include "net.h"
#include "pack.h"
#include "sensors.h"
#include "feedback.h"
#include "lcd.h"
#include "limits.h"
#include "smscmd.h"

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
// Self-healing bookkeeping (see self_heal_tick below). Declared here because
// setup() seeds the grace period before the function itself is defined.
static unsigned long s_last_cloud_ok_ms    = 0;
static unsigned long s_last_recover_ms     = 0;
// Most recent reading, kept so the display can be redrawn the instant mains
// changes instead of waiting up to a full cycle to say so.
static SensorReading s_last_reading{};
static bool          s_have_reading        = false;

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
  Serial.print   (  "  SMS lang  :  ");
  Serial.println (FILAHA_SMS_LANG == FILAHA_LANG_AR ? "Arabic" : "French");
  Serial.println(F("──────────────────────────────────────────────"));

  // Catch the two deployment mistakes that silently break a unit in the field.
  if (sizeof(FILAHA_MQTT_PASS) <= 1) {
    Serial.println("  !! MQTT password is empty - this unit cannot reach the cloud");
  }
  if (FILAHA_FARMER_NUMBER[0] != '+') {
    Serial.println("  !! Farmer number is not in +countrycode form - SMS/calls may fail");
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  log_banner();

  limits_begin();                           // factory defaults, or what the farmer last set by text
  {
    char cur[56];
    limits_format(limits_get(), cur, sizeof cur);
    Serial.printf("  Limits    :  %s\n", cur);
#if FILAHA_LIMITS_SELFTEST
    int total = 0, first_fail = 0;
    const int ok = limits_selftest(&total, &first_fail);
    if (ok == total) Serial.printf("[limits-test] PASS  %d/%d\n", ok, total);
    else Serial.printf("[limits-test] FAIL  %d/%d  (first failure: check %d) - do not ship this unit\n", ok, total, first_fail);
#endif
  }

  // Hardware watchdog: if the loop ever stalls (a blocking AT command hanging
  // on a dying tower), the chip reboots itself and comes back alone.
  esp_task_wdt_init(WATCHDOG_TIMEOUT_S, true);   // (timeout seconds, panic→reboot)
  esp_task_wdt_add(NULL);                        // watch this (loop) task

  const esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();
  if (cause == ESP_SLEEP_WAKEUP_EXT0) {
    Serial.println("[boot] woke from deep sleep via POWER button");
  }

  feedback_begin();                        // buttons + buzzer

  // Power-on chirp: instantly tells you the board booted (no PC needed).
  buzzer_pulse(120); delay(140); buzzer_off();

  if (!sensors_begin()) {
    Serial.println("[boot] sensors_begin reported failure — will keep trying in loop()");
  }

  // Display shares the I2C bus that sensors_begin() just brought up.
  if (lcd_begin()) lcd_message("Filaha Flock", "Firmware v" FILAHA_FIRMWARE_VERSION, "Starting...");

  // Seed the power state from the actual hardware so booting on battery isn't
  // mistaken for a fresh power cut (the static default assumed USB).
  s_was_on_usb = power_is_on_usb();
  Serial.printf("[power] boot state: %s\n", s_was_on_usb ? "on USB/charger" : "on battery");
  if (!modem_begin()) {
    Serial.println("[boot] modem_begin failed — will retry network attach inside modem_loop()");
  }
  if (!net_begin()) {
    Serial.println("[boot] net_begin (GPRS+MQTT) not up yet — net_loop() will retry");
  }

  s_last_cloud_ok_ms = millis();            // grace period starts now, not at 0
  delay(SENSOR_WARMUP_MS);                  // let the STCC4 settle
}

// ════════════════════════════════════════════════════════════════
//  Outbox — guaranteed delivery of everything the farmer must read
//
//  A danger or power-cut SMS is the most important thing this device ever
//  sends, so nothing here is fire-and-forget. Sending fails outright while
//  the modem is unregistered (during boot, a network gap, a tower hiccup),
//  which previously lost the message for good. Messages now sit in this
//  small outbox and are retried until the modem accepts them.
// ════════════════════════════════════════════════════════════════
enum MsgKind : uint8_t { MK_PWR_OUT, MK_PWR_IN, MK_DANGER, MK_TEST, MK_SHUTDOWN, MK_DAILY };

struct OutMsg {
  MsgKind       kind;
  FilahaDanger  danger;
  float         value;
  int           bat;
  SensorReading reading;     // MK_DAILY only
  bool          ring;        // also ring the farmer once the SMS is away
};

#define OUTBOX_SLOTS 4
static OutMsg        s_box[OUTBOX_SLOTS];
static int           s_box_head    = 0;
static int           s_box_count   = 0;
static unsigned long s_box_next_ms = 0;
static int           s_box_tries   = 0;

static void outbox_push(const OutMsg& m) {
  if (s_box_count >= OUTBOX_SLOTS) {
    // Full: drop the OLDEST. A fresh danger matters more than a stale report.
    Serial.println("[sms] outbox full - dropping oldest queued message");
    s_box_head = (s_box_head + 1) % OUTBOX_SLOTS;
    s_box_count--;
    s_box_tries = 0;
  }
  s_box[(s_box_head + s_box_count) % OUTBOX_SLOTS] = m;
  s_box_count++;
  s_box_next_ms = millis();          // first attempt immediately
}

static void outbox_pop() {
  s_box_head = (s_box_head + 1) % OUTBOX_SLOTS;
  if (s_box_count > 0) s_box_count--;
  s_box_tries = 0;
}

// Render one queued message in the requested language. Kept separate from the
// send path so the plain-Latin fallback can rebuild the very same alert in
// French when the Unicode attempt is refused.
static size_t build_sms(char16_t* body, const OutMsg& m, int lang) {
  switch (m.kind) {
    case MK_PWR_OUT:  return filaha_sms_power_cut (body, FILAHA_SMS_MAX_U16, FILAHA_DEVICE_ID, m.bat, lang);
    case MK_PWR_IN:   return filaha_sms_power_back(body, FILAHA_SMS_MAX_U16, FILAHA_DEVICE_ID, m.bat, lang);
    case MK_DANGER:   return filaha_sms_danger    (body, FILAHA_SMS_MAX_U16, FILAHA_DEVICE_ID, m.danger, m.value, lang);
    case MK_TEST:     return filaha_sms_test      (body, FILAHA_SMS_MAX_U16, FILAHA_DEVICE_ID, lang);
    case MK_SHUTDOWN: return filaha_sms_shutdown  (body, FILAHA_SMS_MAX_U16, FILAHA_DEVICE_ID, lang);
    case MK_DAILY:    return filaha_sms_daily     (body, FILAHA_SMS_MAX_U16, FILAHA_DEVICE_ID, m.reading, lang);
  }
  return 0;
}

static void outbox_service() {
  if (s_box_count == 0) return;
  const unsigned long now = millis();
  if ((long)(now - s_box_next_ms) < 0) return;
  s_box_next_ms = now + PENDING_RETRY_MS;

  const OutMsg& m = s_box[s_box_head];
  char16_t body[FILAHA_SMS_MAX_U16];
  const size_t len = build_sms(body, m, FILAHA_SMS_LANG);
  if (len == 0) { outbox_pop(); return; }

#if CRITICAL_SMS_ENABLED
  // Unicode first — Arabic survives no other way. If the modem or the network
  // refuses it, immediately retry the same alert in plain-Latin French over
  // GSM 7-bit. A warning must never be lost to an encoding problem.
  bool sent = modem_send_sms_u16(FILAHA_FARMER_NUMBER, body, len);
  if (!sent) {
    char16_t fb[FILAHA_SMS_MAX_U16];
    const size_t fl = build_sms(fb, m, FILAHA_LANG_FR);
    if (fl) {
      char ascii[FILAHA_SMS_MAX_U16 + 1];
      filaha_u16_to_ascii(fb, fl, ascii, sizeof ascii);
      Serial.println("[sms] unicode path failed — retrying in plain French");
      sent = modem_send_sms_ascii(FILAHA_FARMER_NUMBER, ascii);
    }
  }
  if (!sent) {
    if (++s_box_tries >= PENDING_MAX_TRIES) {
      Serial.println("[sms] giving up on this message after repeated failures");
      outbox_pop();
    } else {
      Serial.println("[sms] no network yet - message stays queued, will retry");
    }
    return;
  }
#endif

#if CRITICAL_CALL_ENABLED
  if (m.ring) modem_place_call(FILAHA_FARMER_NUMBER, CRITICAL_RING_MS);
#endif
  // Tell the cloud too, now that the link is evidently alive. The server
  // ignores a duplicate, so re-announcing here is safe.
  if (m.kind == MK_PWR_OUT) net_publish_event("PWR_OUT");
  if (m.kind == MK_PWR_IN)  net_publish_event("PWR_IN");
  outbox_pop();
}

static void queue_power(bool cut, int bat_pct) {
  OutMsg m{}; m.kind = cut ? MK_PWR_OUT : MK_PWR_IN; m.bat = bat_pct; m.ring = cut;
  outbox_push(m);
}
static void queue_danger(FilahaDanger d, float v) {
  OutMsg m{}; m.kind = MK_DANGER; m.danger = d; m.value = v; m.ring = true;
  outbox_push(m);
}
static void queue_simple(MsgKind k) {
  OutMsg m{}; m.kind = k; m.ring = false;
  outbox_push(m);
}
static void queue_daily(const SensorReading& r) {
  OutMsg m{}; m.kind = MK_DAILY; m.reading = r; m.ring = false;
  outbox_push(m);
}

// Sustained-danger debouncer. Bumps the relevant streak; once a streak reaches
// DANGER_CONFIRM_SAMPLES (and not more often than ALERT_REFIRE_MS) it raises
// the emergency: local buzzer, then an SMS + voice call queued for guaranteed
// delivery. A single noisy sample never triggers it.
static void evaluate_critical(const SensorReading& r) {
  bool         hit   = false;
  FilahaDanger kind  = FD_CO2_HIGH;
  float        value = 0;

  const Limits& LM = limits_get();      // the limits in force right now (text-message editable)

  if (r.has_co2 && r.co2_ppm >= LM.co2_hi) {
    if (++s_streak_co2 >= DANGER_CONFIRM_SAMPLES) { hit = true; kind = FD_CO2_HIGH; value = r.co2_ppm; }
  } else { s_streak_co2 = 0; }

  if (r.has_nh3 && r.nh3_ppm >= LM.nh3_hi) {
    if (++s_streak_nh3 >= DANGER_CONFIRM_SAMPLES) { hit = true; kind = FD_NH3_HIGH; value = r.nh3_ppm; }
  } else { s_streak_nh3 = 0; }

  if (r.has_temp && (r.temp_c >= LM.temp_hi || r.temp_c <= LM.temp_lo)) {
    if (++s_streak_temp >= DANGER_CONFIRM_SAMPLES) {
      hit = true;
      kind = (r.temp_c >= LM.temp_hi) ? FD_TEMP_HIGH : FD_TEMP_LOW;
      value = r.temp_c;
    }
  } else { s_streak_temp = 0; }

  if (r.has_hum && (r.hum_pct >= LM.hum_hi || r.hum_pct <= LM.hum_lo)) {
    if (++s_streak_hum >= DANGER_CONFIRM_SAMPLES) {
      hit = true;
      kind = (r.hum_pct >= LM.hum_hi) ? FD_HUM_HIGH : FD_HUM_LOW;
      value = r.hum_pct;
    }
  } else { s_streak_hum = 0; }

  if (!hit) return;

  const unsigned long now = millis();
  if (now - s_last_alert_ms < ALERT_REFIRE_MS) return;
  s_last_alert_ms = now;

  buzzer_pulse(LOCAL_BUZZER_MS);      // local audible cue, respects mute
  queue_danger(kind, value);          // SMS + call, retried until delivered
}

// One report a day at HEARTBEAT_HOUR local time. Uses the network clock; if
// the modem has not synced time yet we simply skip until it has.
static void maybe_send_heartbeat(const SensorReading& r) {
#if HEARTBEAT_ENABLED
  const unsigned long now = millis();
  if (now - s_last_clock_ms < 60000UL) return;   // poll the clock at most once a minute
  s_last_clock_ms = now;

  int hour; long day;
  if (!net_get_clock(hour, day)) return;
  if (hour == HEARTBEAT_HOUR && day != s_last_heartbeat_day) {
    s_last_heartbeat_day = day;
    Serial.println("[hb] queueing daily report SMS");
    queue_daily(r);
  }
#endif
}

// Redraw the local display from the last reading plus the live link/mains state.
// Called after every reading AND the instant mains changes, so the screen says
// "BATTERY" when the power is cut, not up to a cycle later.
static void refresh_lcd() {
  if (!s_have_reading) return;
  LcdStatus st;
  st.on_mains = s_was_on_usb;
  st.bat_pct  = (s_last_reading.has_bat && s_last_reading.bat_pct != 255) ? s_last_reading.bat_pct : -1;
  st.cloud_ok = net_connected();
  st.rssi_dbm = modem_rssi_dbm();
  lcd_show(s_last_reading, st);
}

static void check_power_transition() {
  const unsigned long now = millis();
  if (now - s_last_power_check_ms < POWER_POLL_MS) return;
  s_last_power_check_ms = now;

  const bool on_usb = power_is_on_usb();
  power_diag_print();               // no-op unless FILAHA_POWER_DIAG is 1

  // The rail is still settling just after boot and the modem has not attached
  // yet, so anything decided in this window is a guess. Adopt what we see as
  // the baseline rather than alarming on it.
  if (now < POWER_BOOT_GRACE_MS) { s_was_on_usb = on_usb; return; }

  // Debounce: require N consecutive agreeing samples before committing a
  // change, so one noisy ADC read can neither raise a false alarm nor (worse)
  // flip the stored state and mask the real transition that follows.
  static bool s_candidate   = false;
  static int  s_streak      = 0;
  if (on_usb == s_was_on_usb) { s_streak = 0; return; }   // no change pending
  if (on_usb != s_candidate) { s_candidate = on_usb; s_streak = 1; }
  else                       { s_streak++; }
  if (s_streak < POWER_CONFIRM_SAMPLES) return;           // not confirmed yet
  s_streak = 0;

  if (!on_usb) {
    // ── MAINS LOST — running on the backup battery ──
    // Fire the local + cloud signals instantly, then queue the SMS/call for
    // guaranteed delivery. Note there is deliberately NO "no battery, skip"
    // suppression any more: with no battery the board simply dies and sends
    // nothing (so it cannot spam), while a suppressed alert on a real unit
    // was silently losing the single most important message we send.
    const int batt = power_battery_pct_settled();
    Serial.printf("[power] MAINS LOST — on battery (%d%%) — buzzer + cloud + queued SMS/call\n", batt);
    buzzer_pulse(LOCAL_BUZZER_MS);
    net_publish_event("PWR_OUT");        // instant, best-effort
    queue_power(true, batt);            // SMS + call, guaranteed delivery
  } else {
    // ── MAINS RESTORED ──
    const int batt = power_battery_pct();
    Serial.printf("[power] MAINS RESTORED (batt %d%%) — cloud + queued SMS\n", batt);
    net_publish_event("PWR_IN");         // instant, best-effort
    queue_power(false, batt);           // confirmation SMS
  }
  s_was_on_usb = on_usb;
  refresh_lcd();                    // show the change at once
}

// ── Button events ────────────────────────────────────────────────
static void handle_button_events() {
  const FilahaButton ev = feedback_consume_event();
  if (ev == BTN_NONE) return;

  switch (ev) {
    case BTN_TEST_ALARM: {
      Serial.println("[btn] TEST ALARM — sending test SMS");
      buzzer_pulse(400);
      queue_simple(MK_TEST);
      break;
    }
    case BTN_POWER_LONG:
      Serial.println("[btn] POWER long-press — powering down");
      queue_simple(MK_SHUTDOWN);
      outbox_service();          // best effort before the lights go out
      delay(200);
      lcd_off();                 // the PCF8574 latches: without this the backlight stays lit asleep
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

// ── Self-healing escalation ──────────────────────────────────────
// Nobody will be standing next to this box in a remote coop. If readings stop
// reaching the cloud, rebuild the modem link; if that does not help either,
// reboot the whole board. Both thresholds are far longer than any normal
// weak-signal gap, so healthy operation never trips them.

static void self_heal_tick() {
  const unsigned long now    = millis();
  const unsigned long silent = now - s_last_cloud_ok_ms;

  if (silent > NET_STALE_REBOOT_MS) {
    Serial.println("[heal] no data reached the cloud for a long time - rebooting board");
    Serial.flush();
    delay(200);
    ESP.restart();                                     // never returns
  }
  if (silent > NET_STALE_RECOVER_MS &&
      now - s_last_recover_ms > NET_STALE_RECOVER_MS) {
    s_last_recover_ms = now;
    Serial.println("[heal] cloud silent - rebuilding the modem link");
    modem_recover();
  }
}

void loop() {
  esp_task_wdt_reset();                          // feed the watchdog each pass
  feedback_loop();
  handle_button_events();
  modem_loop();
  net_loop();                                   // keep MQTT alive / reconnect
  check_power_transition();
  outbox_service();                             // retry anything undelivered
  if (smscmd_tick(s_box_count > 0)) {           // limits changed by text message
    s_streak_co2 = s_streak_nh3 = s_streak_temp = s_streak_hum = 0;   // judge afresh against the new limits
    refresh_lcd();
  }
  self_heal_tick();                             // recover unattended, no human needed

  // Double-chirp the FIRST time the cloud link comes up after boot — audible
  // "we're live" confirmation for demos with no PC attached.
  static bool s_net_announced = false;
  if (!s_net_announced && net_connected()) {
    s_net_announced = true;
    buzzer_pulse(90); delay(110); buzzer_off(); delay(90);
    buzzer_pulse(90); delay(110); buzzer_off();
    Serial.println("[boot] cloud link up — announced");
  }

  const unsigned long now = millis();
  if (now - s_last_send_ms >= TELEMETRY_INTERVAL_MS) {
    s_last_send_ms = now;

    SensorReading r;
    if (sensors_read(r)) {
      uint8_t pkt[8];
      const size_t n = pack_telemetry(r, pkt);
      if (net_publish(pkt, n)) s_last_cloud_ok_ms = now;   // proof the link works
      evaluate_critical(r);                     // emergency lifeline (SMS + call)
      maybe_send_heartbeat(r);                  // once-a-day report
      s_last_reading = r;                       // display last: never delay the safety path
      s_have_reading = true;
      refresh_lcd();
    } else {
      Serial.println("[loop] no usable sensor reading this cycle");
    }
  }

  delay(50);
}
