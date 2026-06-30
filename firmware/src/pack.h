#pragma once
#include <stdint.h>
#include <stddef.h>
#include "sensors.h"

// Packs the metrics into an 8-byte BIG-ENDIAN packet (must match the server):
//   [0..1] temp  int16  = round(tempC * 10)
//   [2]    hum   uint8  = round(hum %)
//   [3..4] co2   uint16 = round(ppm)
//   [5..6] nh3   uint16 = round(ppm * 100)
//   [7]    bat   uint8  = battery % (0-100)
// Returns the number of bytes written (always 8).
size_t pack_telemetry(const SensorReading& r, uint8_t out[8]);
