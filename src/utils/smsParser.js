// Filaha SMS protocol parser
// Data: FILAHA|DEV01|CO2:852|NH3:3.2|T:28.4|H:61|BAT:87|OK
// Alert: FILAHA|DEV01|ALERT|NH3:52ppm — danger
// Power cut: FILAHA|DEV01|ALERT|POWER CUT — running on battery
// Clear: FILAHA|DEV01|CLEAR|All sensors normal

const PREFIX = 'FILAHA';

function parseFloatSafe(s) {
  if (s === undefined || s === null) return null;
  const cleaned = String(s).replace(/[^0-9.\-]/g, '');
  if (!cleaned) return null;
  const v = parseFloat(cleaned);
  return isNaN(v) ? null : v;
}

export function parseSms(message, timestamp) {
  if (!message || typeof message !== 'string') return null;
  const trimmed = message.trim();
  if (!trimmed.startsWith(PREFIX)) return null;

  const parts = trimmed.split('|').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 3) return null;

  const deviceId = parts[1];
  if (!deviceId) return null;

  const ts = timestamp || Date.now();
  const upperParts = parts.map((p) => p.toUpperCase());

  // Detect type
  if (upperParts.includes('ALERT')) {
    const idx = upperParts.indexOf('ALERT');
    const payload = parts.slice(idx + 1).join(' | ');
    const upperPayload = payload.toUpperCase();
    let subType = 'GENERIC';
    if (upperPayload.includes('POWER CUT') || upperPayload.includes('POWER_CUT')) subType = 'POWER_CUT';
    else if (upperPayload.includes('NH3')) subType = 'NH3';
    else if (upperPayload.includes('CO2')) subType = 'CO2';
    else if (/\bT\b/.test(upperPayload) || upperPayload.includes('TEMP')) subType = 'TEMP';
    else if (upperPayload.includes('H:') || upperPayload.includes('HUM')) subType = 'HUM';
    else if (upperPayload.includes('BAT') || upperPayload.includes('BATTERY')) subType = 'BATTERY';
    return {
      kind: 'alert',
      deviceId,
      timestamp: ts,
      subType,
      message: payload,
      raw: trimmed,
    };
  }

  if (upperParts.includes('CLEAR')) {
    const idx = upperParts.indexOf('CLEAR');
    const payload = parts.slice(idx + 1).join(' | ');
    return {
      kind: 'clear',
      deviceId,
      timestamp: ts,
      subType: 'CLEAR',
      message: payload,
      raw: trimmed,
    };
  }

  // Data SMS - look for known sensor tokens
  const reading = {
    deviceId,
    timestamp: ts,
    co2: null,
    nh3: null,
    temp: null,
    hum: null,
    bat: null,
  };

  for (const part of parts) {
    const colon = part.indexOf(':');
    if (colon < 0) continue;
    const k = part.slice(0, colon).trim().toUpperCase();
    const v = part.slice(colon + 1).trim();
    switch (k) {
      case 'CO2': reading.co2 = parseFloatSafe(v); break;
      case 'NH3': reading.nh3 = parseFloatSafe(v); break;
      case 'T':
      case 'TEMP':
      case 'TEMPERATURE':
        reading.temp = parseFloatSafe(v); break;
      case 'H':
      case 'HUM':
      case 'HUMIDITY':
        reading.hum = parseFloatSafe(v); break;
      case 'BAT':
      case 'BATTERY':
        reading.bat = parseFloatSafe(v); break;
      default: break;
    }
  }

  // Must have at least one sensor value
  const hasAny = reading.co2 !== null || reading.nh3 !== null ||
                 reading.temp !== null || reading.hum !== null ||
                 reading.bat !== null;
  if (!hasAny) return null;

  return {
    kind: 'data',
    deviceId,
    timestamp: ts,
    reading,
    raw: trimmed,
  };
}

export function buildFakeDataSms(deviceId, overrides = {}) {
  const r = {
    co2: 850,
    nh3: 3.2,
    temp: 28.4,
    hum: 61,
    bat: 87,
    ...overrides,
  };
  return `FILAHA|${deviceId}|CO2:${r.co2}|NH3:${r.nh3}|T:${r.temp}|H:${r.hum}|BAT:${r.bat}|OK`;
}

export function buildFakeAlertSms(deviceId, subType = 'NH3', value = 52) {
  if (subType === 'POWER_CUT') {
    return `FILAHA|${deviceId}|ALERT|POWER CUT — running on battery`;
  }
  return `FILAHA|${deviceId}|ALERT|${subType}:${value}ppm — danger`;
}

export function buildFakeClearSms(deviceId) {
  return `FILAHA|${deviceId}|CLEAR|All sensors normal`;
}
