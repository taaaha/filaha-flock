import { DeviceEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { FilahaSms } = NativeModules || {};

// JS expects this version. Bump in lockstep with NATIVE_VERSION in SmsPackage.java.
export const EXPECTED_NATIVE_VERSION = 'v9-2026-05-29a';

export async function getNativeVersion() {
  if (!FilahaSms || !FilahaSms.getNativeVersion) return null;
  try { return await FilahaSms.getNativeVersion(); } catch (e) { return null; }
}

// Installed APK version info { versionName, versionCode, packageName }.
// Used by the in-app updater to compare against the latest published build.
export async function getAppVersionInfo() {
  if (!FilahaSms || !FilahaSms.getAppVersionInfo) return null;
  try { return await FilahaSms.getAppVersionInfo(); } catch (e) { return null; }
}

// Launches the system installer for a downloaded APK (content:// URI).
// Returns 'OK' | 'NEEDS_PERMISSION' | null (native method unavailable).
export async function installApk(contentUri) {
  if (!FilahaSms || !FilahaSms.installApk) return null;
  try { return await FilahaSms.installApk(String(contentUri || '')); } catch (e) {
    if (__DEV__) console.warn('installApk failed:', e?.message);
    return null;
  }
}

// Route a tapped notification asked the app to open ('insights' | null).
// Consumed once — native clears it after returning.
export async function getPendingRoute() {
  if (!FilahaSms || !FilahaSms.getPendingRoute) return null;
  try { return await FilahaSms.getPendingRoute(); } catch (e) { return null; }
}

export function listMissingNativeMethods() {
  const required = [
    'showAlertNotification', 'sendSms', 'makeDirectCall',
    'setAlertConfig', 'saveEmergencyContact', 'drainQueue',
    'getNativeVersion', 'scheduleDailyReminder', 'cancelDailyReminder',
    'startMonitoring', 'stopMonitoring', 'getPendingRoute',
    'getAppVersionInfo', 'installApk',
  ];
  if (!FilahaSms) return required;
  return required.filter((k) => typeof FilahaSms[k] !== 'function');
}

export async function startMonitoring(title, body) {
  if (!FilahaSms || !FilahaSms.startMonitoring) return false;
  try {
    await FilahaSms.startMonitoring(String(title || ''), String(body || ''));
    return true;
  } catch (e) {
    if (__DEV__) console.warn('startMonitoring failed:', e?.message);
    return false;
  }
}

export async function stopMonitoring() {
  if (!FilahaSms || !FilahaSms.stopMonitoring) return false;
  try { await FilahaSms.stopMonitoring(); return true; } catch (e) { return false; }
}

export async function scheduleDailyReminder({ hour, minute, title, body, reqCode }) {
  if (!FilahaSms || !FilahaSms.scheduleDailyReminder) return false;
  try {
    await FilahaSms.scheduleDailyReminder(hour, minute, title, body, reqCode);
    return true;
  } catch (e) {
    if (__DEV__) console.warn('scheduleDailyReminder failed:', e?.message);
    return false;
  }
}

export async function cancelDailyReminder(reqCode) {
  if (!FilahaSms || !FilahaSms.cancelDailyReminder) return false;
  try {
    await FilahaSms.cancelDailyReminder(reqCode);
    return true;
  } catch (e) { return false; }
}

// ── Permissions ───────────────────────────────────────────────────────
export async function requestSmsPermissions() {
  if (Platform.OS !== 'android') return true;
  try {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    ]);
    return Object.values(result).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
  } catch (e) { return false; }
}

export async function checkSmsPermission() {
  if (Platform.OS !== 'android') return true;
  try {
    return !!(await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS));
  } catch (e) { return false; }
}

export async function requestSendSmsPermission() {
  if (Platform.OS !== 'android') return true;
  try {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) { return false; }
}

export async function checkSendSmsPermission() {
  if (Platform.OS !== 'android') return false;
  try {
    return !!(await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS));
  } catch (e) { return false; }
}

export async function requestCallPermission() {
  if (Platform.OS !== 'android') return true;
  try {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CALL_PHONE);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) { return false; }
}

export async function checkCallPermission() {
  if (Platform.OS !== 'android') return false;
  try {
    return !!(await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CALL_PHONE));
  } catch (e) { return false; }
}

