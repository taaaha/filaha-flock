#pragma once
#include <Arduino.h>
#include <stdint.h>

// Data path: GPRS/EDGE + MQTT over the same modem instance that does SMS.
// (Single-threaded loop — MQTT and SMS AT commands are always sequenced, never
//  interleaved mid-command, so they coexist on the one modem.)
bool net_begin();                                   // attach GPRS + connect MQTT
void net_loop();                                    // keep MQTT alive / reconnect
bool net_connected();
bool net_publish(const uint8_t* data, size_t len);  // -> filaha/<id>/telemetry

// Network-provided clock (for the once-a-day heartbeat). false until synced.
bool net_get_clock(int& hour_out, long& day_key_out);   // day_key = YYYYMMDD
