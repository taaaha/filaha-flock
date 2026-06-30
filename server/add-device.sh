#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Onboard a new Filaha device: create its MQTT credential, optionally
# register the owner in the database, and print the exact values to flash
# into firmware/src/config.h.
#
# Usage:
#   ./add-device.sh DEV02
#   ./add-device.sh DEV02 +213541787699 "Poulailler Nord" "Setif"
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env ] && set -a && . ./.env && set +a

DEVICE_ID="${1:?usage: ./add-device.sh DEVICE_ID [owner_phone] [label] [wilaya]}"
OWNER_PHONE="${2:-}"
LABEL="${3:-}"
WILAYA="${4:-}"

PASS="$(openssl rand -hex 24)"

# 1) MQTT credential — username MUST equal the device id.
docker run --rm -v "$(pwd)/mqtt:/m" eclipse-mosquitto:2.0 \
  mosquitto_passwd -b /m/passwd "$DEVICE_ID" "$PASS"

# Reload the broker so the new user works, without dropping live devices.
docker compose kill -s HUP mqtt >/dev/null 2>&1 || docker compose restart mqtt >/dev/null

# 2) Optional: store owner info (the device auto-appears on first packet anyway).
if [ -n "${OWNER_PHONE}${LABEL}${WILAYA}" ]; then
  docker compose exec -T db psql -U "${DB_USER:-filaha}" -d "${DB_NAME:-filaha}" -c \
    "INSERT INTO devices(device_id,label,owner_phone,wilaya)
     VALUES ('$DEVICE_ID','$LABEL','$OWNER_PHONE','$WILAYA')
     ON CONFLICT (device_id) DO UPDATE
       SET label=EXCLUDED.label, owner_phone=EXCLUDED.owner_phone, wilaya=EXCLUDED.wilaya;" >/dev/null
fi

echo
echo "===================================================================="
echo " Device '$DEVICE_ID' is ready on the server."
echo " Flash these into firmware/src/config.h, then build + flash the unit:"
echo "--------------------------------------------------------------------"
echo "   #define FILAHA_DEVICE_ID      \"$DEVICE_ID\""
echo "   #define FILAHA_MQTT_PASS      \"$PASS\""
[ -n "$OWNER_PHONE" ] && echo "   #define FILAHA_FARMER_NUMBER  \"$OWNER_PHONE\""
echo "   (FILAHA_MQTT_HOST, FILAHA_MQTT_USER=device id, and FILAHA_APN"
echo "    stay the same as your first unit.)"
echo "===================================================================="
