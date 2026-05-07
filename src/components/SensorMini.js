import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, statusColor } from '../utils/colors';
import { sensorStatus } from '../utils/thresholds';
import { formatNumber } from '../utils/formatters';

const SENSOR_META = {
  co2:  { icon: '🌫️', unit: 'ppm', decimals: 0 },
  nh3:  { icon: '☢️',  unit: 'ppm', decimals: 1 },
  temp: { icon: '🌡️', unit: '°C',  decimals: 1 },
  hum:  { icon: '💧', unit: '%',   decimals: 0 },
};

export default function SensorMini({ sensorKey, value, label, thresholds }) {
  const meta = SENSOR_META[sensorKey] || {};
  const status = sensorStatus(sensorKey, value, thresholds || {});
  const sColor = statusColor(status);
  const noData = value === null || value === undefined || isNaN(value);

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { backgroundColor: sColor + '1d' }]}>
        <Text style={styles.icon}>{meta.icon || '•'}</Text>
      </View>
      <View style={styles.col}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: noData ? colors.textTertiary : sColor }]}>
            {noData ? '—' : formatNumber(value, meta.decimals || 0)}
          </Text>
          {!noData ? <Text style={styles.unit}>{meta.unit}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flexBasis: '50%',
    minWidth: '48%',
    paddingRight: 6,
    marginBottom: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 18 },
  col: { flex: 1 },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginTop: 2,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 23,
  },
  unit: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
  },
});
