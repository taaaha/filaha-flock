import React, { memo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { colors, STATUS, statusColor, shadows } from '../utils/colors';
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
    <Pulse active={isDanger} color={sColor} intensity={0.5} style={styles.wrapper} borderRadius={20}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          android_ripple={{ color: sColor + '20', foreground: true }}
          style={[
            styles.card,
            { borderColor: isDanger ? sColor + '50' : colors.border },
            isDanger && shadows.glow(sColor),
            !isDanger && shadows.sm,
          ]}
        >
          {/* Status bar on the left */}
          <View style={[styles.stripe, { backgroundColor: sColor }]} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.name} numberOfLines={1}>{device.name}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.devId}>{device.id}</Text>
                {ageText ? (
                  <>
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.age}>{ageText}</Text>
                  </>
                ) : null}
              </View>
            </View>
            <View style={[styles.badge, {
              backgroundColor: sColor + '1d',
              borderColor: sColor + '60',
            }]}>
              <View style={[styles.badgeDot, { backgroundColor: sColor }]} />
              <Text style={[styles.badgeText, { color: sColor }]}>
                {statusLabel(status, t)}
              </Text>
            </View>
          </View>

          {/* Power-cut banner */}
          {isPower ? (
            <View style={styles.powerBanner}>
              <Text style={styles.powerBannerText}>⚡  {t('powerCut')}</Text>
            </View>
          ) : null}

          {/* Offline banner */}
          {isOffline && !isPower ? (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineEmoji}>📡</Text>
              <Text style={styles.offlineBannerText}>{t('offline')}</Text>
            </View>
          ) : null}

          {/* Sensors grid */}
          {!isOffline || isPower ? (
            <View style={styles.sensorGrid}>
              <SensorMini sensorKey="co2"  value={r.co2}  label={t('co2Short')}  thresholds={thresholds} />
              <SensorMini sensorKey="nh3"  value={r.nh3}  label={t('nh3Short')}  thresholds={thresholds} />
              <SensorMini sensorKey="temp" value={r.temp} label={t('tempShort')} thresholds={thresholds} />
              <SensorMini sensorKey="hum"  value={r.hum}  label={t('humShort')}  thresholds={thresholds} />
            </View>
          ) : null}

          {/* Battery footer */}
          {!isOffline || isPower ? (
            <View style={styles.footer}>
              <BatteryBar value={r.bat} compact label={t('battery')} />
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    </Pulse>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    paddingTop: 16,
    paddingBottom: 14,
    paddingRight: 16,
    paddingLeft: 22,
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  headerLeft: { flex: 1 },
  name: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  devId: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  dot: { color: colors.textDim, fontSize: 11 },
  age: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
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
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '900' },

  powerBanner: {
    backgroundColor: colors.power + '22',
    borderColor: colors.power + '70',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  powerBannerText: {
    color: colors.power,
    fontWeight: '800',
    fontSize: 13,
  },
  offlineBanner: {
    backgroundColor: colors.offline + '12',
    borderColor: colors.offline + '40',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 22,
    alignItems: 'center',
  },
  offlineEmoji: { fontSize: 22, marginBottom: 4, opacity: 0.7 },
  offlineBannerText: {
    color: colors.offline,
    fontWeight: '700',
    fontSize: 13,
  },

  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
});

export default memo(CoopCard);
