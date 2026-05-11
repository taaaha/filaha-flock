import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  NativeModules,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import { TextInput } from 'react-native';
import Icon from '../components/Icon';
import { useApp } from '../contexts/AppContext';
import { colors, STATUS, statusColor, shadows } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import { deviceStatus, statusPriority } from '../utils/thresholds';
import { buildFakeDataSms } from '../utils/smsParser';
import { actionFor } from '../utils/actionSteps';
import { sensorStatus } from '../utils/thresholds';
import { BREEDS, STRAINS_BY_BREED, strainLabel, heatStressTHI } from '../utils/poultryData';
import CoopCard from '../components/CoopCard';
import SummaryBar from '../components/SummaryBar';
import PrimaryButton from '../components/PrimaryButton';
import Field from '../components/Field';
import { showToast } from '../components/Toast';
import {
  checkSmsPermission,
  checkCallPermission,
  checkSendSmsPermission,
  checkNotificationsEnabled,
  requestSmsPermissions,
  requestCallPermission,
  requestSendSmsPermission,
  requestNotificationPermission,
  getNativeVersion,
  listMissingNativeMethods,
  EXPECTED_NATIVE_VERSION,
} from '../services/SmsService';

function HeroBackdrop({ heroColor }) {
  // Subtle gradient under the header
  return (
    <Svg height="180" width="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id="hero" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={heroColor} stopOpacity="0.18" />
          <Stop offset="1" stopColor={colors.bg} stopOpacity="0" />
        </SvgLinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="180" fill="url(#hero)" />
    </Svg>
  );
}

