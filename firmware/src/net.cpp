#include "config.h"
#include <TinyGsmClient.h>
#include <PubSubClient.h>
#include "modem.h"
#include "net.h"

// Reuse the one modem owned by modem.cpp.
static TinyGsmClient s_tcp(modem_instance());
static PubSubClient  s_mqtt(s_tcp);
static unsigned long s_last_try_ms = 0;

static bool ensure_gprs() {
  if (modem_instance().isGprsConnected()) return true;
  Serial.printf("[net] GPRS connect (apn=%s)…\n", FILAHA_APN);
  const bool ok = modem_instance().gprsConnect(FILAHA_APN, FILAHA_APN_USER, FILAHA_APN_PASS);
  Serial.printf("[net] GPRS %s\n", ok ? "OK" : "FAIL");
  return ok;
}

static bool mqtt_connect() {
  if (!ensure_gprs()) return false;
  s_mqtt.setServer(FILAHA_MQTT_HOST, FILAHA_MQTT_PORT);
  s_mqtt.setKeepAlive(90);
  s_mqtt.setSocketTimeout(20);
  const String cid = String("filaha-") + FILAHA_DEVICE_ID;
  Serial.printf("[net] MQTT connect to %s:%d…\n", FILAHA_MQTT_HOST, FILAHA_MQTT_PORT);
  const bool ok = s_mqtt.connect(cid.c_str(), FILAHA_MQTT_USER, FILAHA_MQTT_PASS);
  Serial.printf("[net] MQTT %s (state=%d)\n", ok ? "OK" : "FAIL", s_mqtt.state());
  return ok;
}

bool net_begin()      { return mqtt_connect(); }
bool net_connected()  { return s_mqtt.connected(); }

void net_loop() {
  if (s_mqtt.connected()) { s_mqtt.loop(); return; }
  const unsigned long now = millis();
  if (now - s_last_try_ms < 10000UL) return;   // back off reconnects
  s_last_try_ms = now;
  mqtt_connect();
}

bool net_publish(const uint8_t* data, size_t len) {
  if (!s_mqtt.connected() && !mqtt_connect()) {
    Serial.println("[net] publish skipped — no MQTT");
    return false;
  }
  const String topic = String("filaha/") + FILAHA_DEVICE_ID + "/telemetry";
  const bool ok = s_mqtt.publish(topic.c_str(), data, (unsigned int)len, /*retained=*/false);
  Serial.printf("[net] publish %s (%u bytes) -> %s\n", ok ? "OK" : "FAIL",
                (unsigned)len, topic.c_str());
  return ok;
}

bool net_get_clock(int& hour_out, long& day_key_out) {
  int year = 0, month = 0, day = 0, hr = 0, mn = 0, sec = 0;
  float tz = 0;
  if (!modem_instance().getNetworkTime(&year, &month, &day, &hr, &mn, &sec, &tz)) return false;
  if (year < 2024) return false;     // not yet synced by the network
  hour_out    = hr;
  day_key_out = (long)year * 10000L + (long)month * 100L + (long)day;
  return true;
}
