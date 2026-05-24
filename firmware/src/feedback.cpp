#include "config.h"
#include "feedback.h"

extern "C" {
  #include "esp_sleep.h"
}

// ── Per-button state ─────────────────────────────────────────────
struct ButtonState {
  uint8_t  pin;
  bool     was_high;
  unsigned long pressed_at_ms;
  bool     long_emitted;          // for the power button: emit BTN_POWER_LONG once per press
  FilahaButton short_event;       // event fired on release
};

static ButtonState s_btns[] = {
  { BTN_TEST_ALARM_PIN, false, 0, false, BTN_TEST_ALARM },
  { BTN_MUTE_PIN,       false, 0, false, BTN_MUTE       },
  { BTN_POWER_PIN,      false, 0, false, BTN_NONE       },   // emits via long-press only
  { BTN_RESET_PIN,      false, 0, false, BTN_RESET      },
};
static constexpr int N_BTNS = sizeof(s_btns) / sizeof(s_btns[0]);

static FilahaButton s_pending_event = BTN_NONE;

// ── Buzzer ───────────────────────────────────────────────────────
static unsigned long s_buzzer_off_at_ms = 0;
static unsigned long s_mute_until_ms    = 0;

static inline void buzzer_set(bool on) {
  digitalWrite(BUZZER_PIN, on ? HIGH : LOW);
}

bool buzzer_is_muted() {
  return millis() < s_mute_until_ms;
}

void buzzer_off() {
  s_buzzer_off_at_ms = 0;
  buzzer_set(false);
}

void buzzer_pulse(unsigned long ms) {
  if (buzzer_is_muted()) return;          // user asked for silence
  s_buzzer_off_at_ms = millis() + ms;
  buzzer_set(true);
}

static void buzzer_tick() {
  if (s_buzzer_off_at_ms == 0) return;
  if (millis() >= s_buzzer_off_at_ms) buzzer_off();
}

// ── Button polling (debounced, edge-detected) ────────────────────
static void poll_button(ButtonState& b) {
  const bool now_high = digitalRead(b.pin) == HIGH;

  if (!b.was_high && now_high) {
    // Rising edge — pressed. Capture timestamp; don't emit yet (wait for release
    // so we can distinguish short vs long press for the power button).
    b.pressed_at_ms = millis();
    b.long_emitted  = false;
  } else if (b.was_high && now_high) {
    // Still held — check for long-press on the power button.
    if (b.pin == BTN_POWER_PIN && !b.long_emitted &&
        millis() - b.pressed_at_ms >= BTN_LONG_PRESS_MS) {
      s_pending_event = BTN_POWER_LONG;
      b.long_emitted = true;
    }
  } else if (b.was_high && !now_high) {
    // Falling edge — released. Emit short event only if it wasn't a long-press
    // and the press lasted more than the debounce window.
    const unsigned long held = millis() - b.pressed_at_ms;
    if (held >= BTN_DEBOUNCE_MS && !b.long_emitted && b.short_event != BTN_NONE) {
      s_pending_event = b.short_event;
    }
  }
  b.was_high = now_high;
}

// ── Public API ───────────────────────────────────────────────────
void feedback_begin() {
  pinMode(BUZZER_PIN, OUTPUT);
  buzzer_set(false);

  for (int i = 0; i < N_BTNS; i++) {
    // Gravity push buttons are active-HIGH and have a pull-down on their
    // output. INPUT_PULLDOWN nails the idle state if the cable is long.
    pinMode(s_btns[i].pin, INPUT_PULLDOWN);
    s_btns[i].was_high       = false;
    s_btns[i].pressed_at_ms  = 0;
    s_btns[i].long_emitted   = false;
  }
}

void feedback_loop() {
  for (int i = 0; i < N_BTNS; i++) poll_button(s_btns[i]);
  buzzer_tick();

  // Handle Mute internally — caller doesn't need to know.
  if (s_pending_event == BTN_MUTE) {
    s_mute_until_ms = millis() + MUTE_DURATION_MS;
    buzzer_off();
    Serial.printf("[feedback] muted for %lu min\n",
                  MUTE_DURATION_MS / 60000UL);
    s_pending_event = BTN_NONE;          // event consumed here
  }
}

FilahaButton feedback_consume_event() {
  const FilahaButton ev = s_pending_event;
  s_pending_event = BTN_NONE;
  return ev;
}

// ── Deep sleep ───────────────────────────────────────────────────
void enter_deep_sleep() {
  Serial.println("[feedback] entering deep sleep — press POWER to wake");
  buzzer_off();

  // Cut modem power so the device truly idles. The modem comes back up
  // cleanly inside modem_begin() on the next boot.
  pinMode(MODEM_POWER_ON, OUTPUT);
  digitalWrite(MODEM_POWER_ON, LOW);

  // Wait until the user releases the power button so we don't wake
  // immediately on the same press.
  while (digitalRead(BTN_POWER_PIN) == HIGH) delay(10);

  // Configure ext0 wake-up: any HIGH on the power button (i.e. a press).
  esp_sleep_enable_ext0_wakeup((gpio_num_t)BTN_POWER_PIN, 1);
  delay(50);
  esp_deep_sleep_start();
  // Execution never returns from here — wake restarts setup().
}
