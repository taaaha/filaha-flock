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
            isDanger && { borderColor: sColor + '55' },
            shadows.sm,
          ]}
        >
          {/* Status stripe — logical start edge (RTL-correct) */}
          <View style={[styles.stripe, { backgroundColor: sColor }]} />

          {/* Header — status-tinted zone */}
          <View style={[styles.headerRow, { backgroundColor: sColor + '14' }]}>
            <View style={styles.headerLeft}>
              <Text style={styles.name} numberOfLines={1}>{device.name}</Text>
              {/* Each token is its own Text so the bidi algorithm can't
                  jumble the LTR device id with the Arabic age label. */}
              <View style={styles.metaRow}>
                <Text style={styles.metaId} numberOfLines={1}>{device.id}</Text>
                {chickAge !== null ? (
                  <>
                    <Text style={styles.metaSep}>·</Text>
                    <Text style={styles.metaAge} numberOfLines={1}>
                      {t('day') || 'Day'} {chickAge}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>
            <View style={[styles.statusPill, { backgroundColor: sColor + '1a' }]}>
              <View style={[styles.statusDot, { backgroundColor: sColor }]} />
              <Text style={[styles.statusText, { color: sColor }]} numberOfLines={1}>
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

          {/* Sensors — 2×2 tiles */}
          {showSensors ? (
            <View style={styles.sensorGrid}>
              <View style={styles.sensorRow}>
                <SensorMini sensorKey="co2" value={r.co2} label={t('co2Short')} thresholds={thresholds} />
                <SensorMini sensorKey="nh3" value={r.nh3} label={t('nh3Short')} thresholds={thresholds} />
              </View>
              <View style={styles.sensorRow}>
                <SensorMini sensorKey="temp" value={r.temp} label={t('tempShort')} thresholds={thresholds} />
                <SensorMini sensorKey="hum" value={r.hum} label={t('humShort')} thresholds={thresholds} />
              </View>
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: 18,
    paddingBottom: 16,
    paddingEnd: 18,
    paddingStart: 22,
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    start: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 16,
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
    marginTop: 5,
  },
  metaId: {
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: '600',
    // The device id is always Latin/numeric — isolate it LTR so it
    // renders correctly inside the RTL (Arabic) layout.
    writingDirection: 'ltr',
  },
  metaSep: {
    color: colors.textDim,
    fontSize: 13,
  },
  metaAge: {
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '800' },

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
    gap: 10,
    marginBottom: 16,
  },
  sensorRow: {
    flexDirection: 'row',
    gap: 10,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
});

export default memo(CoopCard);
