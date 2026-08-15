#include "config.h"
#include <TinyGsmClient.h>
#include <string.h>
#include "modem.h"
#include "net.h"

// ════════════════════════════════════════════════════════════════════
//  MQTT over the A7670's NATIVE engine (AT+CMQTT*).
//  We deliberately do NOT use TinyGSM's raw TCP socket + PubSubClient:
//  on this modem the socket read path fails to surface the CONNACK bytes
//  (the broker accepts the client but the driver never reads the reply,
//  so PubSubClient times out). The A7670's built-in MQTT stack handles
//  the CONNECT/CONNACK and keep-alive itself and is rock-solid on 2G.
// ════════════════════════════════════════════════════════════════════

static bool          s_started    = false;   // AT+CMQTTSTART done (service up)
static bool          s_conn       = false;   // broker connected
static unsigned long s_last_try_ms = 0;
static int           s_fail_count  = 0;

// ── Store-and-forward ring buffer ─────────────────────────────────
static uint8_t s_buf[NET_BUFFER_SLOTS][8];
static int     s_head  = 0;
static int     s_count = 0;

static void buf_push(const uint8_t* d) {
  const int idx = (s_head + s_count) % NET_BUFFER_SLOTS;
  if (s_count >= NET_BUFFER_SLOTS) {
    s_head = (s_head + 1) % NET_BUFFER_SLOTS;   // full → overwrite the oldest
  } else {
    s_count++;
  }
  memcpy(s_buf[idx], d, 8);
}

// ── APN selection — auto-detect the Algerian operator ─────────────
// getOperator() can return EITHER the alpha name ("Djezzy") or the numeric
// MCC-MNC ("60302") depending on what format the modem last negotiated with
// the tower — we never controlled that, so a plain alpha substring match
// (the old code) silently never fired for a numeric reply and every SIM fell
// through to the same default. Handle both forms explicitly.
//   Algeria (MCC 603): 60301 Mobilis · 60302 Djezzy · 60303 Ooredoo
static const char* pick_apn() {
#if FILAHA_APN_AUTO
  String op = modem_instance().getOperator();
  op.toLowerCase();
  const bool isDjezzy =
    op.indexOf("djezzy") >= 0 || op.indexOf("optimum") >= 0 || op.indexOf("ota") >= 0 ||
    op.indexOf("60302") >= 0;
  if (isDjezzy) return "djezzy.internet";
  if (op.length() > 0) return "internet";       // Mobilis (60301) + Ooredoo (60303)
#endif
  return FILAHA_APN;                             // configured fallback
}

static bool try_gprs(const char* apn) {
  Serial.printf("[net] GPRS connect  apn=\"%s\"  op=%s  rssi=%ddBm\n",
                apn, modem_instance().getOperator().c_str(), modem_rssi_dbm());
  return modem_instance().gprsConnect(apn, FILAHA_APN_USER, FILAHA_APN_PASS);
}

static bool ensure_gprs() {
  if (modem_instance().isGprsConnected()) return true;
  const char* primary = pick_apn();
  if (try_gprs(primary)) return true;
  // Some SIMs/carrier configs reject a named APN but accept a blank one
  // (the network supplies its own default). Cheap to try before giving up.
  if (strlen(primary) > 0) {
    Serial.println("[net] primary APN failed — retrying with blank APN…");
    if (try_gprs("")) return true;
  }
  return false;
}

// ── Native MQTT (AT+CMQTT*) ───────────────────────────────────────
static bool mqtt_connect() {
  if (!ensure_gprs()) return false;
  TinyGsm& m = modem_instance();
  const String cid = String("filaha-") + FILAHA_DEVICE_ID;

  // Bring the MQTT service up once (survives across reconnects; reset only
  // when the modem itself is recovered — see net_mark_modem_reset()).
  if (!s_started) {
    m.sendAT(GF("+CMQTTSTART"));
    m.waitResponse(12000UL, GF("+CMQTTSTART: 0"));   // OK or "already started" → continue
    s_started = true;
  }

  // Fresh client slot each attempt: disconnect a stale session first (a
  // half-open connection makes the modem answer "already connected", err 19),
  // then release the slot.
  m.sendAT(GF("+CMQTTDISC=0,60")); m.waitResponse(5000UL);
  m.sendAT(GF("+CMQTTREL=0"));     m.waitResponse(2000UL);
  m.sendAT(GF("+CMQTTACCQ=0,\""), cid, GF("\",0"));
  m.waitResponse(3000UL);

  // tcp://host:port , keepalive 90 s, clean session 1, username, password.
  m.sendAT(GF("+CMQTTCONNECT=0,\"tcp://"), FILAHA_MQTT_HOST, ':',
           (uint32_t)FILAHA_MQTT_PORT, GF("\",90,1,\""),
           FILAHA_MQTT_USER, GF("\",\""), FILAHA_MQTT_PASS, GF("\""));
  const int r = m.waitResponse(25000UL, GF("+CMQTTCONNECT: 0,0"));
  s_conn = (r == 1);
  Serial.printf("[net] MQTT %s (CMQTTCONNECT r=%d)\n", s_conn ? "OK" : "FAIL", r);
  return s_conn;
}

