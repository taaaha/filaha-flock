import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Tracks which coach marks (educational tooltips shown the first time the
 * user encounters a feature) have already been dismissed.
 *
 * Each mark has a unique id. Once dismissed it never re-appears.
 */

const KEY_PREFIX = '@filaha:coachmark:';

export async function shouldShowMark(id) {
  try {
    const v = await AsyncStorage.getItem(KEY_PREFIX + id);
    return v !== '1';
  } catch (e) {
    return false;
  }
}

export async function dismissMark(id) {
  try { await AsyncStorage.setItem(KEY_PREFIX + id, '1'); } catch (e) {}
}

/** Resets all coach marks — useful from a "show tips again" debug button. */
export async function resetAllMarks(ids) {
  try {
    await Promise.all(ids.map((id) => AsyncStorage.removeItem(KEY_PREFIX + id)));
  } catch (e) {}
}
