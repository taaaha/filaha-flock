import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getAppVersionInfo, installApk as nativeInstallApk } from './SmsService';

/**
 * UpdateService — the brains of the hybrid in-app updater.
 *
 * Two delivery channels, checked in priority order:
 *
 *   1. APK channel (native).  A `version.json` manifest hosted on GitHub
 *      describes the newest published build. When its `versionCode` is
 *      higher than the installed one, the app downloads the signed APK and
 *      hands it to the system installer. Because the package name
 *      (`com.filaha`) and signing key are unchanged, Android performs an
 *      IN-PLACE update — no uninstall, user data is preserved. This is the
 *      only way to ship native code / permission / manifest changes.
 *
 *   2. OTA channel (expo-updates / EAS Update).  For JS-only changes
 *      (bug fixes, content, UI) we never need a new APK — `expo-updates`
 *      swaps the JS bundle and reloads. Seamless, no install prompt.
 *
 * Why APK is checked FIRST: a newer APK contains everything (native + the
 * latest JS), so if one exists we want the user on it. An OTA only patches
 * JS on top of the current native shell, so it's the fallback for when the
 * native layer is already current.
 *
 * ── Hosting your updates (GitHub Releases) ──────────────────────────────
 *   1. Build a signed APK with the SAME keystore every time (EAS or local).
 *   2. Create a GitHub Release, attach the APK as an asset.
 *   3. Update `version.json` on the `master` branch (raw URL below) with the
 *      new versionCode/versionName/apkUrl/notes. Bump `versionCode` to match
 *      `android.versionCode` in app.json.
 *
 * The included GitHub Actions workflow (.github/workflows/release-apk.yml)
 * automates steps 1–3 on every published Release.
 *
 * version.json shape:
 * {
 *   "versionCode": 2,
 *   "versionName": "1.1.0",
 *   "apkUrl": "https://github.com/<org>/<repo>/releases/download/v1.1.0/filaha-flock-1.1.0.apk",
 *   "mandatory": false,
 *   "minSupportedVersionCode": 1,
 *   "sizeBytes": 28000000,
 *   "publishedAt": "2026-05-29",
 *   "notes": { "ar": "…", "fr": "…", "en": "…" }
 * }
 */

// ── Config ──────────────────────────────────────────────────────────────
// Raw version.json URL the updater polls. Points at the GitHub repo where CI
// commits version.json (the workflows commit to `master`). To move it to a
// different repo, edit the slug below — or override without touching source
// via app.json `extra.versionManifestUrl`.
export const VERSION_MANIFEST_URL =
  'https://raw.githubusercontent.com/taaaha/filaha-flock/master/version.json';

const CACHE_KEY = '@filaha:updateManifest';
const CACHE_TS_KEY = '@filaha:updateManifestTs';
const SKIP_KEY = '@filaha:updateSkipCode';
const LAST_CHECK_KEY = '@filaha:updateLastCheck';

// How long a cached manifest is considered fresh.
const MANIFEST_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
// Minimum gap between *automatic* (non-forced) checks, to be polite on data.
const AUTO_CHECK_THROTTLE_MS = 6 * 60 * 60 * 1000; // 6 hours

const APK_FILE_NAME = 'filaha-update.apk';

// ── Lazy native-module requires ─────────────────────────────────────────
// expo-updates / expo-file-system aren't available in every context (e.g.
// Expo Go, a dev bundle, or a stripped build). Require lazily + defensively
// so importing this service can never crash the app.
function getExpoUpdates() {
  try { return require('expo-updates'); } catch (e) { return null; }
}
function getFileSystem() {
  try { return require('expo-file-system'); } catch (e) { return null; }
}
function getConstants() {
  try { return require('expo-constants').default; } catch (e) { return null; }
}

// ── Installed-version resolution ────────────────────────────────────────
/**
 * Resolves the installed build's identity. Prefers the native bridge
 * (authoritative — reads PackageInfo), falls back to expo-constants so the
 * UI still has *something* to show if the native method is missing.
 * @returns {Promise<{versionName:string, versionCode:number, packageName:string}>}
 */
