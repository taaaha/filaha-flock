// ════════════════════════════════════════════════════════════════
//  smscmd.h — change the alert limits by text message
//
//  Every few seconds, when nothing urgent is waiting to be sent, the box looks
//  for text messages. Only the registered farmer number (and an optional
//  second number, FILAHA_ADMIN_NUMBER) is obeyed; everyone else is ignored
//  without a reply. The language of the commands is in limits_logic.h.
// ════════════════════════════════════════════════════════════════
#pragma once
#include <Arduino.h>

// Call from loop(). `outbox_busy` is true while an alert is still waiting to
// be delivered: an alert always goes first, and commands wait their turn.
// Returns true when the limits were changed (so the caller can restart its
// danger counters).
bool smscmd_tick(bool outbox_busy);
