// ════════════════════════════════════════════════════════════════
//  sensors.h — STCC4 (CO₂ + T + H), MiCS-4514 (NH₃, flagged), battery
// ════════════════════════════════════════════════════════════════
#pragma once
#include "format.h"

bool sensors_begin();                       // I²C + STCC4 + optional MiCS
bool sensors_read(SensorReading& out);      // fills the channels we have

// Power-cut detection helpers.
bool power_is_on_usb();                     // true if USB / external power present
int  power_battery_pct();                   // 0..100 estimate, or -1 if unknown

// Battery % read right after a power transition. The rail needs a moment to
// settle once the charger is pulled, so this retries briefly instead of
// returning the "unknown" (-1) that a single immediate read often gives.
int  power_battery_pct_settled();
