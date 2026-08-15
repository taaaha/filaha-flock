#include "config.h"

// TINY_GSM_MODEM_SIM7600 is defined in platformio.ini build_flags.
#include <TinyGsmClient.h>
#include <StreamDebugger.h>
#include "esp_task_wdt.h"
#include "esp_system.h"

#include "modem.h"

#define MODEM_SERIAL Serial1

#if FILAHA_MODEM_DEBUG
  static StreamDebugger debugger(MODEM_SERIAL, Serial);
  static TinyGsm modem(debugger);
#else
  static TinyGsm modem(MODEM_SERIAL);
#endif

static bool          s_attached      = false;
static unsigned long s_last_check_ms = 0;
static int           s_rssi_raw      = 0;

static const char* reset_reason_str(esp_reset_reason_t r) {
  switch (r) {
    case ESP_RST_POWERON:  return "power-on";
    case ESP_RST_BROWNOUT: return "BROWNOUT (weak power supply — check charger/battery)";
    case ESP_RST_TASK_WDT:
    case ESP_RST_INT_WDT:
    case ESP_RST_WDT:      return "watchdog (loop stalled, e.g. modem stuck)";
    case ESP_RST_PANIC:    return "software panic/crash";
    case ESP_RST_SW:       return "software restart (ESP.restart())";
    case ESP_RST_DEEPSLEEP: return "woke from deep sleep";
    default:                return "other";
  }
}

// Loop that waits for network registration without ever blocking the hardware
// watchdog: it polls isNetworkConnected() itself (rather than one opaque
// library call) so we can feed the watchdog and log progress every few
// seconds. Returns true once registered, false if `budget_ms` runs out.
static bool wait_registered(unsigned long budget_ms) {
  const unsigned long start = millis();
  unsigned long last_log = 0;
  while (millis() - start < budget_ms) {
    esp_task_wdt_reset();
    if (modem.isNetworkConnected()) return true;
    if (millis() - last_log > 8000UL) {
      last_log = millis();
      const int q = modem.getSignalQuality();
      Serial.printf("[modem] still registering… CSQ=%d op=%s\n", q, modem.getOperator().c_str());
    }
    delay(600);
  }
  return false;
}

static void pulse_pwrkey() {
  // SIMCom A7670G: hold PWRKEY low for ~1 s to power on/off.
  pinMode(MODEM_PWRKEY, OUTPUT);
  digitalWrite(MODEM_PWRKEY, LOW);
  delay(100);
  digitalWrite(MODEM_PWRKEY, HIGH);
  delay(1000);
  digitalWrite(MODEM_PWRKEY, LOW);
}

bool modem_begin() {
  Serial.printf("[boot] reset reason: %s\n", reset_reason_str(esp_reset_reason()));
  Serial.println("[modem] enabling power rail…");
  pinMode(MODEM_POWER_ON, OUTPUT);
  digitalWrite(MODEM_POWER_ON, HIGH);
  delay(500);

  MODEM_SERIAL.begin(MODEM_BAUD, SERIAL_8N1, MODEM_RX, MODEM_TX);
  delay(300);

  // The modem usually survives an ESP32 reset still powered ON. A blind PWRKEY
  // pulse would then toggle a running modem OFF (→ no AT response, the exact
  // "init failed" we saw). So probe first and only power-cycle if it's asleep.
  if (modem.testAT(1500)) {
    Serial.println("[modem] already awake");
  } else {
    Serial.println("[modem] no response — powering on…");
    pinMode(MODEM_RST, OUTPUT);
    digitalWrite(MODEM_RST, LOW);  delay(100);
    digitalWrite(MODEM_RST, HIGH); delay(2500);
    pulse_pwrkey();
    bool up = false;
    for (int i = 0; i < 15 && !up; i++) { delay(1000); up = modem.testAT(1000); }
    if (!up) Serial.println("[modem] still no AT after power-on — check modem power/USB supply");
  }

  Serial.println("[modem] init…");
  if (!modem.init()) {
    Serial.println("[modem] init failed — trying restart()");
    if (!modem.restart()) {
      Serial.println("[modem] restart failed");
      return false;
    }
  }

  Serial.print("[modem] info: "); Serial.println(modem.getModemInfo());

  // Unlock the SIM if a PIN is configured.
  if (sizeof(FILAHA_SIM_PIN) > 1) {
    Serial.println("[modem] unlocking SIM…");
    if (!modem.simUnlock(FILAHA_SIM_PIN)) {
      Serial.println("[modem] SIM unlock FAILED — wrong PIN?");
    }
  }

  // SMS text mode + GSM 7-bit charset (our payload is ASCII).
  modem.sendAT(GF("+CMGF=1"));   modem.waitResponse();
  modem.sendAT(GF("+CSCS=\"GSM\""));   modem.waitResponse();

  // Let the modem use ANY available radio (2G/3G/4G) and auto-pick the best.
  // 2 = automatic RAT. We deliberately never force a single RAT (e.g.
  // GSM-only): some Algerian SIMs/plans have 2G DATA disabled by the carrier
  // even though 2G voice/SMS still works, so forcing 2G-only can turn a SIM
  // that would have registered fine on auto into one that NEVER gets data —
  // this was traced as the cause of a real field failure on a Mobilis SIM.
  modem.sendAT(GF("+CNMP=2"));   modem.waitResponse();
  // Report the operator numerically (MCC-MNC) so APN auto-detection (net.cpp)
  // gets a reliable value instead of depending on whichever format the tower
  // happened to hand back.
  modem.sendAT(GF("+COPS=3,2")); modem.waitResponse();

  // Print signal so we can tell "no coverage" from a SIM/band problem.
  {
    int q = modem.getSignalQuality();
    Serial.printf("[modem] signal CSQ=%d  (%d dBm)\n",
                  q, (q == 99 ? 0 : -113 + 2 * q));
  }

  Serial.println("[modem] waiting for network registration (up to 90 s)…");
  bool registered = wait_registered(90000UL);
  if (!registered) {
    // Auto RAT didn't camp in time — a soft radio restart (fresh cell scan)
    // clears a surprising number of "stuck" registrations, and costs far
    // less than jumping to a different network mode we haven't verified the
    // SIM supports.
    Serial.println("[modem] registration timed out — soft radio restart, retrying once…");
    modem.sendAT(GF("+CFUN=1,1"));                    // full module reset (per 3GPP TS 27.007)
    delay(3000);
    for (int i = 0; i < 20 && !modem.testAT(1000); i++) { esp_task_wdt_reset(); delay(500); }
    // CFUN=1,1 resets the module, so re-apply everything modem_begin() had
    // already configured — not just the radio mode.
    modem.sendAT(GF("+CMGF=1"));        modem.waitResponse();
    modem.sendAT(GF("+CSCS=\"GSM\""));  modem.waitResponse();
    modem.sendAT(GF("+CNMP=2"));        modem.waitResponse();
    modem.sendAT(GF("+COPS=3,2"));      modem.waitResponse();
    registered = wait_registered(90000UL);
  }
  if (!registered) {
    Serial.println("[modem] network attach failed after retry — will keep trying in modem_loop()");
  }
  s_attached = registered && modem.isNetworkConnected();
  Serial.printf("[modem] attached=%d  operator=%s\n",
                (int)s_attached, modem.getOperator().c_str());
  return s_attached;
}

