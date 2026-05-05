import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';

export default function BatteryBar({ value, lowAt = 20, label, compact = false }) {
  const v = typeof value === 'number' ? Math.max(0, Math.min(100, value)) : null;
  let color = colors.ok;
  if (v === null) color = colors.offline;
  else if (v <= 5) color = colors.danger;
  else if (v <= lowAt) color = colors.warn;

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.barOuter}>
        <View
          style={[
            styles.barInner,
            { width: `${v === null ? 0 : v}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.value, { color }]}>
        {v === null ? '—' : `${Math.round(v)}%`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowCompact: {
    gap: 6,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    minWidth: 48,
  },
  barOuter: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    borderRadius: 4,
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'right',
  },
});
