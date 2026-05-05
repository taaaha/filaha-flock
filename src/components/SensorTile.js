import React, { memo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, statusColor } from '../utils/colors';
import { sensorStatus } from '../utils/thresholds';
import { formatNumber } from '../utils/formatters';

const SENSOR_META = {
  co2: { icon: '🌫️', accent: colors.co2, unit: 'ppm', decimals: 0 },
  nh3: { icon: '☣️', accent: colors.nh3, unit: 'ppm', decimals: 1 },
  temp: { icon: '🌡️', accent: colors.temp, unit: '°C', decimals: 1 },
  hum: { icon: '💧', accent: colors.hum, unit: '%', decimals: 0 },
};

function SensorTile({ sensorKey, label, value, min, max, thresholds, selected, onPress, t }) {
  const meta = SENSOR_META[sensorKey] || {};
  const status = sensorStatus(sensorKey, value, thresholds || {});
  const sColor = statusColor(status);

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#1a2235' }}
      style={[
        styles.tile,
        { borderColor: selected ? meta.accent : colors.border },
        selected && { backgroundColor: colors.cardElevated },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.icon}>{meta.icon}</Text>
        <View style={[styles.badge, { backgroundColor: sColor + '22' }]}>
          <View style={[styles.dot, { backgroundColor: sColor }]} />
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: sColor }]}>
          {value === null || value === undefined || isNaN(value)
            ? '—'
            : formatNumber(value, meta.decimals || 0)}
        </Text>
        <Text style={styles.unit}>{meta.unit}</Text>
      </View>
      <View style={styles.minMaxRow}>
        <Text style={styles.minMaxText}>
          {t('todayMin')}: {min === null || min === undefined ? '—' : formatNumber(min, meta.decimals || 0)}
        </Text>
        <Text style={styles.minMaxText}>
          {t('todayMax')}: {max === null || max === undefined ? '—' : formatNumber(max, meta.decimals || 0)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    minHeight: 130,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  value: {
    fontSize: 28,
    fontWeight: '900',
  },
  unit: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  minMaxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 6,
  },
  minMaxText: {
    color: colors.textTertiary,
    fontSize: 11,
  },
});

export default memo(SensorTile);
