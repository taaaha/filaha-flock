// ════════════════════════════════════════════════════════════════
//  sensors.h — STCC4 (CO₂ + T + H), MiCS-4514 (NH₃, flagged), battery
// ════════════════════════════════════════════════════════════════
#pragma once
#include "format.h"

bool sensors_begin();                       // I²C + STCC4 + optional MiCS
bool sensors_read(SensorReading& out);      // fills the channels we have

// Power-cut detection helpers.
bool power_is_on_usb();                     // true if USB / external power present
int  power_battery_pct();                   // 0..100 estimate from LiPo curve
