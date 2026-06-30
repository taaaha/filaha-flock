#!/usr/bin/env bash
# One-time setup: creates .env with strong secrets and the MQTT password file.
# Run this BEFORE `docker compose up -d`.
set -euo pipefail
cd "$(dirname "$0")"

rand() { openssl rand -hex 24; }

# ---- .env ----
if [ ! -f .env ]; then
  DB_PASSWORD=$(rand); MQTT_API_PASS=$(rand); API_TOKEN=$(rand)
  cat > .env <<EOF
DB_USER=filaha
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=filaha
MQTT_API_USER=server
MQTT_API_PASS=${MQTT_API_PASS}
API_TOKEN=${API_TOKEN}
EXPO_PUSH_ENABLED=false
EOF
  echo "Created .env with fresh secrets."
else
  echo ".env already exists — leaving it."
fi
source .env

# ---- MQTT password file ----
# Users: 'server' (the API) and one per device. Device user = device_id.
DEVICE_ID="${1:-DEV01}"
DEVICE_PASS="${2:-$(rand)}"

touch mqtt/passwd
docker run --rm -v "$(pwd)/mqtt:/m" eclipse-mosquitto:2.0 \
  mosquitto_passwd -b /m/passwd "${MQTT_API_USER}" "${MQTT_API_PASS}"
docker run --rm -v "$(pwd)/mqtt:/m" eclipse-mosquitto:2.0 \
  mosquitto_passwd -b /m/passwd "${DEVICE_ID}" "${DEVICE_PASS}"

echo
echo "MQTT users created: ${MQTT_API_USER} (api) and ${DEVICE_ID} (device)."
echo "  >> Flash this into firmware config.h:"
echo "     MQTT_USER = \"${DEVICE_ID}\""
echo "     MQTT_PASS = \"${DEVICE_PASS}\""
echo "  >> Put this in the mobile app .env:  API_TOKEN = ${API_TOKEN}"
echo
echo "Next:  docker compose up -d"
