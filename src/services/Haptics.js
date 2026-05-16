import { Vibration, Platform } from 'react-native';

/**
 * Centralized haptic feedback. Uses Vibration (always available) with short
 * patterns tuned per intent. If you later install expo-haptics this is the
 * single place to swap implementations.
 */

export const Haptics = {
  /** Subtle confirmation — for taps on key controls (Save, Toggle). */
  light() {
    if (Platform.OS === 'android') Vibration.vibrate(15);
  },
  /** Stronger feedback — for primary actions (Add coop, Submit). */
  medium() {
    if (Platform.OS === 'android') Vibration.vibrate(35);
  },
  /** Alert pattern — for danger notifications surfaced inside the app. */
  alert() {
    if (Platform.OS === 'android') Vibration.vibrate([0, 200, 80, 200]);
  },
  /** Success — for "task completed". */
  success() {
    if (Platform.OS === 'android') Vibration.vibrate([0, 30, 60, 30]);
  },
};