export async function getInstalledVersion() {
  const native = await getAppVersionInfo();
  if (native && (native.versionCode || native.versionName)) {
    return {
      versionName: String(native.versionName || ''),
      versionCode: Number(native.versionCode || 0),
      packageName: String(native.packageName || ''),
    };
  }
  // Fallback: expo-constants (JS-only, may lag the real APK)
  const Constants = getConstants();
  const expo = Constants?.expoConfig || Constants?.manifest || {};
  const versionName = String(expo.version || '0.0.0');
  const versionCode = Number(
    expo?.android?.versionCode ?? expo?.ios?.buildNumber ?? 0
  );
  return {
    versionName,
    versionCode,
    packageName: String(expo?.android?.package || 'com.filaha'),
  };
}

// ── Manifest fetch (cached, never throws) ───────────────────────────────
function getManifestUrl() {
  const Constants = getConstants();
  const extra =
    Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};
  return extra.versionManifestUrl || VERSION_MANIFEST_URL;
}

function normalizeManifest(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const versionCode = Number(raw.versionCode);
  if (!Number.isFinite(versionCode) || versionCode <= 0) return null;
  return {
    versionCode,
    versionName: String(raw.versionName || ''),
    apkUrl: String(raw.apkUrl || ''),
    mandatory: !!raw.mandatory,
    minSupportedVersionCode: Number(raw.minSupportedVersionCode || 0),
    sizeBytes: Number(raw.sizeBytes || 0),
    publishedAt: String(raw.publishedAt || ''),
    notes:
      raw.notes && typeof raw.notes === 'object' ? raw.notes : null,
  };
}

/**
 * Returns the newest version manifest, fetching from network when the cache
 * is stale/missing. Falls back to stale cache, then null. Never throws.
 */
export async function fetchVersionManifest({ force = false } = {}) {
  // Serve fresh cache unless forced.
  if (!force) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      const tsRaw = await AsyncStorage.getItem(CACHE_TS_KEY);
      const ts = tsRaw ? parseInt(tsRaw, 10) : 0;
      if (raw && Date.now() - ts < MANIFEST_TTL_MS) {
        return normalizeManifest(JSON.parse(raw));
      }
    } catch (e) { /* swallow */ }
  }

  // Network fetch.
  try {
    const res = await fetch(getManifestUrl(), {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const manifest = normalizeManifest(json);
    if (manifest) {
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(json));
        await AsyncStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      } catch (e) { /* swallow */ }
      return manifest;
    }
  } catch (e) {
    if (__DEV__) console.log('Update manifest fetch failed:', e?.message);
  }

  // Stale-cache fallback.
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) return normalizeManifest(JSON.parse(raw));
  } catch (e) { /* swallow */ }

  return null;
}

// ── Skip / throttle helpers ─────────────────────────────────────────────
export async function getSkippedVersionCode() {
  try {
    const v = await AsyncStorage.getItem(SKIP_KEY);
    return v ? parseInt(v, 10) : 0;
  } catch (e) { return 0; }
}

export async function setSkippedVersionCode(code) {
  try { await AsyncStorage.setItem(SKIP_KEY, String(code || 0)); } catch (e) {}
}

export async function clearSkippedVersionCode() {
  try { await AsyncStorage.removeItem(SKIP_KEY); } catch (e) {}
}

async function markChecked() {
  try { await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now())); } catch (e) {}
}

/**
 * True when enough time has elapsed since the last automatic check.
 * Used to gate the foreground auto-check so we don't hit the network on
 * every resume.
 */
export async function shouldAutoCheck() {
  try {
    const tsRaw = await AsyncStorage.getItem(LAST_CHECK_KEY);
    const ts = tsRaw ? parseInt(tsRaw, 10) : 0;
    return Date.now() - ts > AUTO_CHECK_THROTTLE_MS;
  } catch (e) { return true; }
}

// ── OTA availability ────────────────────────────────────────────────────
async function checkOtaAvailable() {
  if (__DEV__) return false; // OTA disabled in dev — bundle is local
  const Updates = getExpoUpdates();
  if (!Updates || !Updates.isEnabled) return false;
  try {
    const result = await Updates.checkForUpdateAsync();
    return !!(result && result.isAvailable);
  } catch (e) {
    if (__DEV__) console.log('OTA check failed:', e?.message);
    return false;
  }
}

// ── Public: unified update check ────────────────────────────────────────
/**
 * Checks both channels and returns the single best action for the UI.
 *
 * @param {{force?:boolean}} opts  force=true bypasses the auto-check
 *        throttle and the manifest cache (used by the manual "Check" button).
 * @returns {Promise<
 *   | { type:'apk', manifest:object, installed:object, mandatory:boolean }
 *   | { type:'ota', installed:object }
 *   | { type:'none', installed:object }
 * >}
 */
