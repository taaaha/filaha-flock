// ════════════════════════════════════════════════════════════════
//  ApiService — pulls telemetry from the Filaha cloud REST API.
//  Replaces the old "read SMS off the phone" path (which Google Play
//  forbids). The device pushes data to the server over 2G; the app
//  fetches it from here.
//
//  Configure at build time (Expo public env, no rebuild of native):
//    EXPO_PUBLIC_API_URL   = https://your-server-or-ip:8080
//    EXPO_PUBLIC_API_TOKEN = <API_TOKEN from server/.env>
// ════════════════════════════════════════════════════════════════
const BASE = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
const TOKEN = process.env.EXPO_PUBLIC_API_TOKEN || '';

export const apiEnabled = () => BASE.length > 0;

async function req(path, opts = {}) {
  if (!BASE) throw new Error('API URL not configured');
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status} ${path}`);
  return res.status === 204 ? null : res.json();
}

// Maps a server row {ts,temp_c,humidity,co2_ppm,nh3_ppm,battery} to the in-app
// reading shape used everywhere else (same as smsParser output).
export function rowToReading(deviceId, row) {
  if (!row || !row.ts) return null;
  return {
    deviceId,
    timestamp: new Date(row.ts).getTime(),
    co2: row.co2_ppm ?? null,
    nh3: row.nh3_ppm ?? null,
    temp: row.temp_c ?? null,
    hum: row.humidity ?? null,
    bat: row.battery ?? null,
  };
}

// Wraps a reading as the "parsed data message" handleParsedMessage expects.
export function rowToParsed(deviceId, row) {
  const reading = rowToReading(deviceId, row);
  if (!reading) return null;
  return { kind: 'data', deviceId, timestamp: reading.timestamp, reading, raw: 'API' };
}

export const fetchDevices = () => req('/api/devices');
export const fetchLatest = (deviceId) => req(`/api/devices/${encodeURIComponent(deviceId)}/latest`);
export const fetchReadings = (deviceId, hours = 24) =>
  req(`/api/devices/${encodeURIComponent(deviceId)}/readings?hours=${hours}`);
export const fetchAlerts = (deviceId, limit = 50) =>
  req(`/api/devices/${encodeURIComponent(deviceId)}/alerts?limit=${limit}`);
export const registerPushToken = (deviceId, token) =>
  req(`/api/devices/${encodeURIComponent(deviceId)}/push`, { method: 'PUT', body: JSON.stringify({ token }) });
