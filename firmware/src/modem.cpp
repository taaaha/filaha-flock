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

// True if the modem answers AT at all. Three tries, because one missed
// reply during a busy scan is normal; three in a row is not.
static bool modem_responsive() {
  for (int i = 0; i < 3; i++) {
    if (modem.testAT(1200)) return true;
    esp_task_wdt_reset();
    delay(300);
  }
  return false;
}

// Wait for network registration without ever starving the hardware watchdog,
// and - critically - notice if the MODEM ITSELF dies. A SIMCom radio draws up
// to ~2 A in transmit bursts; on a weak supply it browns out and stops
// answering AT entirely, and every command after that goes into the void.
// Detecting that is the difference between a one-line diagnosis and a
// five-minute mystery.
static bool wait_registered(unsigned long budget_ms) {
  const unsigned long start = millis();
  unsigned long last_log = 0;
  int silent = 0;
  while (millis() - start < budget_ms) {
    esp_task_wdt_reset();
    if (modem.isNetworkConnected()) return true;
    if (millis() - last_log > 8000UL) {
      last_log = millis();
      if (!modem.testAT(1200)) {
        if (++silent >= 2) {
          Serial.println("[modem] *** MODEM STOPPED RESPONDING TO AT ***");
          Serial.println("[modem] almost always power: LiPo connected + charged?");
          Serial.println("[modem] supply able to deliver 2 A peaks? cable ok?");
          return false;
        }
        Serial.println("[modem] no AT reply - probing again...");
        continue;
      }
      silent = 0;
      // Fetch first, print second - these getters each issue AT commands, and
      // with the modem debugger enabled they would interleave mid-sentence.
      const int q = modem.getSignalQuality();
      const String op = modem.getOperator();
      Serial.print("[modem] still registering... CSQ=");
      Serial.print(q);
      Serial.print(" op=");
      Serial.println(op);
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

// Log what this radio can actually DO, and what it sees right now.
// AT+CNMP=? lists the radio modes this module supports: if 14 (WCDMA) is
// absent then the module has NO 3G at all, which settles once and for all
// whether a 3G-only cell is even reachable by this hardware. CSQ is a 2G/3G
// metric and reads 99 while on LTE, so CESQ (RSRP/RSRQ) is logged too.
static void log_radio_capabilities() {
  Serial.println("[modem] --- radio capability / current state ---");
  modem.sendAT(GF("+CNMP=?"));  modem.waitResponse(8000UL);   // supported modes
  modem.sendAT(GF("+CPSI?"));   modem.waitResponse(8000UL);   // current cell detail
  modem.sendAT(GF("+CESQ"));    modem.waitResponse(8000UL);   // LTE-aware signal
  Serial.println("[modem] -------------------------------------------");
}

// Pin ONE radio access technology, then wait for registration on it.
static bool try_rat(int mode, const char* label, unsigned long budget_ms) {
  Serial.print("[modem] trying radio mode ");
  Serial.print(mode);
  Serial.print(" - ");
  Serial.print(label);
  Serial.print(" - up to ");
  Serial.print(budget_ms / 1000UL);
  Serial.println(" s");
  modem.sendAT(GF("+CNMP="), mode);
  modem.waitResponse(10000UL);
  const bool ok = wait_registered(budget_ms);
  if (ok) {
    Serial.print("[modem] REGISTERED on ");
    Serial.println(label);
    modem.sendAT(GF("+CPSI?")); modem.waitResponse(5000UL);   // which cell + band won
  }
  return ok;
}

// Full network survey: every operator the radio can see, with its access
// technology. This is the measurement that settles the only question that
// matters in the field: is there genuinely no coverage here, or is there
// coverage on a technology this module cannot speak?
static void scan_visible_networks() {
  Serial.println("[modem] surveying ALL visible networks - up to 2 min, please wait");
  esp_task_wdt_reset();
  modem.sendAT(GF("+COPS=?"));
  modem.waitResponse(120000UL);
  esp_task_wdt_reset();
  Serial.println("[modem] survey done. AcT: 0=GSM(2G)  2=UTRAN(3G)  7=LTE(4G)");
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

  // Report the operator numerically (MCC-MNC) so APN auto-detection (net.cpp)
  // gets a reliable value regardless of the format the tower hands back.
  modem.sendAT(GF("+COPS=3,2")); modem.waitResponse();

  log_radio_capabilities();

  // Force all-technology scanning BEFORE the survey: CNMP persists across

  // reboots on this module, so a previous GSM-only run would otherwise leave

  // the survey blind to LTE and quietly under-report available networks.

  modem.sendAT(GF("+CNMP=2")); modem.waitResponse(10000UL);


  // Survey FIRST. One scan answers "is any network on air here at all?" in
  // about a minute, instead of only finding out after five minutes of
  // laddering. In the field this is also what tells an installer whether the
  // coop simply has no coverage.
  scan_visible_networks();

  // ── Registration ladder ────────────────────────────────────────────
  // Auto SHOULD find any network, but a SIMCom module will happily keep
  // re-scanning for LTE and never camp on a weak 2G cell - and weak rural 2G
  // is exactly the case this product exists for. So try auto, then pin each
  // radio explicitly. Each step is skipped if the modem has gone silent,
  // because talking to a dead modem proves nothing.
  bool registered = try_rat(2, "auto (any)", 45000UL);
  if (!registered && modem_responsive()) registered = try_rat(13, "GSM only (2G)", 45000UL);
  if (!registered && modem_responsive()) registered = try_rat(38, "LTE only (4G)", 45000UL);

  if (!registered && !modem_responsive()) {
    // The modem is wedged, not merely unregistered. CFUN=1,1 cannot help - it
    // needs the command interpreter alive. Cut the power to it instead.
    Serial.println("[modem] unresponsive - hard PWRKEY power-cycle");
    pulse_pwrkey();            // off
    delay(2000);
    pulse_pwrkey();            // on
    for (int i = 0; i < 40 && !modem.testAT(1000); i++) { esp_task_wdt_reset(); delay(500); }
    if (modem_responsive()) {
      Serial.println("[modem] modem came back after power-cycle");
      modem.init();
      modem.sendAT(GF("+CMGF=1"));        modem.waitResponse();
      modem.sendAT(GF("+CSCS=\"GSM\""));  modem.waitResponse();
      modem.sendAT(GF("+COPS=3,2"));      modem.waitResponse();
      registered = try_rat(2, "auto (after power-cycle)", 60000UL);
    } else {
      Serial.println("[modem] *** STILL DEAD after power-cycle ***");
      Serial.println("[modem] this is a POWER or HARDWARE fault, not a network one");
    }
  } else if (!registered) {
    // Modem alive but nothing camped: a full reset gives it one clean scan.
    Serial.println("[modem] alive but unregistered - full radio reset, one more pass");
    modem.sendAT(GF("+CFUN=1,1"));
    delay(5000);
    for (int i = 0; i < 60 && !modem.testAT(1000); i++) { esp_task_wdt_reset(); delay(500); }
    modem.sendAT(GF("+CMGF=1"));        modem.waitResponse();
    modem.sendAT(GF("+CSCS=\"GSM\""));  modem.waitResponse();
    modem.sendAT(GF("+COPS=3,2"));      modem.waitResponse();
    registered = try_rat(2, "auto (after reset)", 60000UL);
    if (!registered && modem_responsive()) registered = try_rat(13, "GSM only (after reset)", 45000UL);
  }

  if (!registered) {
    log_radio_capabilities();
    modem.sendAT(GF("+CNMP=2")); modem.waitResponse();   // leave it on auto
    Serial.println("[modem] network attach FAILED - modem_loop() keeps retrying");
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
