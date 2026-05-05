import { Vibration } from 'react-native';

export function vibrate(pattern = [0, 300, 200, 300]) {
  try {
    Vibration.vibrate(pattern);
  } catch (e) {
    // ignore
  }
}

export function vibrateDanger() {
  vibrate([0, 500, 200, 500, 200, 500]);
}

export function vibrateWarn() {
  vibrate([0, 300, 200, 300]);
}

export function stopVibration() {
  try {
    Vibration.cancel();
  } catch (e) {
    // ignore
  }
}
