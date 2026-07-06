#include "config.h"
#include <TinyGsmClient.h>
#include <PubSubClient.h>
#include <string.h>
#include "modem.h"
#include "net.h"

// Reuse the one modem owned by modem.cpp.
static TinyGsmClient s_tcp(modem_instance());
static PubSubClient  s_mqtt(s_tcp);
static unsigned long s_last_try_ms = 0;
static int           s_fail_count  = 0;

// ── Store-and-forward ring buffer ─────────────────────────────────
// Every reading is queued here first. When the link is up we flush the whole
// backlog oldest-first, so a blackout of up to NET_BUFFER_SLOTS minutes loses
// nothing. When full, the oldest reading is dropped (bounded RAM).
// NOTE: buffered packets are timestamped by the server at *arrival*, so data
// held through an outage lands clustered at reconnect — acceptable, and far
// better than losing it. (A timestamped packet is a later upgrade.)
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

static bool raw_publish(const uint8_t* d) {
  const String topic = String("filaha/") + FILAHA_DEVICE_ID + "/telemetry";
  return s_mqtt.publish(topic.c_str(), d, 8, /*retained=*/false);
}

static void buf_flush() {
  while (s_count > 0 && s_mqtt.connected()) {
    if (!raw_publish(s_buf[s_head])) break;     // stop on first failure; retry later
    s_head = (s_head + 1) % NET_BUFFER_SLOTS;
    s_count--;
  }
}

// ── APN selection — auto-detect the Algerian operator ─────────────
static const char* pick_apn() {
#if FILAHA_APN_AUTO
  String op = modem_instance().getOperator();
  op.toLowerCase();
  if (op.indexOf("djezzy") >= 0 || op.indexOf("optimum") >= 0 || op.indexOf("ota") >= 0)
    return "djezzy.internet";
  if (op.length() > 0) return "internet";       // Mobilis + Ooredoo both use "internet"
#endif
  return FILAHA_APN;                             // configured fallback
}

static bool ensure_gprs() {
  if (modem_instance().isGprsConnected()) return true;
  const char* apn = pick_apn();
  Serial.printf("[net] GPRS connect  apn=%s  op=%s  rssi=%ddBm\n",
                apn, modem_instance().getOperator().c_str(), modem_rssi_dbm());
  return modem_instance().gprsConnect(apn, FILAHA_APN_USER, FILAHA_APN_PASS);
}

static bool mqtt_connect() {
  if (!ensure_gprs()) return false;
  s_mqtt.setServer(FILAHA_MQTT_HOST, FILAHA_MQTT_PORT);
  s_mqtt.setKeepAlive(90);
  s_mqtt.setSocketTimeout(20);
  const String cid = String("filaha-") + FILAHA_DEVICE_ID;
  const bool ok = s_mqtt.connect(cid.c_str(), FILAHA_MQTT_USER, FILAHA_MQTT_PASS);
  Serial.printf("[net] MQTT %s (state=%d)\n", ok ? "OK" : "FAIL", s_mqtt.state());
  return ok;
}

// (Re)establish the link. On repeated failure, recover the modem itself.
static bool ensure_link() {
  if (s_mqtt.connected()) { s_fail_count = 0; return true; }
  if (mqtt_connect())     { s_fail_count = 0; return true; }
  if (++s_fail_count >= NET_RECOVER_AFTER_FAILS) {
    Serial.println("[net] repeated failures — recovering modem…");
    modem_recover();
    s_fail_count = 0;
  }
  return false;
}

bool net_begin()     { return ensure_link(); }
bool net_connected() { return s_mqtt.connected(); }

void net_loop() {
  if (s_mqtt.connected()) {
    s_mqtt.loop();
    if (s_count > 0) buf_flush();               // opportunistically drain backlog
    return;
  }
  const unsigned long now = millis();
  if (now - s_last_try_ms < 10000UL) return;    // back off reconnect storms
  s_last_try_ms = now;
  if (ensure_link()) buf_flush();
}

bool net_publish(const uint8_t* data, size_t len) {
  (void) len;                                    // always 8 bytes
  buf_push(data);                                // queue first — never lose a reading
  if (!s_mqtt.connected() && !ensure_link()) {
    Serial.printf("[net] offline — buffered  (queue %d/%d)\n", s_count, NET_BUFFER_SLOTS);
    return false;
  }
  buf_flush();                                   // this packet + any backlog, oldest first
  const bool clear = (s_count == 0);
  Serial.printf("[net] publish %s  (queue %d)\n", clear ? "OK" : "PARTIAL", s_count);
  return clear;
}

bool net_get_clock(int& hour_out, long& day_key_out) {
  int year = 0, month = 0, day = 0, hr = 0, mn = 0, sec = 0;
  float tz = 0;
  if (!modem_instance().getNetworkTime(&year, &month, &day, &hr, &mn, &sec, &tz)) return false;
  if (year < 2024) return false;                 // not yet synced by the network
  hour_out    = hr;
  day_key_out = (long)year * 10000L + (long)month * 100L + (long)day;
  return true;
}
