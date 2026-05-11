import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ONBOARDING_DONE: '@filaha:onboardingDone',
  LANGUAGE: '@filaha:language',
  THEME: '@filaha:theme',
  FARMS: '@filaha:farms',
  DEVICES: '@filaha:devices',
  ALERTS: '@filaha:alerts',
  SETTINGS: '@filaha:settings',
  THRESHOLDS: '@filaha:thresholds',
  POWER_CUT: '@filaha:powerCut',
};

const READING_PREFIX = '@filaha:readings:';
const MAX_READINGS_PER_DEVICE = 100;

async function safeGet(key, fallback) {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === null || value === undefined) return fallback;
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
}

async function safeSet(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // ignore - storage may be full or otherwise unavailable
  }
}

export const Storage = {
  KEYS,

  async getOnboardingDone() {
    return await safeGet(KEYS.ONBOARDING_DONE, false);
  },
  async setOnboardingDone(value) {
    return safeSet(KEYS.ONBOARDING_DONE, value);
  },

  async getLanguage() {
    return await safeGet(KEYS.LANGUAGE, null);
  },
  async setLanguage(lang) {
    return safeSet(KEYS.LANGUAGE, lang);
  },

  async getTheme() {
    return await safeGet(KEYS.THEME, 'light');
  },
  async setTheme(theme) {
    return safeSet(KEYS.THEME, theme);
  },

  async getFarms() {
    return await safeGet(KEYS.FARMS, []);
  },
  async setFarms(farms) {
    return safeSet(KEYS.FARMS, farms);
  },

  async getDevices() {
    return await safeGet(KEYS.DEVICES, []);
  },
  async setDevices(devices) {
    return safeSet(KEYS.DEVICES, devices);
  },

  async getAlerts() {
    return await safeGet(KEYS.ALERTS, []);
  },
  async setAlerts(alerts) {
    return safeSet(KEYS.ALERTS, alerts);
  },

  async getSettings() {
    return await safeGet(KEYS.SETTINGS, null);
  },
  async setSettings(settings) {
    return safeSet(KEYS.SETTINGS, settings);
  },

  async getThresholds() {
    return await safeGet(KEYS.THRESHOLDS, null);
  },
  async setThresholds(thresholds) {
    return safeSet(KEYS.THRESHOLDS, thresholds);
  },

  async getPowerCut() {
    return await safeGet(KEYS.POWER_CUT, {});
  },
  async setPowerCut(map) {
    return safeSet(KEYS.POWER_CUT, map);
  },

  // Per-device readings (stored separately to avoid huge single blobs)
  async getReadings(deviceId) {
    if (!deviceId) return [];
    return await safeGet(READING_PREFIX + deviceId, []);
  },
  async appendReading(deviceId, reading) {
    if (!deviceId) return;
    const list = await Storage.getReadings(deviceId);
    list.push(reading);
    while (list.length > MAX_READINGS_PER_DEVICE) list.shift();
    await safeSet(READING_PREFIX + deviceId, list);
    return list;
  },
  async clearReadings(deviceId) {
    if (!deviceId) return;
    try {
      await AsyncStorage.removeItem(READING_PREFIX + deviceId);
    } catch (e) {
      // ignore
    }
  },
};
