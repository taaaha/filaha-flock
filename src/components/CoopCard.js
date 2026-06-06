import React, { memo, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { colors, STATUS, statusColor, statusWash, statusInk, shadows } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import SensorMini from './SensorMini';
import BatteryBar from './BatteryBar';
import Pulse from './Pulse';
import CoopMascot from './CoopMascot';
import { formatRelativeTime } from '../utils/formatters';

function coopAgeDays(device, now) {
  if (!device.chickArrivalDate) return null;
  const ms = now - device.chickArrivalDate;
  if (ms < 0) return 0;
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
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
  const wash = statusWash(status);
  const ink = statusInk(status);
  const isDanger = status === STATUS.DANGER || status === STATUS.POWER_CUT;
  const isPower = status === STATUS.POWER_CUT;
  const isOffline = status === STATUS.OFFLINE;
  const r = reading || {};
  const ageText = reading ? formatRelativeTime(reading.timestamp, t, now) : null;
  const chickAge = coopAgeDays(device, now);
  const showSensors = !isOffline || isPower;

  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, friction: 7 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();

  return (
    <Pulse active={isDanger} color={sColor} intensity={0.5} style={styles.wrapper} borderRadius={26}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          android_ripple={{ color: sColor + '18', foreground: true }}
          accessibilityRole="button"
          accessibilityLabel={`${device.name}. ${statusLabel(status, t)}`}
          style={[
            styles.card,
            { backgroundColor: wash, borderColor: sColor + '3a' },
            shadows.md,
          ]}
        >
          {/* Header — mascot + name + status chip */}
          <View style={styles.topRow}>
            <View style={styles.mascotHug}>
              <CoopMascot status={status} size={50} />
            </View>

            <View style={styles.headMid}>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                {device.name}
              </Text>
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

            <View style={[styles.statusPill, { borderColor: sColor + '55' }]}>
              <View style={[styles.statusDot, { backgroundColor: sColor }]} />
              <Text style={[styles.statusText, { color: ink }]} numberOfLines={1}>
                {statusLabel(status, t)}
              </Text>
            </View>
          </View>

          {/* Friendly status line for the special states */}
          {isPower ? (
            <Text style={[styles.bannerLine, { color: ink }]}>⚡  {t('powerCut')}</Text>
          ) : null}
          {isOffline && !isPower ? (
            <Text style={[styles.bannerLine, { color: ink }]}>
              📡  {t('offline')}{ageText ? `  ·  ${ageText}` : ''}
            </Text>
          ) : null}

          {/* Sensors — 2×2 friendly pills */}
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
            <View style={[styles.footer, { borderTopColor: sColor + '22' }]}>
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
    marginBottom: 14,
    borderRadius: 26,
  },
  card: {
    borderRadius: 26,
    borderWidth: 1.5,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mascotHug: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#ffffff55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headMid: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  metaId: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    writingDirection: 'ltr',
  },
  metaSep: { color: colors.textTertiary, fontSize: 13 },
  metaAge: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: colors.bgElevated,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },

  bannerLine: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },

  sensorGrid: {
    gap: 10,
    marginTop: 14,
  },
  sensorRow: {
    flexDirection: 'row',
    gap: 10,
  },

  footer: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 14,
  },
});

export default memo(CoopCard);
