import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { I18nManager, AppState } from 'react-native';
import { Storage } from '../services/StorageService';
import { setActiveTheme, useTheme } from '../utils/colors';
import {
  drainSmsQueue,
  subscribeToSmsEvents,
  saveEmergencyContact,
  setAlertConfig,
  showAlertNotification,
  sendSms,
  startMonitoring,
  scheduleDailyReminder,
  cancelDailyReminder,
} from '../services/SmsService';
import { computeFarmHealth } from '../utils/farmHealth';
import { generateInsights } from '../services/Insights';
import { actionFor } from '../utils/actionSteps';
import { startRemoteContentRefresh } from '../services/RemoteContent';
import { makePhoneCall, makeDirectCall } from '../services/CallService';
import { vibrateDanger, vibrateWarn } from '../services/AlertService';
import { parseSms } from '../utils/smsParser';
import { DEFAULT_THRESHOLDS, sensorStatus } from '../utils/thresholds';
import { STATUS } from '../utils/colors';
import { uid } from '../utils/ids';
import { DEFAULT_LANG, isRTL, makeT } from '../translations';

const DEFAULT_SETTINGS = {
  farmerName: '',
  farmName: '',
  alertSound: true,
  vibrate: true,
  emergencyContact: '',
  autoCall: false,
  autoCallOnDanger: false,
  autoCallOnPowerCut: false,
  autoSmsOnDanger: false,
  // One-time acknowledgement of the "mute the device SMS thread" guide.
  smsGuideAck: false,
};

const SENSOR_KEYS = ['co2', 'nh3', 'temp', 'hum'];
// Throttle alert re-fires per (device, sensor) so a stuck-in-danger reading
// doesn't spam the user. Once danger fires, suppress for this window.
const DANGER_REFIRE_MS = 10 * 60 * 1000; // 10 minutes

