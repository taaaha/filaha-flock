import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, statusColor } from '../utils/colors';
import { sensorStatus } from '../utils/thresholds';
import { formatNumber } from '../utils/formatters';

const SENSOR_META = {
  co2: { icon: '🌫️', accent: colors.co2, unit: 'ppm', decimals: 0 },
  nh3: { icon: '☣️', accent: colors.nh3, unit: 'ppm', decimals: 1 },
  temp: { icon: '🌡️', accent: colors.temp, unit: '°C', decimals: 1 },
  hum: { icon: '💧', accent: colors.hum, unit: '%', decimals: 0 },
};

export default function SensorMini({ sensorKey, value, label, thresholds }) {
  const meta = SENSOR_META[sensorKey] || {};
  const status = sensorStatus(sensorKey, value, thresholds || {});
  const sColor = statusColor(status);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{meta.icon || '•'}</Text>
      <View style={styles.col}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: sColor }]}>
            {value === null || value === undefined || isNaN(value)
              ? '—'
              : formatNumber(value, meta.decimals || 0)}
          </Text>
          <Text style={styles.unit}>{meta.unit}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 110,
  },
  icon: {
    fontSize: 20,
  },
  col: {
    flex: 1,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
  },
  unit: {
    color: colors.textTertiary,
    fontSize: 11,
  },
});
