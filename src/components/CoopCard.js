import React, { memo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { colors, STATUS, statusColor } from '../utils/colors';
import SensorMini from './SensorMini';
import BatteryBar from './BatteryBar';
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
  const isDanger = status === STATUS.DANGER || status === STATUS.POWER_CUT;
  const isPower = status === STATUS.POWER_CUT;
  const isOffline = status === STATUS.OFFLINE;
  const r = reading || {};

  const ageText = reading ? formatRelativeTime(reading.timestamp, t, now) : null;

  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, friction: 7 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();

  return (
    <Pulse active={isDanger} color={sColor} intensity={0.55} style={styles.wrapper} borderRadius={18}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          android_ripple={{ color: sColor + '20', foreground: true }}
          style={[styles.card, { borderColor: sColor + '50' }]}
        >
          {/* Left status stripe */}
          <View style={[styles.stripe, { backgroundColor: sColor }]} />
          {isDanger ? (
            <View style={[styles.tintOverlay, { backgroundColor: sColor + '0a' }]} />
          ) : null}

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.name} numberOfLines={1}>{device.name}</Text>
              <Text style={styles.devId}>{device.id}</Text>
            </View>
            <View style={[styles.badge, {
              backgroundColor: sColor + '20', borderColor: sColor + '70',
            }]}>
              <View style={[styles.dot, { backgroundColor: sColor }]} />
              <Text style={[styles.badgeText, { color: sColor }]}>
                {statusLabel(status, t)}
              </Text>
            </View>
          </View>

          {/* Power-cut banner */}
          {isPower ? (
            <View style={styles.powerBanner}>
              <Text style={styles.powerBannerText}>
                ⚡  {t('powerCut')}
              </Text>
            </View>
          ) : null}

          {/* Offline banner */}
          {isOffline && !isPower ? (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineEmoji}>📡</Text>
              <Text style={styles.offlineBannerText}>{t('offline')}</Text>
            </View>
          ) : null}

          {/* 2×2 sensor grid */}
          {!isOffline || isPower ? (
            <View style={styles.sensorGrid}>
              <SensorMini sensorKey="co2"  value={r.co2}  label={t('co2Short')}  thresholds={thresholds} />
              <SensorMini sensorKey="nh3"  value={r.nh3}  label={t('nh3Short')}  thresholds={thresholds} />
              <SensorMini sensorKey="temp" value={r.temp} label={t('tempShort')} thresholds={thresholds} />
              <SensorMini sensorKey="hum"  value={r.hum}  label={t('humShort')}  thresholds={thresholds} />
            </View>
          ) : null}

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.batteryWrap}>
              <BatteryBar value={r.bat} compact label={t('battery')} />
            </View>
            <View style={styles.agePill}>
              <Text style={styles.ageText}>
                {ageText ? `🕐 ${ageText}` : t('offline')}
              </Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Pulse>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 18,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 14,
    paddingLeft: 18,
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  tintOverlay: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  headerLeft: {
    flex: 1,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  devId: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: {
    width: 7, height: 7, borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  powerBanner: {
    backgroundColor: colors.power + '22',
    borderColor: colors.power + '70',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  powerBannerText: {
    color: colors.power,
    fontWeight: '800',
    fontSize: 13,
  },
  offlineBanner: {
    backgroundColor: colors.offline + '15',
    borderColor: colors.offline + '50',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 22,
    alignItems: 'center',
    marginBottom: 10,
  },
  offlineEmoji: { fontSize: 24, marginBottom: 4 },
  offlineBannerText: {
    color: colors.offline,
    fontWeight: '700',
    fontSize: 13,
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 4,
  },
  batteryWrap: { flex: 1, marginRight: 10 },
  agePill: {
    backgroundColor: colors.bgElevated,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ageText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default memo(CoopCard);
