import { DeviceEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { FilahaSms } = NativeModules || {};

export async function requestSmsPermissions() {
  if (Platform.OS !== 'android') return true;
  try {
    const perms = [
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    ];
    const result = await PermissionsAndroid.requestMultiple(perms);
    return Object.values(result).every(
      (v) => v === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (e) {
    return false;
  }
}

export async function checkSmsPermission() {
  if (Platform.OS !== 'android') return true;
  try {
    const ok = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS
    );
    return !!ok;
  } catch (e) {
    return false;
  }
}

export async function requestCallPermission() {
  if (Platform.OS !== 'android') return true;
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CALL_PHONE
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    return false;
  }
}

export async function checkCallPermission() {
  if (Platform.OS !== 'android') return false;
  try {
    return await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CALL_PHONE
    );
  } catch (e) {
    return false;
  }
}

export async function requestNotificationPermission() {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version < 33) return true;
  try {
    const perm = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (!perm) return true;
    const result = await PermissionsAndroid.request(perm);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    return false;
  }
}

export async function isIgnoringBatteryOptimizations() {
  if (!FilahaSms || !FilahaSms.isIgnoringBatteryOptimizations) return true;
  try {
    return await FilahaSms.isIgnoringBatteryOptimizations();
  } catch (e) {
    return false;
  }
}

export async function requestIgnoreBatteryOptimizations() {
  if (!FilahaSms || !FilahaSms.requestIgnoreBatteryOptimizations) return false;
  try {
    return await FilahaSms.requestIgnoreBatteryOptimizations();
  } catch (e) {
    return false;
  }
}

export async function drainSmsQueue() {
  if (!FilahaSms || !FilahaSms.drainQueue) return [];
  try {
    const json = await FilahaSms.drainQueue();
    if (!json) return [];
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch (e) {
    return [];
  }
}

export function subscribeToSmsEvents({ onData, onAlert }) {
  const subs = [];
  if (onData) {
    subs.push(DeviceEventEmitter.addListener('FilahaSmsData', (e) => {
      try { onData(e); } catch (err) { /* ignore */ }
    }));
  }
  if (onAlert) {
    subs.push(DeviceEventEmitter.addListener('FilahaSmsAlert', (e) => {
      try { onAlert(e); } catch (err) { /* ignore */ }
    }));
  }
  return () => {
    subs.forEach((s) => {
      try { s.remove(); } catch (e) { /* ignore */ }
    });
  };
}

// In-app simulated SMS injection.
// Triggers the same code path as a real SMS by emitting the same event.
export function injectSimulatedSms(message, isAlert = false) {
  const eventName = isAlert ? 'FilahaSmsAlert' : 'FilahaSmsData';
  DeviceEventEmitter.emit(eventName, {
    message,
    sender: 'SIMULATED',
    timestamp: Date.now(),
  });
}
