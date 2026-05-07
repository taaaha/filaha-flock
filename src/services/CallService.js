import { Linking, NativeModules, Platform } from 'react-native';
import { requestCallPermission, checkCallPermission } from './SmsService';

const { FilahaSms } = NativeModules || {};

/**
 * Open the phone dialer pre-filled with the number.
 * Safe for user-initiated test calls — shows dialer, does not auto-dial.
 */
export async function makePhoneCall(phoneNumber) {
  if (!phoneNumber) return false;
  const cleaned = String(phoneNumber).replace(/[^\d+]/g, '');
  if (!cleaned) return false;

  const url = `tel:${cleaned}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) return false;
    await Linking.openURL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Directly initiate a phone call without showing the dialer.
 * Requires CALL_PHONE permission. Used for automatic alerts only.
 */
export async function makeDirectCall(phoneNumber) {
  if (!phoneNumber) return false;
  const cleaned = String(phoneNumber).replace(/[^\d+]/g, '');
  if (!cleaned) return false;

  if (Platform.OS !== 'android') {
    // iOS doesn't support ACTION_CALL; fall back to dialer
    return makePhoneCall(cleaned);
  }

  // Ensure permission first
  let granted = await checkCallPermission();
  if (!granted) {
    granted = await requestCallPermission();
  }
  if (!granted) return false;

  try {
    if (FilahaSms && FilahaSms.makeDirectCall) {
      await FilahaSms.makeDirectCall(cleaned);
      return true;
    }
    // Fallback to Linking if native module not available
    return makePhoneCall(cleaned);
  } catch (e) {
    return false;
  }
}
