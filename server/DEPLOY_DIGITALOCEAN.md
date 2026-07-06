# Deploy the Filaha backend to DigitalOcean

Everything in this `server/` folder is host-agnostic Docker (Mosquitto MQTT +
TimescaleDB + Node ingest/REST API). Moving off Google Cloud is a **redeploy,
not a rewrite** — the exact same `docker compose up` runs on a DO Droplet.

Your blueprint, mapped to what already exists:
| You asked for | It's already here |
|---|---|
| 8-byte binary packet (temp/hum/CO₂/NH₃ + battery) | `firmware/src/pack.cpp` |
| GPRS + stream to server IP every 60 s | `firmware/src/net.cpp`, `main.cpp` |
| Server decodes packet, restores decimals, stores w/ timestamp | `server/api/index.js` + `db/init.sql` (TimescaleDB) |
| Daily report SMS + critical-breach SMS bypass | `firmware/src/main.cpp` (`maybe_send_heartbeat`, `evaluate_critical`) |

---

## 1. Create the Droplet (~3 min)
- **digitalocean.com** → **Create → Droplets**
- **Region:** Frankfurt (**FRA1**) — best routing to Algeria (Amsterdam AMS3 is fine too)
- **Image:** Ubuntu 24.04 (LTS)
- **Size:** Basic → Regular → **$6/mo (1 GB RAM)**.
  ⚠️ Skip the $4/512 MB — Postgres + TimescaleDB + Node + Mosquitto will OOM on it.
  $12/2 GB is comfortable if you want headroom.
- **Authentication:** SSH key (recommended) or password
- **Create.** Copy the Droplet's **public IP**.

## 2. Cloud Firewall (~2 min)
DO Droplets have **no OS firewall by default**, so the Cloud Firewall is the only
layer to configure (simpler than GCP's two firewalls).
- **Networking → Firewalls → Create Firewall**
- **Inbound rules:**
  | Type | Protocol | Port | Sources |
  |---|---|---|---|
  | SSH | TCP | 22 | (your IP, or All) |
  | Custom | TCP | 1883 | All IPv4 + All IPv6  ← MQTT (devices) |
  | Custom | TCP | 8080 | All IPv4 + All IPv6  ← REST API (app) |
- **Apply to Droplets:** select your `filaha` Droplet → Create.

> Using raw UDP instead of MQTT? Then open **UDP 5000** here as well. But we
> chose MQTT on purpose (device identity via topic, delivery reliability, auth) —
> keep it unless you have a reason not to.

## 3. Install Docker + swap (~3 min)
DO logs you in as **root**, so no `sudo` needed:
```bash
ssh root@YOUR_IP
curl -fsSL https://get.docker.com | sh
# 2 GB swap cushion for the 1 GB box
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 4. Upload the `server` folder (~1 min)
From your Windows machine (Git Bash), inside `D:/Filaha`:
```bash
scp -r server root@YOUR_IP:~/
```
(or zip `server`, upload via the DO web console, and unzip.)

## 5. Start it (~2 min, same commands as before)
```bash
ssh root@YOUR_IP
cd server
chmod +x setup.sh && ./setup.sh DEV01
docker compose up -d
docker compose logs -f api
```
📝 Copy the **DEV01 MQTT password** and the **API_TOKEN** it prints.

## 6. Verify
```bash
curl http://YOUR_IP:8080/health          # -> {"ok":true}
```

## 7. Repoint the device + app to the new IP
- **Firmware** `firmware/src/config.h`:
  `FILAHA_MQTT_HOST "YOUR_IP"`, `FILAHA_MQTT_PASS "<from setup.sh>"`, `FILAHA_APN "internet"` (Mobilis) — reflash.
- **App** `eas.json` env: `EXPO_PUBLIC_API_URL "http://YOUR_IP:8080"`, `EXPO_PUBLIC_API_TOKEN "<from setup.sh>"` → cut a new release (the URL is baked at build time).
  *Tip: point a cheap domain (e.g. `api.filahaflock.com`) at the Droplet so you never rebuild the app again when the IP changes — and it unlocks HTTPS.*

## 8. Rotate secrets + kill Google Cloud
- The old GCP token/password leaked in chat — the fresh `./setup.sh DEV01` already gave you new ones. Good.
- Once the Droplet shows live data, **delete the GCP VM** to stop its billing.

---

### Algerian GPRS — APN + AT reference (for debugging only)
`firmware/src/net.cpp` does this automatically via `modem.gprsConnect(APN,...)`.
Hand-run these over the serial monitor only if attach fails:
```
AT+CPIN?                         // SIM ready?
AT+CSQ                           // signal (need CSQ > 5)
AT+CGREG?                        // GPRS registered? (0,1 or 0,5 = ok)
AT+CGDCONT=1,"IP","internet"     // Mobilis. Djezzy: "djezzy.internet". Ooredoo: "internet"
AT+CGACT=1,1                     // activate data context
```
APN per operator: **Mobilis** `internet` · **Djezzy** `djezzy.internet` · **Ooredoo** `internet`.