bool modem_is_network_attached() { return s_attached; }

TinyGsm& modem_instance() { return modem; }

size_t modem_write_raw(const uint8_t* buf, size_t len) {
  return MODEM_SERIAL.write(buf, len);
}

bool modem_recover() {
  Serial.println("[modem] recover: soft restart…");
  s_attached = false;
  if (modem.restart()) {
    // Re-apply SMS mode + radio mode after a restart (some of these are
    // volatile across a soft restart on this module).
    modem.sendAT(GF("+CMGF=1"));         modem.waitResponse();
    modem.sendAT(GF("+CSCS=\"GSM\""));   modem.waitResponse();
    modem.sendAT(GF("+CNMP=2"));         modem.waitResponse();
    modem.sendAT(GF("+COPS=3,2"));       modem.waitResponse();
    if (wait_registered(60000UL)) {
      s_attached = modem.isNetworkConnected();
      Serial.printf("[modem] recover OK (soft), attached=%d\n", (int)s_attached);
      if (s_attached) return true;
    }
  }
  // Soft restart didn't bring the network back — hard power-cycle + full init.
  Serial.println("[modem] recover: hard power-cycle…");
  pulse_pwrkey();
  delay(3000);
  return modem_begin();
}

bool modem_place_call(const char* number, unsigned long ring_ms) {
  if (!s_attached) {
    s_attached = modem.isNetworkConnected();
    if (!s_attached) { Serial.println("[call] skipped — not attached"); return false; }
  }
  // ATD<number>;  — the trailing ';' requests a VOICE call (not data).
  Serial.printf("[call] dialing %s …\n", number);
  modem.sendAT(String("D") + number + ";");
  const bool ok = (modem.waitResponse(15000UL) == 1);
  Serial.printf("[call] dial %s\n", ok ? "accepted" : "REJECTED (module may be data-only)");
  if (ok) {
    delay(ring_ms);                 // let it ring so the farmer notices
    modem.sendAT("H");              // ATH — hang up; the missed call is the alert
    modem.waitResponse(5000UL);
  }
  return ok;
}

bool modem_send_sms(const char* number, const String& body) {
  if (!s_attached) {
    // Try a quick re-attach before giving up — networks drop and come back.
    s_attached = modem.isNetworkConnected();
    if (!s_attached) {
      Serial.println("[sms] skipped — not attached");
      return false;
    }
  }
  Serial.printf("[sms] → %s  body=%s\n", number, body.c_str());
  const bool ok = modem.sendSMS(number, body);
  Serial.printf("[sms] result: %s\n", ok ? "OK" : "FAIL");
  return ok;
}

void modem_loop() {
  // Cheap state refresh every 30 s — keeps `attached` and `rssi` truthful
  // without spamming AT.
  const unsigned long now = millis();
  if (now - s_last_check_ms < 30000UL) return;
  s_last_check_ms = now;

  s_rssi_raw = modem.getSignalQuality();
  s_attached = modem.isNetworkConnected();
  // Log signal so the installer can judge reception at the coop. On very weak
  // 2G (rssi worse than about -105 dBm) recommend an external antenna.
  Serial.printf("[modem] attached=%d  rssi=%ddBm  op=%s\n",
                (int)s_attached, modem_rssi_dbm(), modem.getOperator().c_str());
}

int modem_rssi_dbm() {
  // CSQ→dBm:  dBm = -113 + 2*csq, valid csq is 0..31 (99 means unknown).
  if (s_rssi_raw <= 0 || s_rssi_raw == 99) return 0;
  return -113 + 2 * s_rssi_raw;
}
