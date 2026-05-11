import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { colors, STATUS, statusColor } from '../utils/colors';
import { deviceStatus } from '../utils/thresholds';
import { isToday, formatRelativeTime, formatTime } from '../utils/formatters';
import { buildFakeDataSms } from '../utils/smsParser';
import SensorTile from '../components/SensorTile';
import BatteryBar from '../components/BatteryBar';
import PrimaryButton from '../components/PrimaryButton';
import TrendChart from '../components/TrendChart';
import StatusDot from '../components/StatusDot';
import { showToast } from '../components/Toast';
import { checkCallPermission, requestCallPermission } from '../services/SmsService';
import { strainLabel, envTargetsAt, heatStressTHI } from '../utils/poultryData';

const SENSOR_KEYS = ['co2', 'nh3', 'temp', 'hum'];
const UNITS = { co2: 'ppm', nh3: 'ppm', temp: '°C', hum: '%' };
const ACCENT = {
  co2: colors.co2,
  nh3: colors.nh3,
  temp: colors.temp,
  hum: colors.hum,
};

function statusLabel(status, t) {
  switch (status) {
    case STATUS.OK: return t('statusOk');
    case STATUS.WARN: return t('statusWarning');
    case STATUS.DANGER: return t('statusDanger');
    case STATUS.OFFLINE: return t('statusOffline');
    case STATUS.POWER_CUT: return t('statusPowerCut');
    default: return '';
  }
}

