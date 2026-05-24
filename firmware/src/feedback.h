// ════════════════════════════════════════════════════════════════
//  feedback.h — local user feedback: 4 buttons + buzzer
//
//  Buttons:  Test alarm · Mute · Power (long-press) · Reset
//  Buzzer:   sounds on local sensor danger, silenced for 10 min by Mute
// ════════════════════════════════════════════════════════════════
#pragma once
#include <Arduino.h>

enum FilahaButton {
  BTN_NONE = 0,
  BTN_TEST_ALARM,      // red    — fire a test ALERT SMS
  BTN_MUTE,            // blue   — silence buzzer for MUTE_DURATION_MS
  BTN_POWER_LONG,      // white  — long-press → deep sleep
  BTN_RESET,           // green  — ESP.restart()
};

void feedback_begin();
void feedback_loop();                          // poll buttons + manage buzzer
FilahaButton feedback_consume_event();         // one-shot event since last call

// Buzzer control. Respects the active mute window.
void buzzer_pulse(unsigned long ms);
void buzzer_off();
bool buzzer_is_muted();

// Power-off helper used by main when the long-press fires.
void enter_deep_sleep();
