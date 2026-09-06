# Filaha Flock — Hardware Guide for the Incoming Developer

You are taking over the physical box: an ESP32 + 2G/LTE modem unit that sits in a
poultry coop, reads sensors, streams them to our cloud, and — independently of any
internet — texts and phones the farmer when something is wrong.

This document is about **the hardware and how the firmware touches it**. It is
written for someone who is going to **add pins** (LEDs, extra buttons, another
sensor), so the important half is section 4 (what each pin already does) and
section 5 (which pins are actually free, and which ones will burn you).

Companion docs:
- `FIRMWARE_HANDOFF.md` — provisioning a unit, flashing, field troubleshooting.
- `../server/README.md` — the cloud side (MQTT broker, TimescaleDB, REST API).

> **The code is the source of truth for every pin.** `src/config.h` is the single
> place pins are defined. If this file and `config.h` ever disagree, `config.h`
> wins — and please fix this file in the same commit.

---

## 1. Five rules to read before you plug anything in

1. **The LiPo battery is not optional — ever.** The A7670G modem pulls ~2 A in
   transmit bursts. USB alone cannot supply those peaks; the modem browns out
   mid-scan and stops answering AT commands. Every "the modem is dead" bug so
   far has been a power bug. Bench-test and ship with the battery connected.
2. **Use a USB-A charger (5 V / 2 A) with an A-to-C cable.** Many all-USB-C
   chargers negotiate power in a way this board cannot answer and deliver
   nothing at all.
3. **Never touch GPIO 6–11.** They are the SPI flash. Using one kills the boot.
4. **Do not repurpose GPIO 4, 5, 12, 26, 27.** They are the modem's power,
   reset and UART. Taking one of them costs you the entire product.
5. **Antenna connected before power-on**, always. Transmitting into an open
   connector is how you kill a radio.

---

## 2. What the box actually does

```
 sensors (I²C) ──┐
                 ├─► ESP32 ──► A7670G modem ──┬── 2G/LTE data ──► MQTT ──► our server ──► phone app
 battery (ADC) ──┘        │                   └── SMS + voice call ─────────────────────► farmer's phone
                          │                                                   (works with NO internet)
                          ├─► buzzer (local alarm)
                          └─◄ 4 buttons (test / mute / power / reset)
```

- Every **15 s** (`TELEMETRY_INTERVAL_MS`): read sensors → pack an **8-byte**
  packet → publish to `filaha/<DEVICE_ID>/telemetry`.
- Offline? Readings queue in RAM (60 slots ≈ 15 min) and flush when the link
  returns. Nothing is lost to a signal gap.
- **Danger** (CO₂ / NH₃ / temp / humidity past threshold for 2 readings in a row):
  buzzer + SMS + a voice call to the farmer, retried until delivered.
- **Mains cut**: buzzer + instant `PWR_OUT` event + SMS + call.
- **Daily report** SMS at 20:00 local time.
- Unattended self-healing: hardware watchdog (180 s), modem power-cycle after
  repeated failures, full reboot if the cloud has been silent for 30 min.

Firmware version is set in `platformio.ini` (`FILAHA_FIRMWARE_VERSION`,
currently **1.0.3**) and printed in the boot banner.

---

## 3. Hardware inventory

| Item | Part | Notes |
|---|---|---|
| Board | **LilyGO T-A7670G R2** | ESP32-WROVER + SIMCom A7670G (LTE-Cat-1 + 2G fallback, SMS + voice) |
| CO₂ + temp + humidity | Sensirion **STCC4** (DFRobot Gravity SEN0678) | I²C **0x64** — not the 0x62 you may read elsewhere; that cost us a bring-up day |
| NH₃ | **MiCS-4514** (DFRobot Gravity SEN0377) | I²C 0x75 — **not fitted yet**, gated behind `FILAHA_HAS_NH3` |
| Buttons ×4 | DFRobot Gravity DFR0029 | **active-HIGH** digital push buttons |
| Buzzer | DFRobot Gravity DFR0032 | active-HIGH digital buzzer |
| Wiring | Gravity **I²C HUB** + 3-pin cables | keeps the bus tidy over long cable runs |
| Power | LiPo cell + 5 V/2 A USB-A charger | see rule 1 |
| SIM | Algerian data SIM (Mobilis / Ooredoo / Djezzy) | APN auto-detected from the operator |
| Antenna | LTE/2G whip on the main SMA | an external antenna is the #1 fix for a weak coop |

