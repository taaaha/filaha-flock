#include <Arduino.h>
#include <string.h>
#include "config.h"
#include "modem.h"
#include "limits.h"
#include "smscmd.h"

#if FILAHA_SMS_COMMANDS

// Compare phone numbers by their last digits, so "+213781103304",
// "00213781103304" and "0781103304" all match.
static bool same_number(const char* a, const char* b) {
  char da[28], db[28];
  size_t la = 0, lb = 0;
  for (const char* p = a; *p && la < sizeof(da) - 1; ++p) if (*p >= '0' && *p <= '9') da[la++] = *p;
  for (const char* p = b; *p && lb < sizeof(db) - 1; ++p) if (*p >= '0' && *p <= '9') db[lb++] = *p;
  da[la] = 0; db[lb] = 0;
  if (la < 7 || lb < 7) return false;
  size_t n = la < lb ? la : lb;
  if (n > 9) n = 9;
  return strcmp(da + la - n, db + lb - n) == 0;
}

static bool authorised(const char* from) {
  if (same_number(from, FILAHA_FARMER_NUMBER)) return true;
  if (FILAHA_ADMIN_NUMBER[0] && same_number(from, FILAHA_ADMIN_NUMBER)) return true;
  return false;
}

bool smscmd_tick(bool outbox_busy) {
  static unsigned long next_ms = 0;
  const unsigned long now = millis();
  if ((long)(now - next_ms) < 0) return false;
  next_ms = now + SMS_POLL_MS;

  if (outbox_busy || !modem_is_network_attached()) return false;

  InboundSms in[3];
  const int n = modem_poll_sms(in, 3);
  bool changed = false;

  for (int i = 0; i < n; i++) {
    if (!authorised(in[i].from)) {
      // Silent: replying to strangers would turn the box into an SMS relay.
      Serial.printf("[cmd] ignored a text from %s\n", in[i].from);
      continue;
    }

    Serial.printf("[cmd] from the farmer: %s\n", in[i].body);

    Limits L = limits_get();
    char err[64];
    const LimCmd cmd = limits_parse(in[i].body, L, err, sizeof err);

    char cur[56], msg[161];
    switch (cmd) {
      case LC_NONE:
        continue;                                   // blank text: nothing to answer

      case LC_QUERY:
        limits_format(limits_get(), cur, sizeof cur);
        snprintf(msg, sizeof msg, "Filaha %s limits: %s", FILAHA_DEVICE_ID, cur);
        break;

      case LC_RESET:
        limits_reset();
        changed = true;
        limits_format(limits_get(), cur, sizeof cur);
        snprintf(msg, sizeof msg, "Filaha %s back to defaults: %s", FILAHA_DEVICE_ID, cur);
        break;

      case LC_SET:
        if (limits_set(L)) {
          changed = true;
          limits_format(limits_get(), cur, sizeof cur);
          snprintf(msg, sizeof msg, "Filaha %s OK: %s", FILAHA_DEVICE_ID, cur);
        } else {
          snprintf(msg, sizeof msg, "Filaha %s ERROR: could not save, nothing changed", FILAHA_DEVICE_ID);
        }
        break;

      case LC_ERROR:
      default:
        snprintf(msg, sizeof msg,
                 "Filaha %s ERROR: %s. Nothing changed. Example: T 20 32 H 40 75 C 2500 N 25 (or LIMITS, RESET)",
                 FILAHA_DEVICE_ID, err);
        break;
    }

    Serial.printf("[cmd] reply: %s\n", msg);
    modem_send_sms_ascii(in[i].from, msg);          // best effort: the limits are already saved
  }
  return changed;
}

#else
bool smscmd_tick(bool) { return false; }
#endif
