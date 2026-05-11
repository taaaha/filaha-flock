import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Remote content service — silently fetches the latest Guide content
 * (DAILY_TASKS, AGE_PHASES, TOPICS, DISEASES, MARKET_REF) from a JSON URL
 * when the device is online. No user action required, no app rebuild needed.
 *
 * The JSON file should mirror the shape of `src/utils/guideContent.js` and
 * `src/utils/poultryData.js` — only the fields you ship are overridden;
 * bundled defaults fill in the rest.
 *
 * To deploy your own content updates:
 *   1. Host a JSON file at any HTTPS URL (GitHub raw, Cloudflare, S3, etc.)
 *   2. Set REMOTE_CONTENT_URL below (or via app.json `extra.remoteContentUrl`)
 *   3. Bump the `version` field in the JSON each time you update
 *
 * Example JSON structure:
 * {
 *   "version": "2026-05-15",
 *   "dailyTasks": [...],   // optional override
 *   "agePhases": [...],    // optional override
 *   "topics": [...],
 *   "diseases": [...],
 *   "marketRef": {...},
 *   "notice": { "ar": "...", "en": "...", "fr": "..." }  // optional banner
 * }
 */

// Default URL — replace with your own hosting (GitHub raw, S3, Cloudflare, etc.)
// Point to a JSON file that you can update at any time.
export const REMOTE_CONTENT_URL =
  'https://raw.githubusercontent.com/filaha-flock/content/main/guide-v1.json';

const CACHE_KEY = '@filaha:remoteContent';
const CACHE_TS_KEY = '@filaha:remoteContentTs';
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let inMemoryCache = null;

/**
 * Returns the most recent remote content, fetching from network if cache
 * is stale or missing. Never throws — falls back to null on any failure.
 */
export async function getRemoteContent({ force = false } = {}) {
  if (inMemoryCache && !force) return inMemoryCache;

  // Load cached version from disk
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const tsRaw = await AsyncStorage.getItem(CACHE_TS_KEY);
    const ts = tsRaw ? parseInt(tsRaw, 10) : 0;
    if (raw && Date.now() - ts < REFRESH_INTERVAL_MS && !force) {
      inMemoryCache = JSON.parse(raw);
      return inMemoryCache;
    }
  } catch (e) { /* swallow */ }

  // Try a network fetch in the background
  try {
    const res = await fetch(REMOTE_CONTENT_URL, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json && typeof json === 'object') {
      inMemoryCache = json;
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(json));
        await AsyncStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      } catch (e) { /* swallow */ }
      return json;
    }
  } catch (e) {
    if (__DEV__) console.log('Remote content fetch failed (using bundled):', e?.message);
  }

  // Fall back to stale disk cache if available
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      inMemoryCache = JSON.parse(raw);
      return inMemoryCache;
    }
  } catch (e) { /* swallow */ }

  return null;
}

/**
 * Schedules a periodic refresh while the app is foregrounded.
 * Call this once from AppContext after bootstrap.
 */
export function startRemoteContentRefresh(onUpdate) {
  // Initial fetch
  getRemoteContent().then((content) => {
    if (content && onUpdate) onUpdate(content);
  }).catch(() => {});
  // Periodic refresh while app is alive
  const id = setInterval(() => {
    getRemoteContent({ force: true }).then((content) => {
      if (content && onUpdate) onUpdate(content);
    }).catch(() => {});
  }, REFRESH_INTERVAL_MS);
  return () => clearInterval(id);
}

/**
 * Merges remote overrides into a bundled defaults array (keyed by `id`).
 * Returns a new array where remote entries replace local ones by id,
 * and any additional remote entries are appended.
 */
export function mergeById(localArr, remoteArr) {
  if (!Array.isArray(remoteArr)) return localArr;
  const byId = new Map(localArr.map((x) => [x.id, x]));
  for (const item of remoteArr) {
    if (item && item.id) byId.set(item.id, { ...byId.get(item.id), ...item });
  }
  return Array.from(byId.values());
}

/**
 * Builds the effective content set by merging bundled defaults with
 * the optional remote overrides.
 */
export function applyRemote(bundled, remote) {
  if (!remote) return bundled;
  return {
    dailyTasks: mergeById(bundled.dailyTasks || [], remote.dailyTasks),
    agePhases:  mergeById(bundled.agePhases  || [], remote.agePhases),
    topics:     mergeById(bundled.topics     || [], remote.topics),
    diseases:   mergeById(bundled.diseases   || [], remote.diseases),
    marketRef:  { ...(bundled.marketRef || {}), ...(remote.marketRef || {}) },
    notice:     remote.notice || null,
    version:    remote.version || 'bundled',
  };
}
