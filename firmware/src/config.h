// ════════════════════════════════════════════════════════════════
//  config.h — per-device + tuning constants
//  Edit this file for each unit you flash. Nothing else needs changing.
// ════════════════════════════════════════════════════════════════
#pragma once

// ── Per-device identity (CHANGE FOR EACH UNIT) ─────────────────────
// Must match the device ID you type when adding the coop in the app.
#define FILAHA_DEVICE_ID         "DEV01"

// The Djezzy / farmer SIM running the Filaha Flock app (intl. format).
#define FILAHA_FARMER_NUMBER     "+213000000000"

// ── Cadence ────────────────────────────────────────────────────────
#define DATA_INTERVAL_MS         (30UL * 1000UL)      // data SMS every 30 s
#define SENSOR_WARMUP_MS         (5UL  * 1000UL)      // settle time after boot

// ── Local danger thresholds (mirror the app defaults) ──────────────
// Used ONLY for the optional explicit ALERT/CLEAR SMS path. The app
// re-evaluates each reading anyway — this is defence in depth.
#define CO2_DANGER_PPM           2500.0f
#define NH3_DANGER_PPM           35.0f
#define TEMP_HIGH_C              38.0f
#define TEMP_LOW_C               12.0f
#define HUM_HIGH_PCT             85.0f
#define HUM_LOW_PCT              25.0f

// Require N consecutive danger readings before firing an explicit ALERT
// — kills the noise from a single sensor spike.
#define DANGER_CONFIRM_SAMPLES   2

// Never re-fire the same ALERT type more often than this (matches the
// app's 10-minute refire cooldown).
#define ALERT_REFIRE_MS          (10UL * 60UL * 1000UL)

// ── Pin map: LilyGO T-A7670G R2 ────────────────────────────────────
// Verify against the silkscreen on your specific board revision —
// LilyGO has shipped two slightly different layouts under "R2".
#define MODEM_POWER_ON           12                   // VCC enable rail
#define MODEM_PWRKEY             4                    // power-on key (pulse)
#define MODEM_RST                5                    // hard reset (optional)
#define MODEM_TX                 26                   // ESP32 TX → modem RX
#define MODEM_RX                 27                   // ESP32 RX ← modem TX
#define MODEM_BAUD               115200
#define BATTERY_ADC_PIN          35                   // VBAT/2 voltage divider

// ── I²C bus (shared by every Gravity sensor via the I²C HUB) ───────
#define I2C_SDA                  21
#define I2C_SCL                  22
#define I2C_FREQ_HZ              100000               // 100 kHz — gentle for long Gravity cables

// ── Buttons (Gravity active-HIGH digital push buttons, DFR0029) ────
// Wire each button's signal line to its pin and 3V3/GND from the hub.
// Colour mapping below is suggested — swap pin numbers to swap colours.
#define BTN_TEST_ALARM_PIN       13                   // RED   — send a test ALERT SMS
#define BTN_MUTE_PIN             14                   // BLUE  — silence buzzer for MUTE_DURATION_MS
#define BTN_POWER_PIN            15                   // WHITE — long-press → deep sleep, press → wake
#define BTN_RESET_PIN            25                   // GREEN — quick reboot (re-init modem)

// ── Buzzer (Gravity digital buzzer, DFR0032) ───────────────────────
#define BUZZER_PIN               17

// ── Button + buzzer timings ────────────────────────────────────────
#define BTN_DEBOUNCE_MS          40
#define BTN_LONG_PRESS_MS        3000                 // hold POWER 3 s to power down
#define MUTE_DURATION_MS         (10UL * 60UL * 1000UL)   // 10 min silence after Mute
#define LOCAL_BUZZER_MS          1500                 // pulse on local danger

// ── Feature flags ──────────────────────────────────────────────────
// Flip to 1 when the MiCS-4514 NH₃ sensor (SEN0377) arrives in July.
// Until then NH₃ is simply omitted from the SMS — the parser handles that.
#define FILAHA_HAS_NH3           0

// Pipe every modem AT command through Serial for debugging.
// Set to 0 for a slightly tighter production loop once the unit is happy.
#define FILAHA_MODEM_DEBUG       1
