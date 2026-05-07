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
import { useApp } from '../contexts/AppContext';
import { colors, STATUS, statusColor } from '../utils/colors';
import { deviceStatus, statusPriority } from '../utils/thresholds';
import { buildFakeDataSms } from '../utils/smsParser';
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
  showAlertNotification,
  sendSms,
  getNativeVersion,
  listMissingNativeMethods,
  EXPECTED_NATIVE_VERSION,
} from '../services/SmsService';
import { makeDirectCall } from '../services/CallService';

export default function DashboardScreen({ navigation }) {
  const {
    t,
    devices, settings, thresholds, powerCut,
    lastReadingFor, addDevice, injectMessage, now,
  } = useApp();

  const [modalVisible, setModalVisible] = useState(false);
  const [coopName, setCoopName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [error, setError] = useState('');
  const [permIssue, setPermIssue] = useState(null);
  const [buildIssue, setBuildIssue] = useState(null);

  // Detect outdated APK
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const missing = listMissingNativeMethods();
      const ver = await getNativeVersion();
      if (cancelled) return;
      if (missing.length > 0) {
        setBuildIssue({
          kind: 'missing',
          detail: missing.join(', '),
        });
      } else if (ver !== EXPECTED_NATIVE_VERSION) {
        setBuildIssue({
          kind: 'mismatch',
          detail: `installed ${ver || 'unknown'} ≠ expected ${EXPECTED_NATIVE_VERSION}`,
        });
      } else {
        setBuildIssue(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Check critical permissions
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
      else if (!sendSms) setPermIssue({ key: 'sendSms', label: 'SEND SMS', action: requestSendSmsPermission });
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
  const anyDanger = counts.danger > 0;
  const anyWarn = counts.warn > 0;

  // Live status pulse on the indicator dot
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

  // FAB scale
  const fabScale = useRef(new Animated.Value(1)).current;
  const onFabPressIn = () =>
    Animated.spring(fabScale, { toValue: 0.92, useNativeDriver: true, friction: 6 }).start();
  const onFabPressOut = () =>
    Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();

  // ── Test handlers ──
  const onTestData = () => {
    if (devices.length === 0) {
      showToast(t('noCoopsYet'), 'warn');
      return;
    }
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
    // ★ Explicit native-presence check. If any required method is missing
    // it means the installed APK was built before these methods existed —
    // user must rebuild. No silent fallbacks.
    const FS = NativeModules.FilahaSms;
    const required = ['showAlertNotification', 'sendSms', 'makeDirectCall', 'setAlertConfig'];
    const missing = required.filter((k) => !FS || typeof FS[k] !== 'function');
    if (missing.length > 0) {
      showToast(`APK out of date — rebuild required (missing: ${missing[0]})`, 'error');
      return;
    }

    const num = ((settings && settings.emergencyContact) || '').trim();
    if (!num) {
      showToast(t('noEmergencyNumber'), 'warn');
      return;
    }

    const targetName = devices.length > 0
      ? (sorted[0]?.device?.name || devices[0].name)
      : 'Test';

    // 1) Notification — direct native call, no fallback
    let nOk = await checkNotificationsEnabled();
    if (!nOk) {
      await requestNotificationPermission();
      nOk = await checkNotificationsEnabled();
    }
    if (!nOk) {
      showToast(`✗ Notifications blocked in system settings`, 'error');
    } else {
      try {
        await FS.showAlertNotification(
          `🚨 ${targetName} — ${t('danger')}`,
          t('testNotificationBody'),
          true
        );
        showToast('✓ Notification', 'success');
      } catch (e) {
        showToast(`✗ Notification: ${e?.message || 'unknown'}`, 'error');
      }
    }

    // 2) SMS — direct native call
    setTimeout(async () => {
      let smsOk = await checkSendSmsPermission();
      if (!smsOk) smsOk = await requestSendSmsPermission();
      if (!smsOk) {
        showToast(`✗ ${t('sendSmsPermission')} denied`, 'error');
        return;
      }
      try {
        await FS.sendSms(num,
          `🧪 Filaha Flock test\n${targetName} — ${t('danger')}\n${new Date().toLocaleTimeString()}`);
        showToast('✓ SMS sent', 'success');
      } catch (e) {
        showToast(`✗ SMS: ${e?.message || 'unknown'}`, 'error');
      }
    }, 900);

    // 3) Call — direct native call (no Linking fallback)
    setTimeout(async () => {
      let cOk = await checkCallPermission();
      if (!cOk) cOk = await requestCallPermission();
      if (!cOk) {
        showToast(`✗ ${t('callPermission')} denied`, 'error');
        return;
      }
      try {
        await FS.makeDirectCall(num);
        showToast('✓ Calling directly', 'success');
      } catch (e) {
        showToast(`✗ Call: ${e?.message || 'unknown'}`, 'error');
      }
    }, 2400);

    // Also inject threshold breach so the alert list updates
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
    if (!cleanId) { setError(t('deviceIdHint')); return; }
    if (!cleanName) { setError(t('coopName')); return; }
    const result = await addDevice({ name: cleanName, deviceId: cleanId });
    if (!result.ok) { setError(t('deviceId') + ' ✗'); return; }
    setCoopName(''); setDeviceId(''); setModalVisible(false);
    showToast(t('saved'), 'success');
  };

  const onFixPermission = async () => {
    if (!permIssue) return;
    const ok = await permIssue.action();
    showToast(ok ? t('permissionGranted') : t('permissionDenied'), ok ? 'success' : 'error');
  };

  // ── Hero status text ──
  let heroLabel, heroColor, heroIcon;
  if (counts.total === 0) {
    heroLabel = t('noCoopsYet');
    heroColor = colors.textSecondary;
    heroIcon = '🐔';
  } else if (counts.danger > 0) {
    heroLabel = `${counts.danger} ${t('danger')}`;
    heroColor = colors.danger;
    heroIcon = '⚠️';
  } else if (counts.warn > 0) {
    heroLabel = `${counts.warn} ${t('warning')}`;
    heroColor = colors.warn;
    heroIcon = '▲';
  } else if (counts.offline === counts.total) {
    heroLabel = t('offline');
    heroColor = colors.offline;
    heroIcon = '○';
  } else {
    heroLabel = t('systemReady');
    heroColor = colors.ok;
    heroIcon = '✓';
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* ── Top Brand ── */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoSquare}>
            <Text style={styles.logoEmoji}>🐔</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandTitle} numberOfLines={1}>Filaha Flock</Text>
            <View style={styles.statusRow}>
              <Animated.View
                style={[
                  styles.liveDot,
                  {
                    backgroundColor: heroColor,
                    opacity: livePulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
                    transform: [{
                      scale: livePulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.1] }),
                    }],
                  },
                ]}
              />
              <Text style={[styles.statusText, { color: heroColor }]} numberOfLines={1}>
                {heroLabel}
              </Text>
            </View>
          </View>
        </View>
        {farmName ? (
          <View style={styles.farmRow}>
            <Text style={styles.farmIcon}>📍</Text>
            <Text style={styles.farmText} numberOfLines={1}>{farmName}</Text>
          </View>
        ) : null}
      </View>

      {/* ── APK out-of-date banner (highest priority) ── */}
      {buildIssue ? (
        <View style={styles.buildBanner}>
          <Text style={styles.buildBannerIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.buildBannerTitle}>
              APK is out of date — rebuild required
            </Text>
            <Text style={styles.buildBannerHint} numberOfLines={2}>
              Run: npx expo prebuild --platform android --clean ; eas build -p android --profile preview
            </Text>
            <Text style={styles.buildBannerDetail} numberOfLines={1}>
              {buildIssue.kind === 'missing'
                ? `missing native methods: ${buildIssue.detail}`
                : buildIssue.detail}
            </Text>
          </View>
        </View>
      ) : null}

      {/* ── Permission warning banner ── */}
      {permIssue ? (
        <Pressable
          onPress={onFixPermission}
          android_ripple={{ color: colors.warn + '33' }}
          style={styles.permBanner}
        >
          <Text style={styles.permBannerIcon}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.permBannerTitle}>
              {permIssue.label} — {t('enable')}
            </Text>
            <Text style={styles.permBannerHint}>
              {t('permissionRequired')}
            </Text>
          </View>
          <Text style={styles.permBannerArrow}>›</Text>
        </Pressable>
      ) : null}

      {/* ── Danger banner ── */}
      {anyDanger ? (
        <View style={styles.dangerBanner}>
          <View style={styles.dangerIconBox}>
            <Text style={styles.dangerIcon}>{heroIcon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerTitle}>
              {counts.danger} {t('danger')}
            </Text>
            <Text style={styles.dangerHint}>
              {t('checkNow')}
            </Text>
          </View>
        </View>
      ) : null}

      {/* ── Stats ── */}
      <SummaryBar counts={counts} t={t} />

      {/* ── List ── */}
      <FlatList
        data={sorted}
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
            <Text style={styles.emptyIcon}>🐔</Text>
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
                style={[styles.testBtn, { borderColor: colors.accent + '60' }]}
              >
                <Text style={styles.testBtnIcon}>📡</Text>
                <Text style={[styles.testBtnText, { color: colors.accent }]}>
                  {t('testData')}
                </Text>
              </Pressable>
              <Pressable
                onPress={onTestAlert}
                android_ripple={{ color: colors.danger + '33' }}
                style={[styles.testBtn, {
                  borderColor: colors.danger + '70',
                  backgroundColor: colors.danger + '0d',
                }]}
              >
                <Text style={styles.testBtnIcon}>🚨</Text>
                <Text style={[styles.testBtnText, { color: colors.danger }]}>
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
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  topBar: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoSquare: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  logoEmoji: { fontSize: 26 },
  brandTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 4,
  },
  liveDot: {
    width: 9, height: 9, borderRadius: 5,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  farmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  farmIcon: { fontSize: 13 },
  farmText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  buildBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    backgroundColor: colors.danger + '20',
    borderWidth: 2,
    borderColor: colors.danger + '90',
    borderRadius: 14,
  },
  buildBannerIcon: { fontSize: 22, marginTop: 1 },
  buildBannerTitle: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '900',
  },
  buildBannerHint: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buildBannerDetail: {
    color: colors.textTertiary,
    fontSize: 10,
    marginTop: 4,
  },
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: colors.warn + '18',
    borderWidth: 1,
    borderColor: colors.warn + '60',
    borderRadius: 14,
  },
  permBannerIcon: { fontSize: 22 },
  permBannerTitle: {
    color: colors.warn,
    fontSize: 13,
    fontWeight: '800',
  },
  permBannerHint: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  permBannerArrow: {
    color: colors.warn,
    fontSize: 22,
    fontWeight: '700',
  },

  dangerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: colors.danger + '15',
    borderWidth: 1.5,
    borderColor: colors.danger + '70',
    borderRadius: 14,
  },
  dangerIconBox: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.danger + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  dangerIcon: { fontSize: 18 },
  dangerTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '900',
  },
  dangerHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 80, marginBottom: 18, opacity: 0.6 },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20, fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyHint: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 26,
    lineHeight: 22,
  },
  emptyBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    elevation: 4,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  emptyBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  testRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 8,
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

  fabWrap: {
    position: 'absolute',
    right: 20, bottom: 20,
  },
  fab: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    elevation: 12,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
  },
  fabIcon: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 32,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000000bb',
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
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
});