export default function CoopDetailScreen({ route, navigation }) {
  const { deviceId } = route.params || {};
  const {
    t, devices, readings, thresholds, powerCut, settings,
    callEmergency, removeDevice, injectMessage, now,
  } = useApp();

  // ── Hooks always called in the same order ──
  const [selectedSensor, setSelectedSensor] = useState('co2');

  const device = devices.find((d) => d.id === deviceId);
  const list = device ? (readings[deviceId] || []) : [];
  const lastReading = list.length > 0 ? list[list.length - 1] : null;
  const isPowerCut = device ? !!powerCut[deviceId] : false;
  const status = device
    ? deviceStatus(device, lastReading, thresholds, now, isPowerCut)
    : STATUS.OFFLINE;
  const sColor = statusColor(status);
  const isOffline = status === STATUS.OFFLINE && !isPowerCut;
  const offlineMinutes = lastReading
    ? Math.max(0, Math.floor((now - lastReading.timestamp) / 60000))
    : null;

  const todayStats = useMemo(() => {
    const stats = {};
    SENSOR_KEYS.forEach((k) => { stats[k] = { min: null, max: null }; });
    if (!device) return stats;
    list.forEach((r) => {
      if (!isToday(r.timestamp)) return;
      SENSOR_KEYS.forEach((k) => {
        const v = r[k];
        if (v === null || v === undefined || isNaN(v)) return;
        if (stats[k].min === null || v < stats[k].min) stats[k].min = v;
        if (stats[k].max === null || v > stats[k].max) stats[k].max = v;
      });
    });
    return stats;
  }, [list, device]);

  const seriesValues = useMemo(() => {
    if (!device) return [];
    return list.slice(-20).map((r) => r[selectedSensor]);
  }, [list, selectedSensor, device]);

  // ── Now safe to early-return ──
  if (!device) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{t('coopDetails')}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>—</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sensorLabel = {
    co2: t('co2'),
    nh3: t('nh3'),
    temp: t('temperature'),
    hum: t('humidity'),
  };

  const onTestDevice = () => {
    const msg = buildFakeDataSms(device.id, {
      co2: 700 + Math.floor(Math.random() * 300),
      nh3: 1.5 + Math.random() * 4,
      temp: 26 + Math.random() * 4,
      hum: 55 + Math.random() * 10,
      bat: 65 + Math.floor(Math.random() * 30),
    });
    injectMessage(msg, false);
    showToast(t('testDataSent'), 'info');
  };

  const onCall = async () => {
    const num = ((settings && settings.emergencyContact) || '').trim();
    if (!num) {
      showToast(t('noEmergencyNumber'), 'warn');
      return;
    }
    let granted = await checkCallPermission();
    if (!granted) granted = await requestCallPermission();
    if (!granted) {
      showToast(t('permissionDenied'), 'error');
      return;
    }
    showToast(t('callStarted'), 'info');
    const ok = await callEmergency();
    if (!ok) showToast(t('callFailed'), 'error');
  };

  const onDelete = () => {
    Alert.alert(
      t('confirmDelete'),
      t('confirmDeleteMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            const idToDelete = device.id;
            // Navigate first, then remove — this prevents the screen from
            // re-rendering with `device === undefined` while still mounted.
            navigation.goBack();
            setTimeout(() => { removeDevice(idToDelete); }, 50);
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          android_ripple={{ color: '#1a2235', borderless: true }}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{device.name}</Text>
          <Text style={styles.devId}>{device.id}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: sColor + '22', borderColor: sColor + '55' }]}>
          <StatusDot status={status} size={8} />
          <Text style={[styles.badgeText, { color: sColor }]}>{statusLabel(status, t)}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {isOffline ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>
              ⚠ {offlineMinutes !== null && offlineMinutes > 0
                ? t('offlineSince', { n: offlineMinutes })
                : t('offline')}
            </Text>
          </View>
        ) : null}

        {isPowerCut ? (
          <View style={styles.powerBanner}>
            <Text style={styles.powerText}>⚡ {t('powerCut')}</Text>
          </View>
        ) : null}

        {/* Strain & age-target info */}
        {(device.strain || device.chickArrivalDate) ? (
          <View style={styles.strainInfo}>
            {device.strain ? (
              <View style={styles.strainInfoRow}>
                <Text style={styles.strainInfoLabel}>{t('strain')}</Text>
                <Text style={styles.strainInfoValue}>{strainLabel(device.strain)}</Text>
              </View>
            ) : null}
            {device.chickArrivalDate ? (() => {
              try {
                const age = Math.max(1, Math.floor((now - device.chickArrivalDate) / 86400000) + 1);
                const env = envTargetsAt(device.breed || 'broiler', age) || {};
                const hs = lastReading && typeof lastReading.temp === 'number' &&
                           typeof lastReading.hum === 'number' && !isNaN(lastReading.temp) && !isNaN(lastReading.hum)
                  ? heatStressTHI(lastReading.temp, lastReading.hum) : null;
                return (
                  <>
                    <View style={styles.strainInfoRow}>
                      <Text style={styles.strainInfoLabel}>{t('day')}</Text>
                      <Text style={styles.strainInfoValue}>{age}</Text>
                    </View>
                    {env.temp != null ? (
                      <View style={styles.strainInfoRow}>
                        <Text style={styles.strainInfoLabel}>{t('optimalTemp')}</Text>
                        <Text style={styles.strainInfoValue}>{env.temp.toFixed(1)}°C</Text>
                      </View>
                    ) : null}
                    {hs ? (
                      <View style={styles.strainInfoRow}>
                        <Text style={styles.strainInfoLabel}>{t('thi')}</Text>
                        <Text style={[styles.strainInfoValue, {
                          color: hs.tier === 'emergency' ? colors.danger
                               : hs.tier === 'danger' ? colors.warn
                               : hs.tier === 'alert' ? colors.warnSoft : colors.ok
                        }]}>
                          {hs.thi} • {hs.tier === 'emergency' ? t('heatStressEmergency')
                            : hs.tier === 'danger' ? t('heatStressDanger')
                            : hs.tier === 'alert' ? t('heatStressAlert')
                            : t('heatStressSafe')}
                        </Text>
                      </View>
                    ) : null}
                  </>
                );
              } catch (e) { return null; }
            })() : null}
          </View>
        ) : null}

        <View style={styles.gridRow}>
          <SensorTile
            sensorKey="co2"
            label={t('co2')}
            value={lastReading ? lastReading.co2 : null}
            min={todayStats.co2.min}
            max={todayStats.co2.max}
            thresholds={thresholds}
            selected={selectedSensor === 'co2'}
            onPress={() => setSelectedSensor('co2')}
            t={t}
          />
          <SensorTile
            sensorKey="nh3"
            label={t('nh3')}
            value={lastReading ? lastReading.nh3 : null}
            min={todayStats.nh3.min}
            max={todayStats.nh3.max}
            thresholds={thresholds}
            selected={selectedSensor === 'nh3'}
            onPress={() => setSelectedSensor('nh3')}
            t={t}
          />
        </View>
        <View style={styles.gridRow}>
          <SensorTile
            sensorKey="temp"
            label={t('temperature')}
            value={lastReading ? lastReading.temp : null}
            min={todayStats.temp.min}
            max={todayStats.temp.max}
            thresholds={thresholds}
            selected={selectedSensor === 'temp'}
            onPress={() => setSelectedSensor('temp')}
            t={t}
          />
          <SensorTile
            sensorKey="hum"
            label={t('humidity')}
            value={lastReading ? lastReading.hum : null}
            min={todayStats.hum.min}
            max={todayStats.hum.max}
            thresholds={thresholds}
            selected={selectedSensor === 'hum'}
            onPress={() => setSelectedSensor('hum')}
            t={t}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {sensorLabel[selectedSensor]} • {t('recentReadings')}
          </Text>
          <TrendChart
            values={seriesValues}
            color={ACCENT[selectedSensor]}
            unit={UNITS[selectedSensor]}
            emptyLabel={t('noChartData')}
            height={170}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('battery')}</Text>
          <View style={styles.batteryWrap}>
            <BatteryBar value={lastReading ? lastReading.bat : null} />
          </View>
        </View>

        <Text style={styles.lastUpdate}>
          {lastReading
            ? `${t('lastUpdate')}: ${formatRelativeTime(lastReading.timestamp, t, now)} • ${formatTime(lastReading.timestamp)}`
            : t('offline')}
        </Text>

        <View style={styles.actionsRow}>
          <PrimaryButton
            title={t('callEmergency')}
            icon="📞"
            variant="danger"
            onPress={onCall}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            title={t('testDevice')}
            icon="📡"
            variant="primary"
            onPress={onTestDevice}
            style={{ flex: 1 }}
          />
        </View>

        <PrimaryButton
          title={t('deleteDevice')}
          icon="🗑"
          variant="ghost"
          onPress={onDelete}
          style={{ marginTop: 12 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  backText: {
    color: colors.textPrimary,
    fontSize: 28,
    lineHeight: 30,
    marginTop: -3,
  },
  titleWrap: { flex: 1, paddingHorizontal: 6 },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  devId: { color: colors.textTertiary, fontSize: 11, fontWeight: '600' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '800' },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { color: colors.textSecondary, fontSize: 18 },
  offlineBanner: {
    backgroundColor: colors.danger + '22',
    borderColor: colors.danger + '66',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  offlineText: { color: colors.danger, fontWeight: '800', textAlign: 'center' },
  powerBanner: {
    backgroundColor: colors.power + '22',
    borderColor: colors.power + '66',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  powerText: { color: colors.power, fontWeight: '800', textAlign: 'center' },

  strainInfo: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  strainInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strainInfoLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  strainInfoValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  gridRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  section: { marginTop: 16 },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  batteryWrap: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  lastUpdate: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
