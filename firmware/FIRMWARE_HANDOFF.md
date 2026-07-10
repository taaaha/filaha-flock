# Filaha Flock — Firmware Handoff (first production unit)

This is the microcontroller firmware for the poultry-coop monitoring box. It
reads the sensors, streams a tiny binary packet to our cloud server every 60 s
over 2G data, and — independently — calls + texts the farmer directly on a real
emergency (works even with no internet). Built for weak rural Algerian 2G.

**Board:** LilyGO T-A7670G R2 (ESP32-WROVER + SIMCom A7670G LTE-Cat1/2G modem)
**Toolchain:** [PlatformIO](https://platformio.org/) (VS Code extension, free)

---

## 1. What each unit does
- Every **60 s**: reads Temp / Humidity / CO₂ (Sensirion STCC4) + battery, packs
  them into an **8-byte** packet, publishes to `filaha/<DEVICE_ID>/telemetry` (MQTT).
- **Store-and-forward:** if the network drops, readings are queued in RAM and
  flushed the instant it returns — a signal blackout loses nothing.
- **Daily report:** one plain-text SMS to the farmer at 20:00.
- **Emergency (local, no internet needed):** if CO₂/NH₃/temp/humidity crosses a
  danger threshold for 2 readings, the box **sends an SMS + rings the farmer**.
- **Self-healing:** auto-reconnect, modem power-cycle after repeated failures,
  and a hardware watchdog that reboots the chip if anything ever hangs.
- **Auto-APN:** detects the operator and picks the APN — one firmware runs on
  Mobilis, Ooredoo, and Djezzy SIMs with no change.

## 2. Wiring (verify against your board's silkscreen)
| Part | Connects to | ESP32 pin |
|---|---|---|
| A7670G modem | on-board (UART) | TX 26 / RX 27, PWRKEY 4, POWER_ON 12, RST 5 |
| STCC4 (CO₂+T+H), I²C addr 0x64 | I²C bus | SDA 21 / SCL 22 |
| MiCS-4514 (NH₃), I²C 0x75 | I²C bus | **not fitted yet — leave off** |
| Battery sense | VBAT divider | ADC 35 |
| Buzzer | — | 17 |
| Buttons: Test / Mute / Power / Reset | — | 13 / 14 / 15 / 25 |
- Put a **SIM with a small data plan** in the modem, antenna connected.
- **NH₃ sensor not soldered yet** → firmware already sends NH₃ = 0 and everything
  else works. When the MiCS arrives, wire it to the I²C bus and set
  `FILAHA_HAS_NH3 1` (below) — nothing else changes.
- **Status LEDs (red/green/orange):** wire them up, but note this firmware
  version does **not drive them yet** — the LED status feature ships in the next
  flash (once the module type + pins are finalized). Buttons, buzzer, sensors,
  data and SMS/calls are all fully working in this version.

## 3. Set these per unit — `firmware/src/config.h` (top of file)
```c
#define FILAHA_DEVICE_ID      "DEV011"            // unique per box; MUST match the server
#define FILAHA_FARMER_NUMBER  "+213781103304"    // the farmer's phone (SMS + calls go here)
#define FILAHA_SIM_PIN        ""                 // "" if the SIM has no PIN
```
Already set for you (don't change unless the server moves):
```c
#define FILAHA_MQTT_HOST   "134.209.242.192"     // our DigitalOcean server
#define FILAHA_MQTT_PASS   "<from add-device.sh>" // this device's password
#define FILAHA_HAS_NH3     0                      // 0 until the MiCS sensor arrives
#define FILAHA_TEST_MODE   0                      // 0 = real sensors (1 = fake data for bench tests)
```
> Each **new** box needs its own `DEVICE_ID` + MQTT password. On the server run
> `cd ~/server && ./add-device.sh DEV02 +2135XXXXXXXX` — it prints the exact
> `DEVICE_ID` + `MQTT_PASS` lines to paste here. (`DEV01` is already registered.)

## 4. Build + flash
1. Install **VS Code** → **PlatformIO IDE** extension.
2. Open the `firmware/` folder in VS Code.
3. Plug the board in by USB.
4. PlatformIO bottom bar → **Upload** (→ arrow icon). First build downloads the
   ESP32 toolchain + libraries automatically (a few minutes, once).
5. Then open the **Serial Monitor** (plug icon) at **115200 baud**.

## 5. What "working" looks like on the Serial Monitor
```
Filaha Flock firmware v0.1.0
Device ID :  DEV01
MQTT      :  134.209.242.192:1883  topic filaha/DEV01/telemetry
[modem] attached=1  rssi=-71dBm  op=Mobilis
[net] GPRS connect  apn=internet  op=Mobilis  ...
[net] MQTT OK (state=0)
[net] publish OK  (queue 0)         ← every 60 s
```
- `rssi` better than about **-95 dBm** = good; worse than **-105 dBm** = fit an
  **external antenna** (this is the #1 fix for weak coops).
- Press the **RED button** → a test SMS should hit the farmer's phone.
- Watch for `[call] dial accepted` vs `REJECTED` — tells us if this A7670G unit
  can place voice calls (if rejected, alerts still SMS; we add a server call).

## 6. Confirm data reached the cloud
On any computer:
```
curl -H "Authorization: Bearer de94e8a0d571dbeb0cdc1430a95927b95a24c42ad2bda05c" \
     http://134.209.242.192:8080/api/devices/DEV01/latest
```
You should get live JSON: `{"temp_c":..,"humidity":..,"co2_ppm":..,"battery":..}`.
(NH₃ will read 0 until the sensor is fitted.)

## 7. If it won't connect
- **No `attached=1`:** weak signal or wrong SIM state → external antenna, check
  the SIM has credit + data enabled, try another operator.
- **GPRS fails:** the APN auto-picks by operator; if your SIM reports an unusual
  operator name, set `FILAHA_APN` manually (`internet` Mobilis/Ooredoo,
  `djezzy.internet` Djezzy) and `FILAHA_APN_AUTO 0`.
- **Nothing on the monitor:** wrong baud (use 115200) or wrong COM port.

---

### Packet format (for reference)
8 bytes, big-endian: `[temp int16 ×10][hum uint8][co2 uint16][nh3 uint16 ×100][bat uint8]`.
The server restores the decimals (temp ÷10, nh3 ÷100) and timestamps on arrival.
