import React, { memo, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { colors, STATUS, statusColor, shadows } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import { strainLabel } from '../utils/poultryData';
import SensorMini from './SensorMini';
import BatteryBar from './BatteryBar';
import Pulse from './Pulse';
import { formatRelativeTime } from '../utils/formatters';

function coopAgeDays(device, now) {
  if (!device.chickArrivalDate) return null;
  const ms = now - device.chickArrivalDate;
  if (ms < 0) return 0;
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

function phaseColor(age) {
  if (age == null) return null;
  if (age <= 7) return '#fb923c';   // brooding
  if (age <= 21) return '#facc15';  // grower
  if (age <= 45) return '#22d3ee';  // finisher
  return '#94a3b8';                  // adult
}

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
  const styles = useStyles(makeStyles);
  const sColor = statusColor(status);
  const isDanger = status === STATUS.DANGER || status === STATUS.POWER_CUT;
  const isPower = status === STATUS.POWER_CUT;
  const isOffline = status === STATUS.OFFLINE;
  const r = reading || {};
  const ageText = reading ? formatRelativeTime(reading.timestamp, t, now) : null;
  const chickAge = coopAgeDays(device, now);
  const phColor = phaseColor(chickAge);
  const showSensors = !isOffline || isPower;

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
          accessibilityRole="button"
          accessibilityLabel={`${device.name}. ${statusLabel(status, t)}`}
          style={[
            styles.card,
            { borderColor: isDanger ? sColor + '55' : colors.border },
            isDanger ? shadows.glow(sColor) : shadows.sm,
          ]}
        >
          {/* Status stripe — logical start edge (RTL-correct) */}
          <View style={[styles.stripe, { backgroundColor: sColor }]} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.name} numberOfLines={1}>{device.name}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.devId} numberOfLines={1}>{device.id}</Text>
                {device.strain && strainLabel(device.strain) ? (
                  <View style={styles.strainBadge}>
                    <Text style={styles.strainBadgeText} numberOfLines={1}>
                      {strainLabel(device.strain)}
                    </Text>
                  </View>
                ) : null}
                {chickAge !== null ? (
                  <View style={[styles.ageChip, { borderColor: phColor + '60', backgroundColor: phColor + '1f' }]}>
                    <Text style={[styles.ageChipText, { color: phColor }]}>
                      {t('day') || 'Day'} {chickAge}
                    </Text>
                  </View>
                ) : null}
                {ageText ? (
                  <Text style={styles.age} numberOfLines={1}>{ageText}</Text>
                ) : null}
              </View>
            </View>
            <View style={[styles.badge, {
              backgroundColor: sColor + '1f',
              borderColor: sColor + '60',
            }]}>
              <View style={[styles.badgeDot, { backgroundColor: sColor }]} />
              <Text style={[styles.badgeText, { color: sColor }]} numberOfLines={1}>
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
          {showSensors ? (
            <View style={styles.sensorGrid}>
              <SensorMini sensorKey="co2"  value={r.co2}  label={t('co2Short')}  thresholds={thresholds} />
              <SensorMini sensorKey="nh3"  value={r.nh3}  label={t('nh3Short')}  thresholds={thresholds} />
              <SensorMini sensorKey="temp" value={r.temp} label={t('tempShort')} thresholds={thresholds} />
              <SensorMini sensorKey="hum"  value={r.hum}  label={t('humShort')}  thresholds={thresholds} />
            </View>
          ) : null}

          {/* Battery footer */}
          {showSensors ? (
            <View style={styles.footer}>
              <BatteryBar value={r.bat} compact label={t('battery')} />
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    </Pulse>
  );
}

const makeStyles = () => ({
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
    paddingEnd: 16,
    paddingStart: 22,
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    start: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  headerLeft: { flex: 1 },
  name: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  devId: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '700',
  },
  age: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  ageChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
  },
  ageChipText: {
    fontSize: 11,
    fontWeight: '900',
  },
  strainBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.accent + '60',
    backgroundColor: colors.accent + '18',
    maxWidth: 120,
  },
  strainBadgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '900' },

  powerBanner: {
    backgroundColor: colors.power + '22',
    borderColor: colors.power + '70',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  powerBannerText: {
    color: colors.power,
    fontWeight: '800',
    fontSize: 14,
  },
  offlineBanner: {
    backgroundColor: colors.offline + '14',
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
    fontSize: 14,
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