static bool mqtt_publish(const uint8_t* d) {
  TinyGsm& m = modem_instance();
  const String topic = String("filaha/") + FILAHA_DEVICE_ID + "/telemetry";

  m.sendAT(GF("+CMQTTTOPIC=0,"), (uint32_t)topic.length());
  if (m.waitResponse(5000UL, GF(">")) != 1) { s_conn = false; return false; }
  modem_write_raw((const uint8_t*)topic.c_str(), topic.length());
  if (m.waitResponse(5000UL) != 1) { s_conn = false; return false; }

  // Send the 8-byte packet HEX-encoded (16 ASCII chars). This modem rejects a
  // binary CMQTTPAYLOAD that contains 0x00 bytes (e.g. temperature high-byte);
  // the server decodes the hex back into the raw packet.
  char hex[17];
  for (int i = 0; i < 8; i++) sprintf(hex + i * 2, "%02x", d[i]);
  m.sendAT(GF("+CMQTTPAYLOAD=0,16"));
  if (m.waitResponse(5000UL, GF(">")) != 1) { s_conn = false; return false; }
  modem_write_raw((const uint8_t*)hex, 16);
  if (m.waitResponse(5000UL) != 1) { s_conn = false; return false; }

  m.sendAT(GF("+CMQTTPUB=0,1,60"));                 // QoS 1, 60 s pub timeout
  if (m.waitResponse(20000UL, GF("+CMQTTPUB: 0,0")) != 1) { s_conn = false; return false; }
  return true;
}

static void buf_flush() {
  while (s_count > 0 && s_conn) {
    if (!mqtt_publish(s_buf[s_head])) break;        // stop on first failure; retry later
    s_head = (s_head + 1) % NET_BUFFER_SLOTS;
    s_count--;
  }
}

// (Re)establish the link. On repeated failure, recover the modem itself.
static bool ensure_link() {
  if (s_conn) { s_fail_count = 0; return true; }
  if (mqtt_connect()) { s_fail_count = 0; return true; }
  if (++s_fail_count >= NET_RECOVER_AFTER_FAILS) {
    Serial.println("[net] repeated failures — recovering modem…");
    modem_recover();
    s_started = false;                              // CMQTT service is gone after a modem reset
    s_conn    = false;
    s_fail_count = 0;
  }
  return false;
}

bool net_begin()     { return ensure_link(); }
bool net_connected() { return s_conn; }

void net_loop() {
  if (s_conn) {
    if (s_count > 0) buf_flush();                   // opportunistically drain backlog
    return;
  }
  const unsigned long now = millis();
  if (now - s_last_try_ms < 5000UL) return;         // back off reconnect storms
  s_last_try_ms = now;
  if (ensure_link()) buf_flush();
}

bool net_publish(const uint8_t* data, size_t len) {
  (void) len;                                        // always 8 bytes
  buf_push(data);                                    // queue first — never lose a reading
  if (!s_conn && !ensure_link()) {
    Serial.printf("[net] offline — buffered  (queue %d/%d)\n", s_count, NET_BUFFER_SLOTS);
    return false;
  }
  buf_flush();                                       // this packet + any backlog, oldest first
  const bool clear = (s_count == 0);
  Serial.printf("[net] publish %s  (queue %d)\n", clear ? "OK" : "PARTIAL", s_count);
  return clear;
}

void net_publish_event(const char* kind) {
  if (!s_conn) {
    Serial.printf("[net] event \"%s\" skipped — no link (SMS/call lifeline still fires)\n", kind);
    return;
  }
  TinyGsm& m = modem_instance();
  const String topic = String("filaha/") + FILAHA_DEVICE_ID + "/event";
  const size_t klen = strlen(kind);

  m.sendAT(GF("+CMQTTTOPIC=0,"), (uint32_t)topic.length());
  if (m.waitResponse(4000UL, GF(">")) != 1) { s_conn = false; return; }
  modem_write_raw((const uint8_t*)topic.c_str(), topic.length());
  if (m.waitResponse(4000UL) != 1) { s_conn = false; return; }

  m.sendAT(GF("+CMQTTPAYLOAD=0,"), (uint32_t)klen);
  if (m.waitResponse(4000UL, GF(">")) != 1) { s_conn = false; return; }
  modem_write_raw((const uint8_t*)kind, klen);
  if (m.waitResponse(4000UL) != 1) { s_conn = false; return; }

  m.sendAT(GF("+CMQTTPUB=0,1,20"));
  const int r = m.waitResponse(8000UL, GF("+CMQTTPUB: 0,0"));
  Serial.printf("[net] event \"%s\" %s\n", kind, r == 1 ? "sent" : "failed");
}

bool net_get_clock(int& hour_out, long& day_key_out) {
  int year = 0, month = 0, day = 0, hr = 0, mn = 0, sec = 0;
  float tz = 0;
  if (!modem_instance().getNetworkTime(&year, &month, &day, &hr, &mn, &sec, &tz)) return false;
  if (year < 2024) return false;                     // not yet synced by the network
  hour_out    = hr;
  day_key_out = (long)year * 10000L + (long)month * 100L + (long)day;
  return true;
}