The R2 revision has shipped in more than one layout. **Check the silkscreen on
your specific board** before trusting any pin table, including this one.

---

## 4. Pin map as the firmware currently drives it

Everything below is from `src/config.h` — these are facts about our code, not
guesses about the board.

### Modem (do not touch)
| Signal | GPIO | Direction | Notes |
|---|---|---|---|
| `MODEM_POWER_ON` | **12** | out | VCC enable rail; also the ESP32 MTDI strapping pin |
| `MODEM_PWRKEY` | **4** | out | pulsed low ~1 s to toggle power |
| `MODEM_RST` | **5** | out | hard reset; also a strapping pin |
| `MODEM_TX` | **26** | out | ESP32 TX → modem RX |
| `MODEM_RX` | **27** | in | ESP32 RX ← modem TX |
| — | — | — | `Serial1` @ 115200 baud |

### Sensors
| Signal | GPIO | Notes |
|---|---|---|
| `I2C_SDA` | **21** | shared bus, 100 kHz (gentle for long Gravity cables) |
| `I2C_SCL` | **22** | every new I²C sensor goes here — **no new pins needed** |
| `BATTERY_ADC_PIN` | **35** | VBAT ÷2 divider, ADC1, input-only. Averaged over 5 reads |

### User interface
| Signal | GPIO | Colour | Mode | Event |
|---|---|---|---|---|
| `BTN_TEST_ALARM_PIN` | **13** | red | `INPUT_PULLDOWN`, active HIGH | send a test SMS |
| `BTN_MUTE_PIN` | **14** | blue | `INPUT_PULLDOWN` | silence the buzzer for 10 min |
| `BTN_POWER_PIN` | **15** | white | `INPUT_PULLDOWN` | hold 3 s → deep sleep; press → wake (ext0) |
| `BTN_RESET_PIN` | **25** | green | `INPUT_PULLDOWN` | `ESP.restart()` |
| `BUZZER_PIN` | **19** | — | `OUTPUT`, active HIGH | pulses on danger, chirps on boot |

> **Two stale numbers you may meet in older notes:** the buzzer moved **17 → 19**
> during first-unit bring-up, and telemetry moved 60 s → 15 s. GPIO **19** and
> **15 s** are what ship today.

### Not wired yet (both already supported by the firmware)
| Signal | Constant | Status |
|---|---|---|
| Charger/VBUS presence sense | `FILAHA_VBUS_ADC_PIN` | `-1` = absent. **If you can wire this, do it** — see 6.4 |
| Status LEDs (red / green / orange) | — | no pins, no code yet. This is probably your job — see 6.1 |

---

## 5. The GPIO budget — read this before you pick a pin

The ESP32 has 34 GPIOs and this board has already spent most of them. There are
realistically **three** free output-capable pins left. Choose deliberately.

### Free and safe
| GPIO | Capabilities | Comment |
|---|---|---|
| **18** | in / out | genuinely free. First choice for an LED |
| **23** | in / out | genuinely free. Second choice |
| **32** | in / out, ADC1 | free; confirmed floating on our unit. Third choice, or an analog input |
| **34** | **input only**, ADC1 | no internal pull-up/pull-down — external resistor required |
| **36** | **input only**, ADC1 | same |
| **39** | **input only**, ADC1 | same |

GPIO 34/36/39 cannot drive anything. They are for analog sensing only (a divider,
a thermistor, a VBUS sense). All three were confirmed floating during an ADC
sweep of the real unit.

### Never
| GPIO | Why |
|---|---|
| **6–11** | SPI flash. Using one does not boot |
| **1, 3** | `U0TXD` / `U0RXD` — the USB serial monitor you debug with |
| **16, 17** | ESP32-**WROVER** PSRAM lines. Treat as unavailable (the buzzer was moved off 17 during bring-up) |
| **33** | **Measured sitting on the 3V3 rail on this board revision** — not a usable input here. Documented in `src/power_logic.h` |

### Taken, or booby-trapped
| GPIO | Issue |
|---|---|
| **4, 5, 12, 26, 27** | modem (see section 4). Also: 5 and 12 are strapping pins |
| **0, 2** | strapping pins (boot mode). GPIO 2 is also the SD-card MISO on this board |
| **13, 14, 15, 25** | our four buttons. On the board these are also the **SD-card slot** (13 CS / 14 CLK / 15 MOSI) and the **modem DTR** (25) — fine only because we use neither |
| **12** | MTDI strapping: must be LOW at boot or the chip picks the wrong flash voltage and bootloops. The board handles this; do not add a pull-up here |
| **35** | battery ADC, input-only |
| **21, 22** | I²C bus — but adding a device here costs **zero** new pins |