export default function DashboardScreen({ navigation }) {
  const {
    t, language,
    devices, settings, thresholds, powerCut,
    lastReadingFor, addDevice, injectMessage, now,
  } = useApp();

  const [modalVisible, setModalVisible] = useState(false);
  const [coopName, setCoopName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [chickAge, setChickAge] = useState('');
  const [breed, setBreed] = useState('broiler');
  const [strain, setStrain] = useState('cobb500');
  const [error, setError] = useState('');
  const [permIssue, setPermIssue] = useState(null);
  const [buildIssue, setBuildIssue] = useState(null);
  const [query, setQuery] = useState('');
  const styles = useStyles(makeStyles);

  // Detect outdated APK
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const missing = listMissingNativeMethods();
      const ver = await getNativeVersion();
      if (cancelled) return;
      if (missing.length > 0) {
        setBuildIssue({ kind: 'missing', detail: missing.join(', ') });
      } else if (ver !== EXPECTED_NATIVE_VERSION) {
        setBuildIssue({ kind: 'mismatch', detail: `${ver || 'unknown'} ≠ ${EXPECTED_NATIVE_VERSION}` });
      } else {
        setBuildIssue(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [sms, call, sendSms, notif] = await Promise.all([
        checkSmsPermission(),
        checkCallPermission(),
        checkSendSmsPermission(),
        checkNotificationsEnabled(),
      ]);
      if (cancelled) return;
      if (!sms) setPermIssue({ key: 'sms', label: t('smsPermission'), action: requestSmsPermissions });
      else if (!call) setPermIssue({ key: 'call', label: t('callPermission'), action: requestCallPermission });
      else if (!sendSms) setPermIssue({ key: 'sendSms', label: t('sendSmsPermission'), action: requestSendSmsPermission });
      else if (!notif) setPermIssue({ key: 'notif', label: t('notificationPermission'), action: requestNotificationPermission });
      else setPermIssue(null);
    })();
    return () => { cancelled = true; };
  }, [t, now]);

  const augmented = useMemo(() => devices.map((d) => {
    const reading = lastReadingFor(d.id);
    const isPowerCut = !!powerCut[d.id];
    const status = deviceStatus(d, reading, thresholds, now, isPowerCut);
    return { device: d, reading, status };
  }), [devices, lastReadingFor, thresholds, powerCut, now]);

  const sorted = useMemo(() =>
    [...augmented].sort((a, b) => statusPriority(a.status) - statusPriority(b.status)),
    [augmented]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(({ device }) =>
      device.name.toLowerCase().includes(q) ||
      device.id.toLowerCase().includes(q)
    );
  }, [sorted, query]);

  const counts = useMemo(() => {
    let ok = 0, warn = 0, danger = 0, offline = 0;
    augmented.forEach(({ status }) => {
      if (status === STATUS.OK) ok++;
      else if (status === STATUS.WARN) warn++;
      else if (status === STATUS.DANGER || status === STATUS.POWER_CUT) danger++;
      else offline++;
    });
    return { total: augmented.length, ok, warn, danger, offline };
  }, [augmented]);

  const farmName = (settings && settings.farmName) || '';
  const farmerName = (settings && settings.farmerName) || '';
  const anyDanger = counts.danger > 0;

  // Per-coop danger details for the actionable banner. Defensive against any
  // missing device/reading fields so a corrupt entry doesn't white-screen the app.
  const dangerDetails = useMemo(() => {
    try {
      const SENSOR_LABEL = {
        co2: t('co2Short'), nh3: t('nh3Short'),
        temp: t('tempShort'), hum: t('humShort'),
      };
      const SENSOR_UNIT = { co2: 'ppm', nh3: 'ppm', temp: '°C', hum: '%' };
      const out = [];
      augmented.forEach(({ device, reading, status }) => {
        if (!device) return;

        if (status === STATUS.POWER_CUT) {
          out.push({
            device,
            sensorKey: 'power_cut',
            sensorLabel: t('powerCut'),
            valueText: '',
            action: actionFor('power_cut', language),
          });
          return;
        }

        // Heat-stress check (THI on temp + humidity)
        if (reading && typeof reading.temp === 'number' && typeof reading.hum === 'number'
            && !isNaN(reading.temp) && !isNaN(reading.hum)) {
          try {
            const hs = heatStressTHI(reading.temp, reading.hum);
            if (hs && (hs.tier === 'danger' || hs.tier === 'emergency')) {
              out.push({
                device,
                sensorKey: 'heat_stress',
                sensorLabel: `${t('heatStress')} • THI ${hs.thi}`,
                valueText: hs.tier === 'emergency' ? t('heatStressEmergency') : t('heatStressDanger'),
                action: actionFor('temp', language),
                highPriority: hs.tier === 'emergency',
              });
            }
          } catch (e) { /* swallow */ }
        }

        if (status !== STATUS.DANGER || !reading) return;
        for (const k of ['co2','nh3','temp','hum']) {
          const v = reading[k];
          if (v === null || v === undefined || isNaN(v)) continue;
          const st = sensorStatus(k, v, thresholds);
          if (st === STATUS.DANGER) {
            out.push({
              device,
              sensorKey: k,
              sensorLabel: SENSOR_LABEL[k],
              valueText: `${Math.round(v * 10) / 10} ${SENSOR_UNIT[k]}`,
              action: actionFor(k, language),
            });
            break;
          }
        }
      });
      out.sort((a, b) => (b.highPriority ? 1 : 0) - (a.highPriority ? 1 : 0));
      return out;
    } catch (e) {
      if (__DEV__) console.warn('dangerDetails computation failed:', e?.message);
      return [];
    }
  }, [augmented, thresholds, language, t]);

  // Live indicator pulse
  const livePulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [livePulse]);

  const fabScale = useRef(new Animated.Value(1)).current;
  const onFabPressIn = () => Animated.spring(fabScale, { toValue: 0.92, useNativeDriver: true, friction: 6 }).start();
  const onFabPressOut = () => Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();

  // Status mapping
  let heroLabel, heroColor, heroEmoji;
  if (counts.total === 0) {
    heroLabel = t('noCoopsYet');
    heroColor = colors.textSecondary;
    heroEmoji = '🐔';
  } else if (counts.danger > 0) {
    heroLabel = `${counts.danger} ${t('danger')}`;
    heroColor = colors.danger;
    heroEmoji = '🚨';
  } else if (counts.warn > 0) {
    heroLabel = `${counts.warn} ${t('warning')}`;
    heroColor = colors.warn;
    heroEmoji = '▲';
  } else if (counts.offline === counts.total) {
    heroLabel = t('offline');
    heroColor = colors.offline;
    heroEmoji = '○';
  } else {
    heroLabel = t('systemReady');
    heroColor = colors.ok;
    heroEmoji = '✓';
  }

  // Time-aware greeting
  const hour = new Date(now).getHours();
  const greeting = hour < 5 ? '🌙'
    : hour < 12 ? '☀️'
    : hour < 18 ? '🌤️'
    : '🌆';

  const onTestData = () => {
    if (devices.length === 0) { showToast(t('noCoopsYet'), 'warn'); return; }
    const target = sorted[0]?.device || devices[0];
    injectMessage(buildFakeDataSms(target.id, {
      co2: 800 + Math.floor(Math.random() * 400),
      nh3: 2 + Math.random() * 5,
      temp: 26 + Math.random() * 5,
      hum: 55 + Math.random() * 15,
      bat: 60 + Math.floor(Math.random() * 35),
    }), false);
    showToast(t('testDataSent'), 'info');
  };

  const onTestAlert = async () => {
    const FS = NativeModules.FilahaSms;
    const required = ['showAlertNotification', 'sendSms', 'makeDirectCall', 'setAlertConfig'];
    const missing = required.filter((k) => !FS || typeof FS[k] !== 'function');
    if (missing.length > 0) {
      showToast(`APK out of date — rebuild required (${missing[0]})`, 'error');
      return;
    }
    const num = ((settings && settings.emergencyContact) || '').trim();
    if (!num) { showToast(t('noEmergencyNumber'), 'warn'); return; }

    const targetName = devices.length > 0
      ? (sorted[0]?.device?.name || devices[0].name)
      : 'Test';

    let nOk = await checkNotificationsEnabled();
    if (!nOk) { await requestNotificationPermission(); nOk = await checkNotificationsEnabled(); }
    if (nOk) {
      try {
        await FS.showAlertNotification(`🚨 ${targetName} — ${t('danger')}`, t('testNotificationBody'), true);
        showToast('✓ Notification', 'success');
      } catch (e) { showToast(`✗ ${e?.message || 'fail'}`, 'error'); }
    } else { showToast(`✗ ${t('notificationPermission')}`, 'error'); }

    setTimeout(async () => {
      let smsOk = await checkSendSmsPermission();
      if (!smsOk) smsOk = await requestSendSmsPermission();
      if (!smsOk) { showToast(`✗ ${t('sendSmsPermission')}`, 'error'); return; }
      try {
        await FS.sendSms(num, `🧪 Filaha Flock test\n${targetName}\n${new Date().toLocaleTimeString()}`);
        showToast('✓ SMS sent', 'success');
      } catch (e) { showToast(`✗ SMS: ${e?.message}`, 'error'); }
    }, 900);

    setTimeout(async () => {
      let cOk = await checkCallPermission();
      if (!cOk) cOk = await requestCallPermission();
      if (!cOk) { showToast(`✗ ${t('callPermission')}`, 'error'); return; }
      try {
        await FS.makeDirectCall(num);
        showToast('✓ Calling', 'success');
      } catch (e) { showToast(`✗ Call: ${e?.message}`, 'error'); }
    }, 2400);

    if (devices.length > 0) {
      const target = sorted[0]?.device || devices[0];
      injectMessage(buildFakeDataSms(target.id, {
        co2: thresholds.co2.danger + 500,
        nh3: thresholds.nh3.danger + 10,
        temp: thresholds.temp.danger + 3,
        hum: thresholds.hum.danger + 5,
        bat: 50,
      }), false);
    }
  };

  const onSubmitNew = async () => {
    setError('');
    const cleanId = deviceId.trim().toUpperCase();
    const cleanName = coopName.trim();
    const ageNum = parseInt(chickAge, 10);
    if (!cleanId) { setError(t('deviceIdHint')); return; }
    if (!cleanName) { setError(t('coopName')); return; }
    const result = await addDevice({
      name: cleanName,
      deviceId: cleanId,
      chickAgeDays: Number.isFinite(ageNum) ? ageNum : 0,
      breed,
      strain,
    });
    if (!result.ok) { setError(t('deviceId') + ' ✗'); return; }
    setCoopName(''); setDeviceId(''); setChickAge('');
    setBreed('broiler'); setStrain('cobb500');
    setModalVisible(false);
    showToast(t('saved'), 'success');
  };

  // Reset strain when breed changes
  const onBreedChange = (b) => {
    setBreed(b);
    const firstStrain = STRAINS_BY_BREED[b]?.[0];
    if (firstStrain) setStrain(firstStrain);
  };

  const onFixPermission = async () => {
    if (!permIssue) return;
    const ok = await permIssue.action();
    showToast(ok ? t('permissionGranted') : t('permissionDenied'), ok ? 'success' : 'error');
  };

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <HeroBackdrop heroColor={heroColor} />

      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.brandLeft}>
            <View style={[styles.logoWrap, { borderColor: heroColor + '50' }]}>
              <Text style={styles.logoEmoji}>🐔</Text>
              <View style={[styles.logoDot, { backgroundColor: heroColor }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>Filaha Flock</Text>
              <View style={styles.statusRow}>
                <Animated.View
                  style={[
                    styles.liveDot,
                    {
                      backgroundColor: heroColor,
                      opacity: livePulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
                      transform: [{
                        scale: livePulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }),
                      }],
                    },
                  ]}
                />
                <Text style={[styles.statusText, { color: heroColor }]} numberOfLines={1}>
                  {heroLabel}
                </Text>
              </View>
            </View>
            <Text style={styles.timeEmoji}>{greeting}</Text>
          </View>

          {(farmerName || farmName) ? (
            <View style={styles.farmRow}>
              {farmerName ? <Text style={styles.farmerLabel}>{farmerName}</Text> : null}
              {farmerName && farmName ? <Text style={styles.dotSep}>•</Text> : null}
              {farmName ? (
                <View style={styles.locationPill}>
                  <Text style={styles.locationText} numberOfLines={1}>📍 {farmName}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* ── Build issue banner (highest priority) ── */}
        {buildIssue ? (
          <View style={styles.buildBanner}>
            <Text style={styles.buildBannerIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.buildBannerTitle}>APK is out of date</Text>
              <Text style={styles.buildBannerHint} numberOfLines={2}>
                {buildIssue.kind === 'missing'
                  ? `missing: ${buildIssue.detail}`
                  : buildIssue.detail}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ── Permission banner ── */}
        {!buildIssue && permIssue ? (
          <Pressable
            onPress={onFixPermission}
            android_ripple={{ color: colors.warn + '33' }}
            style={styles.permBanner}
          >
            <View style={styles.permBannerIconBox}>
              <Text style={styles.permBannerIcon}>🔒</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.permBannerTitle}>{permIssue.label}</Text>
              <Text style={styles.permBannerHint}>{t('enable')} →</Text>
            </View>
          </Pressable>
        ) : null}

        {/* ── Actionable danger list ── */}
        {dangerDetails.length > 0 ? (
          <View style={styles.dangerList}>
            {dangerDetails.slice(0, 4).map((d, i) => (
              <Pressable
                key={d.device.id + d.sensorKey}
                onPress={() => navigation.navigate('CoopDetail', { deviceId: d.device.id })}
                android_ripple={{ color: colors.danger + '22' }}
                style={[styles.dangerItem, i === 0 && styles.dangerItemFirst]}
              >
                <View style={styles.dangerItemHead}>
                  <View style={styles.dangerItemHeadLeft}>
                    <Icon name="alertTriangle" size={18} color={colors.danger} strokeWidth={2.4} />
                    <Text style={styles.dangerItemTitle} numberOfLines={1}>
                      {d.device.name} — {d.sensorLabel}
                      {d.valueText ? `  ${d.valueText}` : ''}
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={18} color={colors.danger} />
                </View>
                <Text style={styles.dangerItemAction} numberOfLines={2}>
                  ▶ {d.action}
                </Text>
              </Pressable>
            ))}
            {dangerDetails.length > 4 ? (
              <Text style={styles.dangerMore}>
                +{dangerDetails.length - 4} {t('danger').toLowerCase()}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* ── Stats Hero ── */}
        <SummaryBar counts={counts} t={t} />

        {/* ── Section header + search ── */}
        {devices.length > 0 ? (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>{t('totalCoops').toUpperCase()}</Text>
              <Text style={styles.sectionCount}>
                {filtered.length}{filtered.length !== counts.total ? ` / ${counts.total}` : ''}
              </Text>
            </View>
            <View style={styles.searchWrap}>
              <Icon name="search" size={18} color={colors.textTertiary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('searchCoops')}
                placeholderTextColor={colors.textTertiary}
                style={styles.searchInput}
                underlineColorAndroid="transparent"
              />
              {query.length > 0 ? (
                <Pressable onPress={() => setQuery('')} hitSlop={10}>
                  <Icon name="x" size={16} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}

        {/* ── List ── */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.device.id}
          renderItem={({ item }) => (
            <CoopCard
              device={item.device}
              reading={item.reading}
              status={item.status}
              thresholds={thresholds}
              t={t}
              now={now}
              onPress={() => navigation.navigate('CoopDetail', { deviceId: item.device.id })}
            />
          )}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 130 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconBox}>
                <Text style={styles.emptyIcon}>🐔</Text>
              </View>
              <Text style={styles.emptyTitle}>{t('noCoopsYet')}</Text>
              <Text style={styles.emptyHint}>{t('noCoopsHint')}</Text>
              <Pressable
                onPress={() => setModalVisible(true)}
                android_ripple={{ color: '#ffffff44' }}
                style={styles.emptyBtn}
              >
                <Text style={styles.emptyBtnText}>+ {t('addNewCoop')}</Text>
              </Pressable>
            </View>
          }
          ListFooterComponent={
            devices.length > 0 ? (
              <View style={styles.testRow}>
                <Pressable
                  onPress={onTestData}
                  android_ripple={{ color: colors.accent + '33' }}
                  style={[styles.testBtn, { borderColor: colors.accent + '44' }]}
                >
                  <Text style={styles.testBtnIcon}>📡</Text>
                  <Text style={[styles.testBtnText, { color: colors.accentSoft }]}>
                    {t('testData')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onTestAlert}
                  android_ripple={{ color: colors.danger + '33' }}
                  style={[styles.testBtn, {
                    borderColor: colors.danger + '50',
                    backgroundColor: colors.danger + '10',
                  }]}
                >
                  <Text style={styles.testBtnIcon}>🚨</Text>
                  <Text style={[styles.testBtnText, { color: colors.dangerSoft }]}>
                    {t('testAlert')}
                  </Text>
                </Pressable>
              </View>
            ) : null
          }
        />

        {/* ── FAB ── */}
        <Animated.View style={[styles.fabWrap, { transform: [{ scale: fabScale }] }]}>
          <Pressable
            onPress={() => setModalVisible(true)}
            onPressIn={onFabPressIn}
            onPressOut={onFabPressOut}
            android_ripple={{ color: '#ffffff66', borderless: true }}
            style={styles.fab}
          >
            <Text style={styles.fabIcon}>＋</Text>
          </Pressable>
        </Animated.View>

        {/* ── Add coop modal ── */}
        <Modal
          animationType="slide"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalBackdrop}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{t('addNewCoop')}</Text>
              <Field
                label={t('coopName')}
                value={coopName}
                onChangeText={setCoopName}
                placeholder={t('coopNamePlaceholder')}
              />
              <Field
                label={t('deviceId')}
                value={deviceId}
                onChangeText={(v) => setDeviceId(v.toUpperCase())}
                placeholder={t('deviceIdPlaceholder')}
                autoCapitalize="characters"
                hint={t('deviceIdHint')}
                maxLength={32}
              />
              <Field
                label={t('chickAgeLabel')}
                value={chickAge}
                onChangeText={(v) => setChickAge(v.replace(/[^0-9]/g, '').slice(0, 3))}
                placeholder="0"
                keyboardType="number-pad"
                hint={t('chickAgeHint')}
                maxLength={3}
              />

              {/* Breed selector */}
              <Text style={styles.formLabel}>{t('chickenType')}</Text>
              <View style={styles.breedRow}>
                {BREEDS.filter((b) => b !== 'mixed').map((b) => (
                  <Pressable
                    key={b}
                    onPress={() => onBreedChange(b)}
                    android_ripple={{ color: colors.accent + '22' }}
                    style={[styles.breedChip, breed === b && styles.breedChipActive]}
                  >
                    <Text style={[styles.breedChipText, breed === b && styles.breedChipTextActive]}>
                      {t(b)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Strain selector */}
              <Text style={styles.formLabel}>{t('strain')}</Text>
              <View style={styles.strainGrid}>
                {(STRAINS_BY_BREED[breed] || []).map((id) => (
                  <Pressable
                    key={id}
                    onPress={() => setStrain(id)}
                    android_ripple={{ color: colors.accent + '22' }}
                    style={[styles.strainChip, strain === id && styles.strainChipActive]}
                  >
                    <Text style={[styles.strainChipText, strain === id && styles.strainChipTextActive]}>
                      {strainLabel(id)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.formHint}>{t('strainHint')}</Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.modalActions}>
                <PrimaryButton
                  title={t('cancel')}
                  variant="subtle"
                  onPress={() => { setModalVisible(false); setError(''); }}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  title={t('add')}
                  icon="＋"
                  onPress={onSubmitNew}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = () => ({
  safe: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoWrap: {
    width: 54, height: 54, borderRadius: 16,
    backgroundColor: colors.cardElevated,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.sm,
  },
  logoEmoji: { fontSize: 28 },
  logoDot: {
    position: 'absolute',
    top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4,
    borderWidth: 2, borderColor: colors.bg,
  },
  brandTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 4,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },
  timeEmoji: { fontSize: 22, opacity: 0.85 },

  farmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  farmerLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  dotSep: {
    color: colors.textTertiary,
    fontSize: 13,
  },
  locationPill: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  locationText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Build banner
  buildBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: colors.danger + '18',
    borderWidth: 1.5,
    borderColor: colors.danger + '70',
    borderRadius: 14,
  },
  buildBannerIcon: { fontSize: 22, marginTop: 1 },
  buildBannerTitle: { color: colors.danger, fontSize: 14, fontWeight: '900' },
  buildBannerHint: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Permission banner
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: colors.warn + '15',
    borderWidth: 1,
    borderColor: colors.warn + '50',
    borderRadius: 14,
  },
  permBannerIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.warn + '25',
    alignItems: 'center', justifyContent: 'center',
  },
  permBannerIcon: { fontSize: 16 },
  permBannerTitle: { color: colors.warn, fontSize: 13, fontWeight: '800' },
  permBannerHint: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },

  // Danger highlight (premium card style)
  dangerHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    backgroundColor: colors.danger + '15',
    borderWidth: 1.5,
    borderColor: colors.danger + '50',
    borderRadius: 16,
    ...shadows.glow(colors.danger),
  },
  dangerIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.danger + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  dangerIcon: { fontSize: 20 },
  dangerTitle: {
    color: colors.dangerSoft,
    fontSize: 16,
    fontWeight: '900',
  },
  dangerHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  dangerArrow: {
    color: colors.dangerSoft,
    fontSize: 26,
    fontWeight: '300',
  },

  dangerList: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.danger + '12',
    borderWidth: 1.5,
    borderColor: colors.danger + '60',
    borderRadius: 16,
    padding: 6,
    ...shadows.glow(colors.danger),
  },
  dangerItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger + '40',
    backgroundColor: colors.danger + '12',
    marginBottom: 6,
  },
  dangerItemFirst: {
    backgroundColor: colors.danger + '18',
    borderColor: colors.danger + '60',
  },
  dangerItemHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dangerItemHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dangerItemTitle: {
    color: colors.dangerSoft,
    fontSize: 14,
    fontWeight: '900',
    flex: 1,
  },
  dangerItemAction: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 19,
  },
  dangerMore: {
    textAlign: 'center',
    color: colors.dangerSoft,
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 6,
  },

  // Section header above coop list
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  sectionLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  sectionCount: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 96, height: 96, borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIcon: { fontSize: 50, opacity: 0.7 },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 19, fontWeight: '800',
    marginBottom: 8, textAlign: 'center',
  },
  emptyHint: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 26,
    lineHeight: 21,
    maxWidth: 260,
  },
  emptyBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    ...shadows.glow(colors.accent),
  },
  emptyBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  testRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
  },
  testBtnIcon: { fontSize: 14 },
  testBtnText: { fontWeight: '800', fontSize: 13 },

  // FAB
  fabWrap: {
    position: 'absolute',
    right: 20, bottom: 20,
  },
  fab: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.glow(colors.accent),
  },
  fabIcon: { color: '#fff', fontSize: 30, fontWeight: '300', lineHeight: 32 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000000cc',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42, height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    marginBottom: 16,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 19, fontWeight: '900',
    marginBottom: 16,
  },
  errorText: { color: colors.danger, fontSize: 13, marginBottom: 8, fontWeight: '600' },

  formLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  formHint: {
    color: colors.textTertiary,
    fontSize: 11,
    marginBottom: 12,
    lineHeight: 16,
  },
  breedRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  breedChip: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  breedChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '14',
  },
  breedChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  breedChipTextActive: { color: colors.accent },
  strainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  strainChip: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  strainChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '18',
  },
  strainChipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  strainChipTextActive: { color: colors.accent },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
});
