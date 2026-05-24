#include "config.h"

// TINY_GSM_MODEM_SIM7600 is defined in platformio.ini build_flags.
#include <TinyGsmClient.h>
#include <StreamDebugger.h>

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
  Serial.println("[modem] enabling power rail…");
  pinMode(MODEM_POWER_ON, OUTPUT);
  digitalWrite(MODEM_POWER_ON, HIGH);
  delay(500);

  // Optional hard reset (some R2 boards wire RST; harmless if not present).
  pinMode(MODEM_RST, OUTPUT);
  digitalWrite(MODEM_RST, LOW);
  delay(100);
  digitalWrite(MODEM_RST, HIGH);
  delay(2500);

  pulse_pwrkey();

  MODEM_SERIAL.begin(MODEM_BAUD, SERIAL_8N1, MODEM_RX, MODEM_TX);
  delay(3000);

  Serial.println("[modem] init…");
  if (!modem.init()) {
    Serial.println("[modem] init failed — trying restart()");
    if (!modem.restart()) {
      Serial.println("[modem] restart failed");
      return false;
    }
  }

  Serial.print("[modem] info: "); Serial.println(modem.getModemInfo());

  // SMS text mode + GSM 7-bit charset (our payload is ASCII).
  modem.sendAT(GF("+CMGF=1"));   modem.waitResponse();
  modem.sendAT(GF("+CSCS=\"GSM\""));   modem.waitResponse();

  Serial.println("[modem] waiting for network registration (up to 60 s)…");
  if (!modem.waitForNetwork(60000UL)) {
    Serial.println("[modem] network attach timed out");
    return false;
  }
  s_attached = modem.isNetworkConnected();
  Serial.printf("[modem] attached=%d  operator=%s\n",
                (int)s_attached, modem.getOperator().c_str());
  return s_attached;
}

bool modem_is_network_attached() { return s_attached; }

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
}

int modem_rssi_dbm() {
  // CSQ→dBm:  dBm = -113 + 2*csq, valid csq is 0..31 (99 means unknown).
  if (s_rssi_raw <= 0 || s_rssi_raw == 99) return 0;
  return -113 + 2 * s_rssi_raw;
}