function initialState() {
  return {
    ready: false,
    onboardingDone: false,
    language: DEFAULT_LANG,
    theme: 'light',
    farms: [],
    devices: [],
    readings: {},
    alerts: [],
    settings: { ...DEFAULT_SETTINGS },
    thresholds: { ...DEFAULT_THRESHOLDS },
    powerCut: {},
    now: Date.now(),
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'BOOTSTRAP':
      return { ...state, ...action.payload, ready: true };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_ONBOARDING_DONE':
      return { ...state, onboardingDone: action.payload };
    case 'SET_FARMS':
      return { ...state, farms: action.payload };
    case 'SET_DEVICES':
      return { ...state, devices: action.payload };
    case 'SET_ALERTS':
      return { ...state, alerts: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_THRESHOLDS':
      return { ...state, thresholds: action.payload };
    case 'SET_POWER_CUT':
      return { ...state, powerCut: action.payload };
    case 'SET_DEVICE_READINGS':
      return {
        ...state,
        readings: { ...state.readings, [action.deviceId]: action.payload },
      };
    case 'TICK':
      return { ...state, now: Date.now() };
    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // dangerStateRef tracks per-device per-sensor danger state to detect transitions
  // shape: { [deviceId]: { [sensorKey]: { status: 'ok'|'warn'|'danger', firedAt: number } } }
  const dangerStateRef = useRef({});

  const t = useMemo(() => makeT(state.language), [state.language]);
  const tRef = useRef(t);
  tRef.current = t;

  // ---------- Bootstrap ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [
        onboardingDone,
        savedLang,
        savedTheme,
        farms,
        devices,
        alerts,
        settings,
        thresholds,
        powerCut,
      ] = await Promise.all([
        Storage.getOnboardingDone(),
        Storage.getLanguage(),
        Storage.getTheme(),
        Storage.getFarms(),
        Storage.getDevices(),
        Storage.getAlerts(),
        Storage.getSettings(),
        Storage.getThresholds(),
        Storage.getPowerCut(),
      ]);

      const theme = savedTheme || 'light';
      setActiveTheme(theme);

      const readings = {};
      await Promise.all(
        (devices || []).map(async (d) => {
          readings[d.id] = await Storage.getReadings(d.id);
        })
      );

      const language = savedLang || DEFAULT_LANG;
      const rtl = isRTL(language);
      try {
        I18nManager.allowRTL(rtl);
        if (I18nManager.isRTL !== rtl) I18nManager.forceRTL(rtl);
      } catch (e) {}

      if (cancelled) return;

      const finalSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };

      // Sync emergency contact to native prefs on boot so SmsReceiver has it
      if (finalSettings.emergencyContact) {
        saveEmergencyContact(finalSettings.emergencyContact).catch(() => {});
      }

      dispatch({
        type: 'BOOTSTRAP',
        payload: {
          onboardingDone: !!onboardingDone,
          language,
          theme,
          farms: farms || [],
          devices: devices || [],
          readings,
          alerts: alerts || [],
          settings: finalSettings,
          thresholds: { ...DEFAULT_THRESHOLDS, ...(thresholds || {}) },
          powerCut: powerCut || {},
        },
      });
    })();
    return () => { cancelled = true; };
  }, []);

  // ---------- Tick every minute ----------
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'TICK' }), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // ---------- Force an immediate tick when the app returns to foreground ----------
  // Without this, after the app was backgrounded across a day rollover the
  // flock age could appear stale for up to 60 s until the next interval fires.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') dispatch({ type: 'TICK' });
    });
    return () => sub.remove();
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // Core: client-side threshold breach detection.
  // For each sensor on a reading, compare against thresholds and detect
  // transitions to/from DANGER. Fire the alert pipeline accordingly.
  // ─────────────────────────────────────────────────────────────────────
  const evaluateReadingForDanger = useCallback(async (device, reading, nativeHandled = false) => {
    if (!device || !reading) return;
    const s = stateRef.current;
    const thresholds = s.thresholds;
    const now = Date.now();

    if (!dangerStateRef.current[device.id]) {
      dangerStateRef.current[device.id] = {};
    }
    const devState = dangerStateRef.current[device.id];

    const sensorMessages = {
      co2:  tRef.current('co2Danger'),
      nh3:  tRef.current('ammoniaDanger'),
      temp: tRef.current('tempDanger'),
      hum:  tRef.current('humDanger'),
    };
    const sensorLabels = {
      co2:  tRef.current('co2'),
      nh3:  tRef.current('nh3'),
      temp: tRef.current('temperature'),
      hum:  tRef.current('humidity'),
    };
    const sensorUnits = { co2: 'ppm', nh3: 'ppm', temp: '°C', hum: '%' };

    let firedAny = false;
    const newAlerts = [];

    for (const key of SENSOR_KEYS) {
      const value = reading[key];
      if (value === null || value === undefined || isNaN(value)) continue;

      const status = sensorStatus(key, value, thresholds);
      const prev = devState[key] || { status: STATUS.OK, firedAt: 0 };

      // DANGER transition (or refire after cooldown)
      if (status === STATUS.DANGER) {
        const isNew = prev.status !== STATUS.DANGER;
        const cooledDown = now - (prev.firedAt || 0) > DANGER_REFIRE_MS;
        if (isNew || cooledDown) {
          firedAny = true;
          const farm = s.farms.find((f) => f.id === device.farmId);
          const farmName = farm ? farm.name : (s.settings.farmName || '');
          newAlerts.push({
            id: uid('a_'),
            deviceId: device.id,
            deviceName: device.name,
            farmName,
            type: 'ALERT',
            subType: key.toUpperCase(),
            message: `${sensorMessages[key]} (${value.toFixed(1)} ${sensorUnits[key]})`,
            timestamp: reading.timestamp || now,
            acknowledged: false,
          });
          devState[key] = { status: STATUS.DANGER, firedAt: now };

          // Only fire notification from JS when native didn't already handle.
          // Real SMS arrivals are handled by SmsReceiver natively.
          if (!nativeHandled) {
            const action = actionFor(key, s.language);
            const whatToDo = tRef.current('whatToDo') || 'What to do';
            const body = `${sensorMessages[key]}\n${value.toFixed(1)} ${sensorUnits[key]} (${tRef.current('maxLevel') || 'max'} ${thresholds[key].danger})\n\n▶ ${whatToDo}:\n${action}`;
            showAlertNotification(
              `🚨 ${device.name} — ${sensorLabels[key]}`,
              body,
              true
            ).catch(() => {});
          }
        } else {
          devState[key] = { ...prev, status: STATUS.DANGER };
        }
      } else if (status === STATUS.WARN) {
        // Track warn but don't fire heavy notifications
        if (prev.status === STATUS.DANGER) {
          // Recovered from danger
          const farm = s.farms.find((f) => f.id === device.farmId);
          const farmName = farm ? farm.name : (s.settings.farmName || '');
          newAlerts.push({
            id: uid('a_'),
            deviceId: device.id,
            deviceName: device.name,
            farmName,
            type: 'CLEAR',
            subType: key.toUpperCase(),
            message: tRef.current('alertCleared'),
            timestamp: now,
            acknowledged: false,
          });
        }
        devState[key] = { status: STATUS.WARN, firedAt: 0 };
      } else {
        // OK
        if (prev.status === STATUS.DANGER) {
          const farm = s.farms.find((f) => f.id === device.farmId);
          const farmName = farm ? farm.name : (s.settings.farmName || '');
          newAlerts.push({
            id: uid('a_'),
            deviceId: device.id,
            deviceName: device.name,
            farmName,
            type: 'CLEAR',
            subType: key.toUpperCase(),
            message: tRef.current('alertCleared'),
            timestamp: now,
            acknowledged: false,
          });
        }
        devState[key] = { status: STATUS.OK, firedAt: 0 };
      }
    }

    if (newAlerts.length > 0) {
      const merged = [...newAlerts, ...s.alerts].slice(0, 500);
      await Storage.setAlerts(merged);
      dispatch({ type: 'SET_ALERTS', payload: merged });
    }

    if (firedAny) {
      // Vibration always fires — it's a foreground UX cue
      if (s.settings.vibrate) vibrateDanger();

      // Skip call/SMS if native receiver already fired the pipeline
      if (nativeHandled) return;

      const num = (s.settings.emergencyContact || '').trim();
      const shouldAutoCall = num && (s.settings.autoCall || s.settings.autoCallOnDanger);
      if (shouldAutoCall) {
        makeDirectCall(num).catch(() => {});
      }
      if (num && s.settings.autoSmsOnDanger) {
        const lang = s.language;
        const dangerAlerts = newAlerts.filter((a) => a.type === 'ALERT').slice(0, 3);
        const dangerLines = dangerAlerts.map((a) => `• ${a.message}`).join('\n');
        const primaryKey = (dangerAlerts[0]?.subType || 'GENERIC').toLowerCase();
        const action = actionFor(primaryKey, lang);
        const whatToDo = tRef.current('whatToDo') || 'What to do';
        const body =
          `🚨 Filaha Flock\n${device.name} (${device.id}):\n` +
          dangerLines +
          `\n\n▶ ${whatToDo}: ${action}` +
          `\n${new Date().toLocaleTimeString()}`;
        sendSms(num, body).catch(() => {});
      }
    }
  }, []);

  // ---------- SMS handlers ----------
  const handleParsedMessage = useCallback(async (parsed, nativeHandled = false) => {
    if (!parsed) return;
    const s = stateRef.current;
    const deviceId = parsed.deviceId;
    const device = s.devices.find((d) => d.id === deviceId);
    if (!device) return;

    const deviceName = device.name;
    const farm = s.farms.find((f) => f.id === device.farmId);
    const farmName = farm ? farm.name : (s.settings.farmName || '');

    if (parsed.kind === 'data') {
      const list = await Storage.appendReading(deviceId, parsed.reading);
      dispatch({ type: 'SET_DEVICE_READINGS', deviceId, payload: list });

      // Auto-clear power cut on data
      if (s.powerCut[deviceId]) {
        const next = { ...s.powerCut, [deviceId]: false };
        await Storage.setPowerCut(next);
        dispatch({ type: 'SET_POWER_CUT', payload: next });
      }

      // ★ THRESHOLD-BREACH DETECTION
      await evaluateReadingForDanger(device, parsed.reading, nativeHandled);
      return;
    }

    if (parsed.kind === 'alert' || parsed.kind === 'clear') {
      const alert = {
        id: uid('a_'),
        deviceId,
        deviceName,
        farmName,
        type: parsed.kind === 'alert' ? 'ALERT' : 'CLEAR',
        subType: parsed.subType || 'GENERIC',
        message: parsed.message,
        timestamp: parsed.timestamp,
        acknowledged: false,
      };

      const nextAlerts = [alert, ...s.alerts].slice(0, 500);
      await Storage.setAlerts(nextAlerts);
      dispatch({ type: 'SET_ALERTS', payload: nextAlerts });

      // Power cut tracking
      if (parsed.subType === 'POWER_CUT' && parsed.kind === 'alert') {
        const next = { ...s.powerCut, [deviceId]: true };
        await Storage.setPowerCut(next);
        dispatch({ type: 'SET_POWER_CUT', payload: next });
      } else if (parsed.kind === 'clear') {
        const next = { ...s.powerCut, [deviceId]: false };
        await Storage.setPowerCut(next);
        dispatch({ type: 'SET_POWER_CUT', payload: next });
      }

      if (parsed.kind === 'alert') {
        if (s.settings.vibrate) vibrateDanger();
        // Skip native triggers if native already handled
        if (!nativeHandled) {
          const num = (s.settings.emergencyContact || '').trim();
          const shouldAutoCallDanger = (s.settings.autoCall || s.settings.autoCallOnDanger) &&
            parsed.subType !== 'POWER_CUT';
          const shouldAutoCallPower = s.settings.autoCallOnPowerCut && parsed.subType === 'POWER_CUT';
          if (num && (shouldAutoCallDanger || shouldAutoCallPower)) {
            makeDirectCall(num).catch(() => {});
          }
        }
      } else if (s.settings.vibrate) {
        vibrateWarn();
      }
    }
  }, [evaluateReadingForDanger]);

  const handleSmsEvent = useCallback((event) => {
    if (!event || !event.message) return;
    const parsed = parseSms(event.message, event.timestamp);
    if (parsed) handleParsedMessage(parsed, !!event.nativeHandled);
  }, [handleParsedMessage]);

  // ---------- Drain queue + subscribe to events ----------
  useEffect(() => {
    if (!state.ready) return;
    let unsubscribe = () => {};

    (async () => {
      const queue = await drainSmsQueue();
      for (const item of queue) {
        const parsed = parseSms(item.message, item.timestamp);
        // Queue items were already processed by native SmsReceiver when
        // they arrived — JS just updates the UI now.
        if (parsed) await handleParsedMessage(parsed, true);
      }
    })();

    unsubscribe = subscribeToSmsEvents({
      onData: handleSmsEvent,
      onAlert: handleSmsEvent,
    });

    return () => unsubscribe();
  }, [state.ready, handleSmsEvent, handleParsedMessage]);

  // ---------- Re-evaluate when thresholds change ----------
  useEffect(() => {
    if (!state.ready) return;
    state.devices.forEach((device) => {
      const list = state.readings[device.id];
      if (!list || list.length === 0) return;
      const latest = list[list.length - 1];
      evaluateReadingForDanger(device, latest);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.thresholds, state.ready]);

  // ---------- Sync ALL alert config + i18n action steps to native SharedPreferences ----------
  useEffect(() => {
    if (!state.ready) return;
    const lang = state.language;
    setAlertConfig({
      language: lang,
      emergencyContact: state.settings.emergencyContact || '',
      autoCallOnDanger: !!(state.settings.autoCall || state.settings.autoCallOnDanger),
      autoSmsOnDanger: !!state.settings.autoSmsOnDanger,
      autoCallOnPowerCut: !!state.settings.autoCallOnPowerCut,
      thresholds: state.thresholds,
      // Localized action steps so background notifications/SMS speak the user's language
      actionCo2: actionFor('co2', lang),
      actionNh3: actionFor('nh3', lang),
      actionTemp: actionFor('temp', lang),
      actionTempLow: actionFor('temp_low', lang),
      actionHum: actionFor('hum', lang),
      actionPowerCut: actionFor('power_cut', lang),
      actionBattery: actionFor('battery', lang),
      actionGeneric: actionFor('generic', lang),
      alertLabel: t('danger'),
      checkNowLabel: t('checkNow'),
      whatToDoLabel: t('whatToDo'),
      clearedLabel: t('alertCleared'),
    }).catch(() => {});
  }, [
    state.ready,
    state.language,
    state.settings.emergencyContact,
    state.settings.autoCall,
    state.settings.autoCallOnDanger,
    state.settings.autoSmsOnDanger,
    state.settings.autoCallOnPowerCut,
    state.thresholds,
    t,
  ]);

  // ---------- Silently fetch & refresh remote Guide content ----------
  // Runs in background once app is ready. Failure is non-fatal — bundled
  // content is the fallback.
  useEffect(() => {
    if (!state.ready) return;
    const stop = startRemoteContentRefresh(() => {
      // Future: dispatch event so Guide screen re-renders with new content
    });
    return () => stop();
  }, [state.ready]);

  // ---------- Auto-start the foreground monitoring service ----------
  // Delayed by 3s so the JS bundle has fully rendered before we tell the OS
  // to spin up a foreground service — avoids ForegroundServiceDidNotStartInTimeException
  // crashes that present as a white screen on Android 14.
  useEffect(() => {
    if (!state.ready) return;
    const id = setTimeout(() => {
      startMonitoring(
        t('monitoringActive') || 'Filaha Flock',
        t('monitoringActiveBody') || 'Watching your coops 24/7'
      ).catch(() => {});
    }, 3000);
    return () => clearTimeout(id);
  }, [state.ready, t]);

  // ---------- Smart daily health notification ----------
  // If the farm isn't 100%, schedule a morning notification that NAMES the
  // single most important issue (not generic text). Tapping it opens the
  // app where that same guidance is embedded in the dashboard card + the
  // Insights tab. Rescheduled only when the summary actually changes, so
  // we never spam AlarmManager on every incoming reading.
  const reminderSigRef = useRef('');
  const lastImmediateRef = useRef({ sig: '', at: 0 });
  useEffect(() => {
    if (!state.ready) return;
    const s = stateRef.current;
    const now = Date.now();

    let score = null;
    try {
      score = computeFarmHealth(s.devices, s.readings, s.thresholds, s.powerCut, now);
    } catch (e) { return; }

    // No coops yet, or perfect health → don't nag.
    if (score == null || (s.devices || []).length === 0) {
      if (reminderSigRef.current !== 'none') {
        reminderSigRef.current = 'none';
        cancelDailyReminder(1).catch(() => {});
      }
      return;
    }
    if (score >= 100) {
      if (reminderSigRef.current !== 'ok') {
        reminderSigRef.current = 'ok';
        cancelDailyReminder(1).catch(() => {});
      }
      return;
    }

    // Name the single most important issue in the notification body.
    let topTitle = '';
    try {
      const ins = generateInsights({
        devices: s.devices, readings: s.readings, thresholds: s.thresholds,
        alerts: s.alerts, now, t, language: s.language,
      });
      const weight = { danger: 4, warn: 3, info: 2, success: 1 };
      const top = [...ins].sort(
        (a, b) => (weight[b.severity] || 0) - (weight[a.severity] || 0)
      )[0];
      topTitle = top ? top.title : '';
    } catch (e) { /* fall back to score-only copy */ }

    const rounded = Math.round(score);
    const sig = `${rounded}|${topTitle}`;
    if (reminderSigRef.current === sig) return;
    reminderSigRef.current = sig;

    const title = t('healthCheckTitle') || 'Daily flock check';
    const body = topTitle
      || (t('healthCheckBody') || 'Some coops need attention ({score}%).')
        .replace('{score}', String(rounded));

    // Always keep the 8 AM digest armed…
    scheduleDailyReminder({ hour: 8, minute: 0, title, body, reqCode: 1 }).catch(() => {});

    // …but when health is genuinely poor, also fire an IMMEDIATE heads-up
    // instead of waiting for tomorrow morning. Dedup by signature + a 3h
    // floor so a flapping sensor can't spam the farmer.
    if (rounded < 60) {
      const sinceLast = now - (lastImmediateRef.current.at || 0);
      if (lastImmediateRef.current.sig !== sig && sinceLast > 3 * 60 * 60 * 1000) {
        lastImmediateRef.current = { sig, at: now };
        showAlertNotification(title, body, false).catch(() => {});
      }
    }
  }, [
    state.ready, state.devices, state.readings,
    state.thresholds, state.powerCut, state.language, t,
  ]);

  // ---------- Public actions ----------
  const setLanguage = useCallback(async (lang) => {
    await Storage.setLanguage(lang);
    const rtl = isRTL(lang);
    // Capture BEFORE forcing — a direction flip (Arabic ⇄ EN/FR) only
    // applies to native layout (the bottom tab bar, paddings, etc.) after
    // a full reload, so we restart automatically instead of leaving the
    // UI half-mirrored until the user kills the app.
    const directionChanged = I18nManager.isRTL !== rtl;
    try {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
    } catch (e) {}
    dispatch({ type: 'SET_LANGUAGE', payload: lang });
    if (directionChanged) {
      try {
        const Updates = require('expo-updates');
        if (Updates && typeof Updates.reloadAsync === 'function') {
          setTimeout(() => { Updates.reloadAsync().catch(() => {}); }, 400);
        }
      } catch (e) { /* standalone reload unavailable — user restarts manually */ }
    }
  }, []);

  const setTheme = useCallback(async (theme) => {
    setActiveTheme(theme);
    await Storage.setTheme(theme);
    dispatch({ type: 'SET_THEME', payload: theme });
  }, []);

  const completeOnboarding = useCallback(async () => {
    await Storage.setOnboardingDone(true);
    dispatch({ type: 'SET_ONBOARDING_DONE', payload: true });
  }, []);

  const addDevice = useCallback(async ({ name, deviceId, farmId, chickAgeDays, breed, strain }) => {
    const s = stateRef.current;
    let farms = s.farms;
    let resolvedFarmId = farmId;
    if (!resolvedFarmId) {
      if (s.farms.length === 0) {
        const farm = { id: uid('f_'), name: s.settings.farmName || (tRef.current('myFarm') || 'My farm') };
        farms = [farm];
        await Storage.setFarms(farms);
        resolvedFarmId = farm.id;
      } else {
        resolvedFarmId = s.farms[0].id;
      }
    }

    const exists = s.devices.find((d) => d.id.toUpperCase() === String(deviceId).toUpperCase());
    if (exists) return { ok: false, reason: 'duplicate' };

    // Compute chick arrival date from age input (defaults to today = day 1)
    const now = Date.now();
    const ageDays = Number.isFinite(chickAgeDays) ? Math.max(0, Math.floor(chickAgeDays)) : 0;
    const chickArrivalDate = now - ageDays * 24 * 60 * 60 * 1000;

    const device = {
      id: String(deviceId).toUpperCase(),
      name: name || deviceId,
      farmId: resolvedFarmId,
      createdAt: now,
      chickArrivalDate,
      breed: breed || 'broiler',
      strain: strain || null,
    };
    const devices = [...s.devices, device];
    await Storage.setDevices(devices);
    dispatch({ type: 'SET_DEVICES', payload: devices });
    if (farms !== s.farms) dispatch({ type: 'SET_FARMS', payload: farms });
    return { ok: true, device };
  }, []);

  const updateDevice = useCallback(async (deviceId, patch) => {
    const s = stateRef.current;
    const idx = s.devices.findIndex((d) => d.id === deviceId);
    if (idx === -1) return { ok: false, reason: 'notfound' };

    const prev = s.devices[idx];
    const next = { ...prev };

    if (patch.name != null) next.name = String(patch.name).trim() || prev.name;
    if (patch.breed != null) next.breed = patch.breed;
    if (patch.strain !== undefined) next.strain = patch.strain;
    // Re-derive the arrival date if the farmer corrected the flock age.
    if (patch.chickAgeDays != null && Number.isFinite(patch.chickAgeDays)) {
      const ageDays = Math.max(0, Math.floor(patch.chickAgeDays));
      next.chickArrivalDate = Date.now() - ageDays * 24 * 60 * 60 * 1000;
    }

    const devices = s.devices.map((d, i) => (i === idx ? next : d));
    await Storage.setDevices(devices);
    dispatch({ type: 'SET_DEVICES', payload: devices });
    return { ok: true, device: next };
  }, []);

  const removeDevice = useCallback(async (deviceId) => {
    const s = stateRef.current;
    const devices = s.devices.filter((d) => d.id !== deviceId);
    await Storage.setDevices(devices);
    await Storage.clearReadings(deviceId);
    const alerts = s.alerts.filter((a) => a.deviceId !== deviceId);
    await Storage.setAlerts(alerts);
    const power = { ...s.powerCut };
    delete power[deviceId];
    await Storage.setPowerCut(power);
    delete dangerStateRef.current[deviceId];
    dispatch({ type: 'SET_DEVICES', payload: devices });
    dispatch({ type: 'SET_ALERTS', payload: alerts });
    dispatch({ type: 'SET_POWER_CUT', payload: power });
    dispatch({ type: 'SET_DEVICE_READINGS', deviceId, payload: [] });
  }, []);

  const acknowledgeAlert = useCallback(async (alertId) => {
    const s = stateRef.current;
    const alerts = s.alerts.map((a) =>
      a.id === alertId ? { ...a, acknowledged: true } : a
    );
    await Storage.setAlerts(alerts);
    dispatch({ type: 'SET_ALERTS', payload: alerts });
  }, []);

  const clearAllAlerts = useCallback(async () => {
    await Storage.setAlerts([]);
    dispatch({ type: 'SET_ALERTS', payload: [] });
  }, []);

  const updateSettings = useCallback(async (patch) => {
    const s = stateRef.current;
    let next = { ...s.settings, ...patch };

    // Whenever a non-empty emergency contact is saved, force-enable all
    // auto-alert toggles so the app actually does something. The user can
    // turn them off afterward if they want.
    if (patch.emergencyContact !== undefined && patch.emergencyContact.trim()) {
      next = {
        ...next,
        autoCall: true,
        autoCallOnDanger: true,
        autoCallOnPowerCut: true,
        autoSmsOnDanger: true,
      };
    }

    await Storage.setSettings(next);
    dispatch({ type: 'SET_SETTINGS', payload: next });
    if (patch.emergencyContact !== undefined) {
      saveEmergencyContact(patch.emergencyContact || '').catch(() => {});
    }
  }, []);

  const updateThresholds = useCallback(async (patch) => {
    const s = stateRef.current;
    const next = { ...s.thresholds, ...patch };
    await Storage.setThresholds(next);
    dispatch({ type: 'SET_THRESHOLDS', payload: next });
  }, []);

  const resetThresholds = useCallback(async () => {
    await Storage.setThresholds(DEFAULT_THRESHOLDS);
    dispatch({ type: 'SET_THRESHOLDS', payload: { ...DEFAULT_THRESHOLDS } });
  }, []);

  const callEmergency = useCallback(async () => {
    const s = stateRef.current;
    const num = (s.settings.emergencyContact || '').trim();
    if (!num) return false;
    return await makeDirectCall(num);
  }, []);

  const injectMessage = useCallback((message, isAlert = false) => {
    handleSmsEvent({
      message,
      sender: 'SIMULATED',
      timestamp: Date.now(),
    });
  }, [handleSmsEvent]);

  const lastReadingFor = useCallback((deviceId) => {
    const list = state.readings[deviceId];
    if (!list || list.length === 0) return null;
    return list[list.length - 1];
  }, [state.readings]);

  const value = useMemo(() => ({
    ...state,
    t,
    rtl: isRTL(state.language),
    setLanguage,
    setTheme,
    completeOnboarding,
    addDevice,
    updateDevice,
    removeDevice,
    acknowledgeAlert,
    clearAllAlerts,
    updateSettings,
    updateThresholds,
    resetThresholds,
    callEmergency,
    injectMessage,
    lastReadingFor,
  }), [
    state, t,
    setLanguage, setTheme, completeOnboarding,
    addDevice, updateDevice, removeDevice,
    acknowledgeAlert, clearAllAlerts,
    updateSettings, updateThresholds, resetThresholds,
    callEmergency, injectMessage, lastReadingFor,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
