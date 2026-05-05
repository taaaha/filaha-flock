import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, STATUS, statusColor } from '../utils/colors';
import SensorMini from './SensorMini';
import BatteryBar from './BatteryBar';
import StatusDot from './StatusDot';
import Pulse from './Pulse';
import { formatRelativeTime } from '../utils/formatters';

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

function CoopCard({ device, reading, status, thresholds, onPress, t, now }) {
  const sColor = statusColor(status);
  const isDanger = status === STATUS.DANGER;
  const isPower = status === STATUS.POWER_CUT;

  const r = reading || {};

  return (
    <Pulse active={isDanger} color={colors.danger} intensity={0.18} style={styles.wrapper}>
      <Pressable
        onPress={onPress}
        android_ripple={{ color: '#1a2235' }}
        style={[styles.card, { borderColor: sColor + '55' }]}
      >
        <View style={[styles.stripe, { backgroundColor: sColor }]} />

        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.name} numberOfLines={1}>{device.name}</Text>
            <Text style={styles.devId}>{device.id}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: sColor + '22', borderColor: sColor + '55' }]}>
            <StatusDot status={status} size={8} />
            <Text style={[styles.badgeText, { color: sColor }]}>
              {statusLabel(status, t)}
            </Text>
          </View>
        </View>

        {isPower ? (
          <View style={styles.powerBanner}>
            <Text style={styles.powerBannerText}>⚡ {t('powerCut')}</Text>
          </View>
        ) : null}

        <View style={styles.sensorsRow}>
          <SensorMini sensorKey="co2" value={r.co2} label={t('co2Short')} thresholds={thresholds} />
          <SensorMini sensorKey="nh3" value={r.nh3} label={t('nh3Short')} thresholds={thresholds} />
        </View>
        <View style={styles.sensorsRow}>
          <SensorMini sensorKey="temp" value={r.temp} label={t('tempShort')} thresholds={thresholds} />
          <SensorMini sensorKey="hum" value={r.hum} label={t('humShort')} thresholds={thresholds} />
        </View>

        <View style={styles.footer}>
          <View style={{ flex: 1 }}>
            <BatteryBar value={r.bat} compact label={t('battery')} />
          </View>
        </View>

        <Text style={styles.lastUpdate}>
          {reading
            ? `${t('lastUpdate')}: ${formatRelativeTime(reading.timestamp, t, now)}`
            : t('offline')}
        </Text>
      </Pressable>
    </Pulse>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    paddingHorizontal: 6,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  devId: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sensorsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    paddingHorizontal: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginTop: 4,
  },
  lastUpdate: {
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 8,
    paddingHorizontal: 6,
  },
  powerBanner: {
    backgroundColor: colors.power + '22',
    borderColor: colors.power + '66',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    marginHorizontal: 6,
  },
  powerBannerText: {
    color: colors.power,
    fontWeight: '800',
    textAlign: 'center',
    fontSize: 13,
  },
});

export default memo(CoopCard);
