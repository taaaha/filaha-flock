import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { I18nManager, Vibration } from 'react-native';
import { Storage } from '../services/StorageService';
import {
  drainSmsQueue,
  subscribeToSmsEvents,
} from '../services/SmsService';
import { makePhoneCall } from '../services/CallService';
import { vibrateDanger, vibrateWarn } from '../services/AlertService';
import { parseSms } from '../utils/smsParser';
import { DEFAULT_THRESHOLDS } from '../utils/thresholds';
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
};

function initialState() {
  return {
    ready: false,
    onboardingDone: false,
    language: DEFAULT_LANG,
    farms: [],
    devices: [],
    readings: {}, // deviceId -> Reading[]
    alerts: [],
    settings: { ...DEFAULT_SETTINGS },
    thresholds: { ...DEFAULT_THRESHOLDS },
    powerCut: {}, // deviceId -> boolean
    now: Date.now(), // ticks every minute for relative timestamps
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'BOOTSTRAP':
      return { ...state, ...action.payload, ready: true };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
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

  const t = useMemo(() => makeT(state.language), [state.language]);

  // ---------- Bootstrap ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [
        onboardingDone,
        savedLang,
        farms,
        devices,
        alerts,
        settings,
        thresholds,
        powerCut,
      ] = await Promise.all([
        Storage.getOnboardingDone(),
        Storage.getLanguage(),
        Storage.getFarms(),
        Storage.getDevices(),
        Storage.getAlerts(),
        Storage.getSettings(),
        Storage.getThresholds(),
        Storage.getPowerCut(),
      ]);

      // Load readings for known devices
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
        if (I18nManager.isRTL !== rtl) {
          I18nManager.forceRTL(rtl);
        }
      } catch (e) {
        // ignore
      }

      if (cancelled) return;
      dispatch({
        type: 'BOOTSTRAP',
        payload: {
          onboardingDone: !!onboardingDone,
          language,
          farms: farms || [],
          devices: devices || [],
          readings,
          alerts: alerts || [],
          settings: { ...DEFAULT_SETTINGS, ...(settings || {}) },
          thresholds: { ...DEFAULT_THRESHOLDS, ...(thresholds || {}) },
          powerCut: powerCut || {},
        },
      });
    })();
    return () => { cancelled = true; };
  }, []);

  // ---------- Tick every minute for relative timestamps ----------
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'TICK' }), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // ---------- SMS handlers ----------
  const handleParsedMessage = useCallback(async (parsed) => {
    if (!parsed) return;
    const s = stateRef.current;
    const deviceId = parsed.deviceId;
    const device = s.devices.find((d) => d.id === deviceId);
    const deviceName = device ? device.name : deviceId;
    const farm = device ? s.farms.find((f) => f.id === device.farmId) : null;
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

      // Vibration / auto-call
      if (parsed.kind === 'alert') {
        if (s.settings.vibrate) vibrateDanger();
        const num = (s.settings.emergencyContact || '').trim();
        const shouldAutoCallDanger = (s.settings.autoCall || s.settings.autoCallOnDanger) &&
          parsed.subType !== 'POWER_CUT';
        const shouldAutoCallPower = s.settings.autoCallOnPowerCut && parsed.subType === 'POWER_CUT';
        if (num && (shouldAutoCallDanger || shouldAutoCallPower)) {
          makePhoneCall(num).catch(() => {});
        }
      } else if (s.settings.vibrate) {
        vibrateWarn();
      }
    }
  }, []);

  const handleSmsEvent = useCallback((event) => {
    if (!event || !event.message) return;
    const parsed = parseSms(event.message, event.timestamp);
    if (parsed) handleParsedMessage(parsed);
  }, [handleParsedMessage]);

  // ---------- Drain queue + subscribe to events ----------
  useEffect(() => {
    if (!state.ready) return;
    let unsubscribe = () => {};

    (async () => {
      const queue = await drainSmsQueue();
      for (const item of queue) {
        const parsed = parseSms(item.message, item.timestamp);
        if (parsed) await handleParsedMessage(parsed);
      }
    })();

    unsubscribe = subscribeToSmsEvents({
      onData: handleSmsEvent,
      onAlert: handleSmsEvent,
    });

    return () => unsubscribe();
  }, [state.ready, handleSmsEvent, handleParsedMessage]);

  // ---------- Public actions ----------
  const setLanguage = useCallback(async (lang) => {
    await Storage.setLanguage(lang);
    const rtl = isRTL(lang);
    try {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
    } catch (e) {
      // ignore
    }
    dispatch({ type: 'SET_LANGUAGE', payload: lang });
  }, []);

  const completeOnboarding = useCallback(async () => {
    await Storage.setOnboardingDone(true);
    dispatch({ type: 'SET_ONBOARDING_DONE', payload: true });
  }, []);

  const addDevice = useCallback(async ({ name, deviceId, farmId }) => {
    const s = stateRef.current;
    let farms = s.farms;
    let resolvedFarmId = farmId;
    if (!resolvedFarmId) {
      if (s.farms.length === 0) {
        const farm = {
          id: uid('f_'),
          name: s.settings.farmName || 'My farm',
        };
        farms = [farm];
        await Storage.setFarms(farms);
        resolvedFarmId = farm.id;
      } else {
        resolvedFarmId = s.farms[0].id;
      }
    }

    const exists = s.devices.find(
      (d) => d.id.toUpperCase() === String(deviceId).toUpperCase()
    );
    if (exists) {
      return { ok: false, reason: 'duplicate' };
    }

    const device = {
      id: String(deviceId).toUpperCase(),
      name: name || deviceId,
      farmId: resolvedFarmId,
      createdAt: Date.now(),
    };
    const devices = [...s.devices, device];
    await Storage.setDevices(devices);
    dispatch({ type: 'SET_DEVICES', payload: devices });
    if (farms !== s.farms) dispatch({ type: 'SET_FARMS', payload: farms });
    return { ok: true, device };
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
    const next = { ...s.settings, ...patch };
    await Storage.setSettings(next);
    dispatch({ type: 'SET_SETTINGS', payload: next });
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
    return await makePhoneCall(num);
  }, []);

  // Direct hook for testing/simulation buttons
  const injectMessage = useCallback((message, isAlert = false) => {
    handleSmsEvent({
      message,
      sender: 'SIMULATED',
      timestamp: Date.now(),
    });
  }, [handleSmsEvent]);

  // ---------- Derived helpers ----------
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
    completeOnboarding,
    addDevice,
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
    setLanguage, completeOnboarding,
    addDevice, removeDevice,
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