### Rules of thumb
- **Adding a sensor? Put it on I²C (21/22) via the hub.** Different address, no
  new GPIO, and the boot-time `i2c_scan()` will show it immediately.
- **Out of pins?** A PCF8574 (I²C, 8 GPIOs) or a WS2812 chain (one pin, many
  LEDs) costs one address or one pin instead of six.
- **Deep-sleep wake sources must be RTC-capable pins** (0, 2, 4, 12–15, 25–27,
  32–39). GPIO 18 and 23 are *not* — keep that in mind if you ever move the
  power button.
- **ADC2 pins** (0, 2, 4, 12–15, 25–27) are unusable while WiFi is active. We
  never enable WiFi, so this does not bite us today — but do not build a design
  that depends on ADC2 in case WiFi is ever switched on. Prefer ADC1 (32–39).
- The 3V3 rail is shared with a radio that wants 2 A peaks. Keep added loads
  small: LEDs through resistors (a few mA each), never a motor or relay coil
  straight off the board.

---

## 6. Cookbook — how to add each kind of pin

The codebase has one convention: **pins are declared in `config.h` and nowhere
else**, and the peripheral that owns them lives in its own module. Follow it and
your change stays a three-file diff.

### 6.1 An output (status LED, relay driver)

This is the most likely task — status LEDs are specified but not implemented.

**`src/config.h`**, next to the buzzer block:
```c
// ── Status LEDs (active HIGH, series resistor ~330 Ω to GND) ───────
#define LED_GREEN_PIN   18       // all good
#define LED_ORANGE_PIN  23       // warning / no network
#define LED_RED_PIN     32       // danger / power cut
```

**`src/feedback.cpp`** — extend `feedback_begin()`:
```c
pinMode(LED_GREEN_PIN,  OUTPUT);
pinMode(LED_ORANGE_PIN, OUTPUT);
pinMode(LED_RED_PIN,    OUTPUT);
```
then add a `leds_set(...)` alongside `buzzer_pulse()`, declare it in
`feedback.h`, and call it from `main.cpp` where the buzzer already fires:
`check_power_transition()` (mains lost/restored), `evaluate_critical()` (danger),
and the `net_connected()` announce block in `loop()`.

**Do not use `delay()` for blinking.** `loop()` must keep turning — the watchdog
reboots the board after 180 s of stall, and a blocking blink also stops power
sampling during exactly the emergency you are blinking about. Use the
non-blocking pattern already in `buzzer_tick()`: store a "turn off at"
timestamp and check it each pass.

### 6.2 An input (an extra button)

Add the pin to `config.h`, add an enum value to `FilahaButton` in `feedback.h`,
add one row to the `s_btns[]` table in `feedback.cpp`, and handle the new event
in `handle_button_events()` in `main.cpp`. Debounce, edge detection and
long-press are already handled by the shared poller — you get them for free.

Gravity buttons are **active HIGH** and configured `INPUT_PULLDOWN`. If you use
34/36/39 there is no internal pulldown: fit a 10 kΩ resistor to GND, or the
input floats and fires ghost presses.

### 6.3 An I²C sensor (preferred — costs no pins)

Plug it into the Gravity I²C HUB. On boot, `i2c_scan()` in `sensors.cpp` prints
every address that ACKs:

```
[i2c] scanning bus (SDA=21 SCL=22)…
[i2c]   device found at 0x64
```

That one line separates "not powered / not wired" (nothing found) from "wrong
address in the code" (found, but not where we look). Add the driver behind a
`FILAHA_HAS_<X>` flag in `config.h`, mirroring how `FILAHA_HAS_NH3` gates the
MiCS-4514 — that whole NH₃ path compiles out today and turns on with one `1`.

If you add a channel to the telemetry packet, **you must update the server
decoder in the same change** — see section 8.

### 6.4 An analog sense pin — and the one that matters most

If you can route **charger presence (VBUS)** through a divider to a spare ADC1
pin (34/36/39), do it. The firmware already supports it:

```c
#define FILAHA_VBUS_ADC_PIN   34      // was -1
#define FILAHA_VBUS_MIN_V     0.6f
```

