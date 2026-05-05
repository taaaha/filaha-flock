import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, STATUS, statusColor } from '../utils/colors';

function Pill({ label, count, color }) {
  return (
    <View style={[styles.pill, { borderColor: color + '33' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.pillCount, { color }]}>{count}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

export default function SummaryBar({ counts, t }) {
  return (
    <View style={styles.container}>
      <Pill label={t('totalCoops')} count={counts.total} color={colors.accent} />
      <Pill label={t('ok')} count={counts.ok} color={statusColor(STATUS.OK)} />
      <Pill label={t('warning')} count={counts.warn} color={statusColor(STATUS.WARN)} />
      <Pill label={t('danger')} count={counts.danger} color={statusColor(STATUS.DANGER)} />
      <Pill label={t('offline')} count={counts.offline} color={statusColor(STATUS.OFFLINE)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillCount: {
    fontWeight: '800',
    fontSize: 14,
  },
  pillLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