export async function checkForUpdates({ force = false } = {}) {
  const installed = await getInstalledVersion();
  // Record the attempt up-front so the auto-check throttle advances on every
  // check (silent or forced) — otherwise silent checks would never set the
  // timestamp and we'd hit the network on every foreground.
  await markChecked();

  // APK is Android-only; OTA still works cross-platform.
  if (Platform.OS === 'android') {
    const manifest = await fetchVersionManifest({ force });
    if (manifest && manifest.versionCode > installed.versionCode && manifest.apkUrl) {
      // Forced when explicitly mandatory OR when the installed build is below
      // the minimum the backend still supports.
      const mandatory =
        !!manifest.mandatory ||
        (manifest.minSupportedVersionCode > 0 &&
          installed.versionCode < manifest.minSupportedVersionCode);
      return { type: 'apk', manifest, installed, mandatory };
    }
  }

  // No newer APK → see if a JS-only OTA is waiting.
  const ota = await checkOtaAvailable();
  if (ota) return { type: 'ota', installed };

  return { type: 'none', installed };
}

// ── Public: apply an OTA update ─────────────────────────────────────────
/**
 * Fetches the pending OTA bundle and reloads into it. Resolves false if
 * OTA is unavailable; otherwise the app reloads and the promise never
 * settles (process restarts).
 */
export async function applyOtaUpdate() {
  const Updates = getExpoUpdates();
  if (!Updates || !Updates.isEnabled) return false;
  try {
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync(); // app restarts here
    return true;
  } catch (e) {
    if (__DEV__) console.warn('applyOtaUpdate failed:', e?.message);
    return false;
  }
}

// ── Public: download + install an APK ───────────────────────────────────
/**
 * Downloads the APK to the cache dir with progress, converts to a
 * content:// URI, and launches the system installer via the native bridge.
 *
 * @param {string} apkUrl
 * @param {(progress:number)=>void} onProgress  0..1
 * @returns {Promise<'OK'|'NEEDS_PERMISSION'>}
 * @throws {Error} on download/IO failure or when filesystem is unavailable.
 */
export async function downloadAndInstallApk(apkUrl, onProgress) {
  if (Platform.OS !== 'android') throw new Error('APK install is Android-only');
  if (!apkUrl) throw new Error('Missing APK URL');

  const FS = getFileSystem();
  if (!FS || !FS.cacheDirectory) {
    throw new Error('File system unavailable');
  }

  const destPath = FS.cacheDirectory + APK_FILE_NAME;

  // Clean any stale download so a half-finished file can't be installed.
  try {
    const info = await FS.getInfoAsync(destPath);
    if (info && info.exists) await FS.deleteAsync(destPath, { idempotent: true });
  } catch (e) { /* non-fatal */ }

  const callback = (p) => {
    if (!onProgress || !p || !p.totalBytesExpectedToWrite) return;
    const ratio = p.totalBytesWritten / p.totalBytesExpectedToWrite;
    try { onProgress(Math.max(0, Math.min(1, ratio))); } catch (e) {}
  };

  const resumable = FS.createDownloadResumable(apkUrl, destPath, {}, callback);
  const result = await resumable.downloadAsync();
  if (!result || !result.uri) throw new Error('Download failed');

  // The system installer needs a content:// URI it can read across the
  // process boundary — file:// would throw FileUriExposedException.
  const contentUri = await FS.getContentUriAsync(result.uri);

  const status = await nativeInstallApk(contentUri);
  if (status === null) throw new Error('Installer bridge unavailable');
  return status; // 'OK' | 'NEEDS_PERMISSION'
}

/**
 * Best-effort cleanup of a downloaded APK (e.g. after a cancelled flow).
 */
export async function clearDownloadedApk() {
  const FS = getFileSystem();
  if (!FS || !FS.cacheDirectory) return;
  try {
    await FS.deleteAsync(FS.cacheDirectory + APK_FILE_NAME, { idempotent: true });
  } catch (e) { /* swallow */ }
}

// ── i18n helper for release notes ───────────────────────────────────────
/**
 * Picks the best localized release-notes string from a manifest's notes
 * map, falling back across languages then to empty string.
 */
export function pickNotes(manifest, language) {
  const notes = manifest && manifest.notes;
  if (!notes) return '';
  return (
    notes[language] || notes.ar || notes.en || notes.fr ||
    (typeof notes === 'string' ? notes : '')
  );
}
