import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useApp } from './AppContext';
import {
  checkForUpdates,
  applyOtaUpdate,
  downloadAndInstallApk,
  getInstalledVersion,
  setSkippedVersionCode,
  getSkippedVersionCode,
  shouldAutoCheck,
} from '../services/UpdateService';

/**
 * UpdateContext — owns the lifecycle of the hybrid in-app updater and
 * exposes a tiny surface for the banner/modal UI.
 *
 * status:
 *   'idle'           nothing to do / not yet checked
 *   'checking'       a manual check is in flight
 *   'available'      an update was found and surfaced (banner/modal shows)
 *   'downloading'    APK is downloading (see `progress`)
 *   'installing'     OTA reloading, or system installer launched
 *   'needsPermission' user must grant "install unknown apps", then retry
 *   'uptodate'       a manual check found nothing (transient, for a toast)
 *   'error'          last action failed
 */
const UpdateContext = createContext(null);

const INITIAL = {
  status: 'idle',
  update: null,        // last check result: {type, manifest?, installed, mandatory?}
  progress: 0,         // 0..1 during APK download
  installed: null,     // {versionName, versionCode, packageName}
  surfaced: false,     // whether the banner/modal should be visible
  mandatory: false,    // forced update — can't be dismissed
};

export function UpdateProvider({ children }) {
  const { ready, onboardingDone } = useApp();
  const [state, setState] = useState(INITIAL);
  const busyRef = useRef(false); // guards against overlapping checks/applies
  const patch = useCallback((p) => setState((s) => ({ ...s, ...p })), []);

  // Resolve the installed version once for display (Settings footer etc.).
  useEffect(() => {
    let cancelled = false;
    getInstalledVersion().then((v) => {
      if (!cancelled) setState((s) => ({ ...s, installed: v }));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /**
   * Runs a check and decides whether to surface the banner.
   * @param {{silent?:boolean}} opts  silent=true → automatic background check
   *        (no spinner, respects the per-version "skip", no "up to date" state)
   */
  const checkNow = useCallback(async ({ silent = false } = {}) => {
    if (busyRef.current) return;
    busyRef.current = true;
    if (!silent) patch({ status: 'checking' });
    try {
      const result = await checkForUpdates({ force: !silent });

      if (result.type === 'none') {
        patch({
          update: result,
          installed: result.installed,
          surfaced: false,
          mandatory: false,
          status: silent ? 'idle' : 'uptodate',
        });
        return result;
      }

      // An update exists (apk or ota).
      let surfaced = true;
      const mandatory = !!result.mandatory;

      // On a SILENT check, honor a previously skipped APK version so we
      // don't nag. A manual check always surfaces (force ignores skip).
      if (silent && result.type === 'apk' && !mandatory) {
        const skipped = await getSkippedVersionCode();
        if (skipped && skipped === result.manifest.versionCode) surfaced = false;
      }

      patch({
        update: result,
        installed: result.installed,
        mandatory,
        surfaced,
        status: surfaced ? 'available' : 'idle',
      });
      return result;
    } catch (e) {
      patch({ status: silent ? 'idle' : 'error' });
      return { type: 'none' };
    } finally {
      busyRef.current = false;
    }
  }, [patch]);

  /**
   * Applies the surfaced update. Routes by channel:
   *   OTA → fetch + reload (process restarts).
   *   APK → download (with progress) then launch the system installer.
   */
  const applyUpdate = useCallback(async () => {
    const result = state.update;
    if (!result || result.type === 'none') return;

    if (result.type === 'ota') {
      patch({ status: 'installing' });
      const ok = await applyOtaUpdate(); // reloads on success
      if (!ok) patch({ status: 'error' });
      return;
    }

    // APK path
    if (busyRef.current) return;
    busyRef.current = true;
    patch({ status: 'downloading', progress: 0 });
    try {
      const outcome = await downloadAndInstallApk(
        result.manifest.apkUrl,
        (p) => patch({ progress: p })
      );
      if (outcome === 'NEEDS_PERMISSION') {
        // Native already opened the "install unknown apps" settings page.
        patch({ status: 'needsPermission' });
      } else {
        // System installer is now in the foreground; keep a calm state.
        patch({ status: 'installing' });
      }
    } catch (e) {
      patch({ status: 'error' });
    } finally {
      busyRef.current = false;
    }
  }, [state.update, patch]);

  /**
   * Dismisses a non-mandatory update. Hides the banner this session and,
   * for APK updates, records the version so future automatic checks stay
   * quiet (a manual check can still resurface it).
   */
  const dismiss = useCallback(async () => {
    if (state.mandatory) return;
    if (state.update && state.update.type === 'apk' && state.update.manifest) {
      await setSkippedVersionCode(state.update.manifest.versionCode);
    }
    patch({ surfaced: false, status: 'idle' });
  }, [state.mandatory, state.update, patch]);

  /** Clears a transient 'uptodate'/'error' status (e.g. after a toast). */
  const resetStatus = useCallback(() => {
    patch({ status: state.surfaced ? 'available' : 'idle' });
  }, [state.surfaced, patch]);

  // ── Automatic, throttled checks ───────────────────────────────────────
  // Once the app is ready & past onboarding, do a silent check shortly after
  // launch, then again whenever the app returns to the foreground.
  useEffect(() => {
    if (!ready || !onboardingDone) return;
    let cancelled = false;

    const maybeCheck = async () => {
      if (cancelled) return;
      if (await shouldAutoCheck()) checkNow({ silent: true });
    };

    // Defer the first check so launch/permission prompts settle first.
    const t = setTimeout(maybeCheck, 6000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') maybeCheck();
    });
    return () => { cancelled = true; clearTimeout(t); sub.remove(); };
  }, [ready, onboardingDone, checkNow]);

  const value = useMemo(() => ({
    ...state,
    checkNow,
    applyUpdate,
    dismiss,
    resetStatus,
  }), [state, checkNow, applyUpdate, dismiss, resetStatus]);

  return (
    <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>
  );
}

export function useUpdates() {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error('useUpdates must be used within UpdateProvider');
  return ctx;
}