`power_is_on_usb()` then reads that pin directly and the entire ripple/level
heuristic is bypassed. That heuristic exists only because this board revision
offers no charger-presence signal at all — the battery divider on GPIO 35 is the
only analog node, and with a battery permanently fitted it reads 3.3–4.2 V
whether or not the charger is connected. Read the header comment in
`src/power_logic.h` before touching any of it; that logic has been wrong twice
and the comment explains exactly why each rule is there.

Divider maths: the ADC sees 0–3.3 V, and `read_pin_v(pin, divider)` multiplies by
your divider ratio — a 100 k / 100 k pair on 5 V VBUS gives 2.5 V at the pin, so
`divider = 2.0f`. **Never feed 5 V into a GPIO directly.**

---

## 7. Build, flash, watch

1. VS Code + the **PlatformIO IDE** extension.
2. Open the **`firmware/`** folder (not the repo root — PlatformIO needs
   `platformio.ini` at the top of the opened folder).
3. Plug the board in over USB. Bottom bar → **Upload** (→). The first build
   pulls the ESP32 toolchain and libraries; a few minutes, once.
4. **Serial Monitor** (plug icon) at **115200 baud**.

Port note: this PC has a phantom legacy COM1 that auto-detect happily picks,
producing "No serial data received". `platformio.ini` therefore globs
`COM[2-9]*`. If your board enumerates as COM10 or higher, set `upload_port` and
`monitor_port` explicitly — run this to find it:

```bash
pio device list
```

### A healthy boot looks like this
```
  Filaha Flock firmware v1.0.3
  Device ID :  DEV01
  MQTT      :  134.209.242.192:1883  topic filaha/DEV01/telemetry
[pwr-test] PASS  steady on charger, worst observed noise
[pwr-test] 5/5 passed
[i2c]   device found at 0x64
[sensors] STCC4 detected
[modem] REGISTERED on auto (any)
[modem] attached=1  rssi=-71dBm  op=Mobilis
[net] MQTT OK (CMQTTCONNECT r=1)
[net] publish OK  (queue 0)          ← every 15 s
```
- One chirp at boot, two chirps when the cloud link comes up — audible proof
  with no PC attached.
- `rssi` better than **-95 dBm** is good; worse than **-105 dBm** means fit an
  external antenna.
- `[pwr-test]` anything other than **5/5 passed** = do not ship that unit. It
  runs the shipping decision function against scripted voltage sequences,
  including cases that would take hours to reproduce on a bench.

### Debug switches in `config.h` (all must be back at their ship values)
| Flag | Ship | What it does |
|---|---|---|
| `FILAHA_MODEM_DEBUG` | `0` | `1` echoes every AT command — essential for a modem bug, unreadable otherwise |
| `FILAHA_POWER_DIAG` | `1` | one `[pwr] vbat=… ripple=… → MAINS` line every 4 s |
| `FILAHA_POWER_SELFTEST` | `1` | leave on — a silent regression here is a missed power cut |
| `FILAHA_TEST_MODE` | `0` | `1` = synthetic sensor values; lets you test modem→SMS→app with just the board and a SIM |

---

## 8. The packet, the topics, and the one coupling you must not break

8 bytes, **big-endian**, published hex-encoded (16 ASCII chars — this modem
rejects a binary `CMQTTPAYLOAD` containing `0x00`, and a temperature high byte
is very often zero):

| Bytes | Field | Encoding |
|---|---|---|
| 0–1 | temp | `int16` = °C × 10 |
| 2 | humidity | `uint8` % |
| 3–4 | CO₂ | `uint16` ppm |
| 5–6 | NH₃ | `uint16` = ppm × 100 |
| 7 | battery | `uint8` %, **255 = unknown** (stored as null, not a scary 0 %) |

Topics: `filaha/<DEVICE_ID>/telemetry` and `filaha/<DEVICE_ID>/event`
(`PWR_OUT` / `PWR_IN`, published the instant it happens).

`src/pack.cpp` and the server's ingest decoder are **two halves of one wire
format**. Change one without the other and every unit in the field starts
reporting garbage. Same commit, both sides, always.

Confirm a unit reached the cloud:
```bash
curl -H "Authorization: Bearer $API_TOKEN" http://134.209.242.192:8080/api/devices/DEV01/latest
```

Each new box needs its own `FILAHA_DEVICE_ID` + `FILAHA_MQTT_PASS`. On the
server, this prints the exact lines to paste into `config.h`:
```bash
cd ~/server && ./add-device.sh DEV02 +2135XXXXXXXX
```