export async function requestNotificationPermission() {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version < 33) return true;
  try {
    const perm = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (!perm) return true;
    const result = await PermissionsAndroid.request(perm);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) { return false; }
}

export async function checkNotificationsEnabled() {
  if (!FilahaSms || !FilahaSms.areNotificationsEnabled) return true;
  try {
    return !!(await FilahaSms.areNotificationsEnabled());
  } catch (e) { return false; }
}

// ── Battery ───────────────────────────────────────────────────────────
export async function isIgnoringBatteryOptimizations() {
  if (!FilahaSms || !FilahaSms.isIgnoringBatteryOptimizations) return true;
  try { return await FilahaSms.isIgnoringBatteryOptimizations(); } catch (e) { return false; }
}

export async function requestIgnoreBatteryOptimizations() {
  if (!FilahaSms || !FilahaSms.requestIgnoreBatteryOptimizations) return false;
  try { return await FilahaSms.requestIgnoreBatteryOptimizations(); } catch (e) { return false; }
}

// ── Queue & events ────────────────────────────────────────────────────
export async function drainSmsQueue() {
  if (!FilahaSms || !FilahaSms.drainQueue) return [];
  try {
    const json = await FilahaSms.drainQueue();
    if (!json) return [];
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

export function subscribeToSmsEvents({ onData, onAlert }) {
  const subs = [];
  if (onData) {
    subs.push(DeviceEventEmitter.addListener('FilahaSmsData', (e) => {
      try { onData(e); } catch (err) {}
    }));
  }
  if (onAlert) {
    subs.push(DeviceEventEmitter.addListener('FilahaSmsAlert', (e) => {
      try { onAlert(e); } catch (err) {}
    }));
  }
  return () => subs.forEach((s) => { try { s.remove(); } catch (e) {} });
}

// ── Native bridges ────────────────────────────────────────────────────
export async function makeDirectCall(phoneNumber) {
  if (!FilahaSms || !FilahaSms.makeDirectCall) return false;
  try {
    const cleaned = String(phoneNumber).replace(/[^\d+]/g, '');
    if (!cleaned) return false;
    await FilahaSms.makeDirectCall(cleaned);
    return true;
  } catch (e) {
    if (__DEV__) console.warn('makeDirectCall failed:', e?.message);
    return false;
  }
}

export async function saveEmergencyContact(number) {
  if (!FilahaSms || !FilahaSms.saveEmergencyContact) return false;
  try {
    await FilahaSms.saveEmergencyContact(String(number || ''));
    return true;
  } catch (e) { return false; }
}

/**
 * Syncs the entire alert config to native SharedPreferences so the
 * BroadcastReceiver can fire alerts even when the app is killed.
 */
export async function setAlertConfig(config) {
  if (!FilahaSms || !FilahaSms.setAlertConfig) return false;
  try {
    await FilahaSms.setAlertConfig(config);
    return true;
  } catch (e) {
    if (__DEV__) console.warn('setAlertConfig failed:', e?.message);
    return false;
  }
}

export async function showAlertNotification(title, body, withCallAction = true) {
  if (!FilahaSms || !FilahaSms.showAlertNotification) return false;
  try {
    await FilahaSms.showAlertNotification(
      String(title || 'Filaha Flock Alert'),
      String(body || ''),
      !!withCallAction
    );
    return true;
  } catch (e) {
    if (__DEV__) console.warn('showAlertNotification failed:', e?.message);
    return false;
  }
}

export async function sendSms(number, body) {
  if (!FilahaSms || !FilahaSms.sendSms) return false;
  try {
    const cleaned = String(number).replace(/[^\d+]/g, '');
    if (!cleaned) return false;
    await FilahaSms.sendSms(cleaned, String(body || ''));
    return true;
  } catch (e) {
    if (__DEV__) console.warn('sendSms failed:', e?.message);
    return false;
  }
}

// In-app simulated SMS injection
export function injectSimulatedSms(message, isAlert = false) {
  const eventName = isAlert ? 'FilahaSmsAlert' : 'FilahaSmsData';
  DeviceEventEmitter.emit(eventName, {
    message,
    sender: 'SIMULATED',
    timestamp: Date.now(),
  });
}
