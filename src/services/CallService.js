import { Linking, Platform } from 'react-native';
import { requestCallPermission, checkCallPermission } from './SmsService';

export async function makePhoneCall(phoneNumber) {
  if (!phoneNumber) return false;
  const cleaned = String(phoneNumber).replace(/[^\d+]/g, '');
  if (!cleaned) return false;

  const url = `tel:${cleaned}`;

  if (Platform.OS === 'android') {
    let granted = await checkCallPermission();
    if (!granted) {
      granted = await requestCallPermission();
    }
    // Fallback: even without CALL_PHONE permission, ACTION_DIAL works
    // by opening the dialer pre-filled. We always use Linking which
    // respects whatever permission is granted.
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) return false;
    await Linking.openURL(url);
    return true;
  } catch (e) {
    return false;
  }
}
