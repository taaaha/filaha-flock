// ════════════════════════════════════════════════════════════════
//  limits.h — the alert limits the box is using RIGHT NOW
//
//  Starts from the defaults in config.h, is changed by a text message
//  (smscmd.cpp), and is saved in the chip's non-volatile memory, so it
//  survives a reboot, a power cut and deep sleep.
// ════════════════════════════════════════════════════════════════
#pragma once
#include "limits_logic.h"

void          limits_begin();                    // load saved limits, or the config.h defaults
const Limits& limits_get();
bool          limits_set(const Limits& L);       // validate, apply, save
void          limits_reset();                    // back to the config.h defaults (and forget the saved ones)