---

## 9. Bench tests before a unit ships

| Test | How | Expected |
|---|---|---|
| Boot | power on with the battery connected | one chirp, banner, `[pwr-test] 5/5 passed` |
| I²C | watch the boot scan | `device found at 0x64` |
| Cloud | watch the monitor | two chirps, then `[net] publish OK (queue 0)` every 15 s |
| SMS | press the **red** button | test SMS arrives on the farmer's phone |
| Voice | trigger any danger alert | `[call] dial accepted` (a `REJECTED` here means the module is data-only — SMS still covers it) |
| Power cut | unplug the charger, battery fitted | `MAINS LOST` within ~1.5 s, buzzer, SMS + ring |
| Power back | plug the charger back in | `MAINS RESTORED` after ~50–70 s — **the lag is deliberate**, see below |
| Mute | press **blue** during an alarm | buzzer stops for 10 min |
| Sleep/wake | hold **white** 3 s, then press | shutdown SMS, deep sleep, wakes on press |
| Reset | press **green** | clean reboot, modem re-inits |

**The restore lag is a feature, not a bug.** A cut is detected on the voltage
step (fast). A restore is judged on how *quiet* the rail is across two 20 s
windows after a 30 s lockout, because a full cell reads identically plugged and
unplugged. The previous symmetric version sent "power is back" seconds after
every genuine cut. A late confirmation costs nothing; a false one destroys the
farmer's trust in every alert the box sends.

---

## 10. Gotchas already paid for — do not re-derive these

| Symptom | Cause | Where |
|---|---|---|
| Modem stops answering AT mid-scan | supply cannot deliver 2 A peaks — **battery missing or flat** | `modem.cpp:wait_registered()` prints this diagnosis explicitly |
| "init failed" right after an ESP32 reset | the modem survives an ESP32 reset still powered, so a blind PWRKEY pulse turned it **off** | we now probe `AT` before pulsing |
| Registered nowhere on a Mobilis SIM | the module kept re-scanning for LTE instead of camping on weak 2G | explicit RAT ladder: auto → 2G-only → LTE-only |
| MQTT stuck at `state=-4` | TinyGSM's raw socket never surfaced the CONNACK on this modem | rewritten on the A7670's native `AT+CMQTT*` engine |
| Publish fails on some readings | a binary payload containing `0x00` is rejected | payload is hex-encoded; the server decodes it |
| Arabic SMS never sends | TinyGSM's `sendSMS_UTF16()` uses `AT+CSCS="HEX"`, unsupported here; and in UCS2 the **destination number is hex too** | hand-written UCS2 path, with a plain-French GSM-7 fallback |
| STCC4 not found | the address is **0x64**, not 0x62 | found via the boot-time `i2c_scan()` |
| "No serial data received" on upload | phantom COM1 | port glob in `platformio.ini` |
| Permanent power-cut alarm | v1.0.0 read a low absolute voltage as "on battery"; with a battery always fitted that is always true | rewritten as difference-based logic in `power_logic.h` |

---

## 11. Where to change what

| You want to… | File |
|---|---|
| add or move a pin | `src/config.h` — **only here** |
| touch buttons, buzzer, LEDs, deep sleep | `src/feedback.cpp` / `.h` |
| touch sensors, battery, mains detection | `src/sensors.cpp` / `.h` |
| touch the mains-vs-battery *decision* | `src/power_logic.h` (pure logic, self-tested at boot) |
| touch the modem, SMS, voice calls | `src/modem.cpp` / `.h` |
| touch GPRS, MQTT, store-and-forward | `src/net.cpp` / `.h` |
| touch the wire format | `src/pack.cpp` **+ the server decoder, same commit** |
| touch farmer-facing SMS wording (AR/FR) | `src/format.cpp` / `.h` — a Unicode SMS is **70 characters**, not 160 |
| retune thresholds, cadence, timeouts | `src/config.h` |
| change libraries, build flags, version | `platformio.ini` |

Per-unit values that change for every box: `FILAHA_DEVICE_ID`,
`FILAHA_FARMER_NUMBER`, `FILAHA_MQTT_PASS`, `FILAHA_SMS_LANG`, `FILAHA_SIM_PIN`.

When you change a pin, bump `FILAHA_FIRMWARE_VERSION` in `platformio.ini` and
update section 4 of this file. A wrong pin table is worse than no pin table.
