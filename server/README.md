# Filaha Flock — Cloud Backend

MQTT ingest + TimescaleDB + REST API for the new data architecture.

```
device ──(2G data, MQTT, 8-byte packet)──▶ Mosquitto ──▶ Node ingest ──▶ TimescaleDB
                                                              │
mobile app ◀──(REST, Bearer token)───────────────────────────┘
device ──(SMS + call, emergencies only)──▶ farmer's phone   (bypasses all of this)
```

## What runs
| Service | Image | Port | Purpose |
|---|---|---|---|
| `mqtt` | eclipse-mosquitto:2 | 1883 | devices publish `filaha/<id>/telemetry` |
| `db`   | timescaledb (pg16)  | — | time-series store (not exposed) |
| `api`  | node:20 (built)     | 8080 | ingest worker + REST API for the app |

## 1. Prerequisites (any Linux VPS — Hetzner CX22 / DigitalOcean basic is plenty)
```bash
# Docker + compose
curl -fsSL https://get.docker.com | sh
# open the two ports
sudo ufw allow 1883/tcp && sudo ufw allow 8080/tcp && sudo ufw enable
```

## 2. Configure + boot
```bash
cd server
chmod +x setup.sh
./setup.sh DEV01            # creates .env (secrets) + MQTT users (server + device DEV01)
#   ^ prints the device MQTT password and the app API_TOKEN — copy both.
docker compose up -d
docker compose logs -f api  # watch packets land
```

## 3. Wire the device (firmware/src/config.h)
```c
#define FILAHA_MQTT_HOST  "203.0.113.10"     // your VPS IP or domain
#define FILAHA_MQTT_USER  FILAHA_DEVICE_ID   // = "DEV01"
#define FILAHA_MQTT_PASS  "<printed by setup.sh>"
#define FILAHA_APN        "internet"         // Mobilis/Ooredoo; Djezzy = "djezzy"
```

## 4. Wire the app (build-time env, no native rebuild)
```
EXPO_PUBLIC_API_URL=http://203.0.113.10:8080
EXPO_PUBLIC_API_TOKEN=<API_TOKEN printed by setup.sh>
```

## 5. Verify end to end
```bash
# latest reading for a device (replace TOKEN)
curl -H "Authorization: Bearer $API_TOKEN" http://localhost:8080/api/devices/DEV01/latest
# raw inspect
docker compose exec db psql -U filaha -d filaha -c \
  "SELECT ts,temp_c,humidity,co2_ppm,nh3_ppm FROM readings ORDER BY ts DESC LIMIT 5;"
```

## REST API
All `/api/*` require `Authorization: Bearer <API_TOKEN>`.
- `GET  /api/devices` — every device + its latest reading + `last_seen`
- `GET  /api/devices/:id/latest`
- `GET  /api/devices/:id/readings?hours=24`
- `GET  /api/devices/:id/alerts?limit=50`
- `PUT  /api/devices/:id/push` `{ "token": "ExponentPushToken[...]" }`
- `GET  /health` (no auth)

## Adding a new device (when you sell a unit)
```bash
# 1. MQTT credential
docker run --rm -v "$(pwd)/mqtt:/m" eclipse-mosquitto:2.0 \
  mosquitto_passwd -b /m/passwd DEV02 "<a-strong-password>"
docker compose restart mqtt
# 2. register it (so owner_phone is known) — optional, auto-created on first packet
docker compose exec db psql -U filaha -d filaha -c \
  "INSERT INTO devices(device_id,label,owner_phone,wilaya) VALUES('DEV02','Coop 2','+213...','Setif');"
# 3. flash firmware with FILAHA_DEVICE_ID=DEV02 and that password.
```

## Production hardening (do before real customers)
1. **TLS on MQTT** (8883) and **HTTPS on the API** — put Caddy or Traefik in front (auto Let's Encrypt). Then point the device/app at `mqtts://` and `https://`.
2. **Per-user auth** — the single `API_TOKEN` is fine for a pilot; swap to per-account JWT before scaling so each farmer only sees their own coops.
3. **Backups** — `docker compose exec db pg_dump ...` on a cron.
4. **Retention** — uncomment the `add_retention_policy` line in `db/init.sql` (keeps DB small).
