-- Filaha Flock — schema (runs once on first DB boot)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Devices (one row per boitier). Pre-register devices you sell.
CREATE TABLE IF NOT EXISTS devices (
  device_id   TEXT PRIMARY KEY,                 -- e.g. "DEV01"
  label       TEXT,                             -- "Poulailler Fa"
  owner_phone TEXT,                             -- farmer phone (E.164), used by the device for SMS/call
  wilaya      TEXT,
  push_token  TEXT,                             -- Expo push token of the owner's app (optional)
  status      TEXT NOT NULL DEFAULT 'unknown',  -- 'online' | 'offline' | 'unknown' (watchdog)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ
);

-- Telemetry: one row every ~60 s per device. Hypertable = fast time-series.
CREATE TABLE IF NOT EXISTS readings (
  device_id  TEXT        NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
  temp_c     REAL,        -- restored (raw/10)
  humidity   SMALLINT,    -- whole %
  co2_ppm    INTEGER,
  nh3_ppm    REAL,        -- restored (raw/100)
  battery    SMALLINT     -- battery % (0-100)
);
SELECT create_hypertable('readings', 'ts', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS readings_device_ts_idx ON readings (device_id, ts DESC);

-- Optional retention: keep raw data 90 days (uncomment to enable).
-- SELECT add_retention_policy('readings', INTERVAL '90 days', if_not_exists => TRUE);

-- Server-side alert log (the DEVICE still sends the SMS/call; this is for the app + audit).
CREATE TABLE IF NOT EXISTS alerts (
  id         BIGSERIAL PRIMARY KEY,
  device_id  TEXT        NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind       TEXT        NOT NULL,    -- 'nh3' | 'temp_high' | 'temp_low' | 'co2'
  value      REAL,
  message    TEXT
);
CREATE INDEX IF NOT EXISTS alerts_device_ts_idx ON alerts (device_id, ts DESC);

-- Seed a test device so you can flash + see data immediately.
INSERT INTO devices (device_id, label, owner_phone, wilaya)
VALUES ('DEV01', 'Poulailler de test', '+213541787699', 'Biskra')
ON CONFLICT (device_id) DO NOTHING;
