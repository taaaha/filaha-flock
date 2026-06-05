import React from 'react';
import { View, Text } from 'react-native';
import { colors, statusColor } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import { sensorStatus } from '../utils/thresholds';
import { formatNumber } from '../utils/formatters';

const DECIMALS = { co2: 0, nh3: 1, temp: 1, hum: 0 };
const UNIT = { co2: 'ppm', nh3: 'ppm', temp: '°C', hum: '%' };

// A self-contained sensor tile: elevated surface, a status-coloured accent
// on the start edge (RTL-safe), the label in a fixed two-line slot so every
// tile aligns even when an Arabic label wraps (e.g. "ثاني أكسيد الكربون"),
// and the value coloured by status. Number+unit stay in one Text so they
// never reorder to "°C 28" under RTL.
function SensorMini({ sensorKey, value, label, thresholds }) {
  const styles = useStyles(makeStyles);
  const status = sensorStatus(sensorKey, value, thresholds || {});
  const noData = value === null || value === undefined || isNaN(value);
  const accent = noData ? colors.textDim : statusColor(status);

  return (
    <View style={[styles.tile, { borderStartColor: accent }]}>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
      <Text
        style={[styles.value, { color: noData ? colors.textTertiary : accent }]}
        numberOfLines={1}
      >
        {noData ? '—' : formatNumber(value, DECIMALS[sensorKey] || 0)}
        {!noData ? <Text style={styles.unit}> {UNIT[sensorKey]}</Text> : null}
      </Text>
    </View>
  );
}

const makeStyles = () => ({
  tile: {
    flex: 1,
    minHeight: 86,
    backgroundColor: colors.cardElevated,   // warm sand, recessed in the card
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderStartWidth: 3,
    borderStartColor: colors.border,
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',          // a label, not a headline
    letterSpacing: 0.2,
    lineHeight: 16,
    minHeight: 32, // 2-line slot → all four tiles align
  },
  value: {
    fontSize: 25,
    fontWeight: '700',          // the number carries the weight
    letterSpacing: 0.3,
    lineHeight: 28,
    marginTop: 6,
  },
  unit: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '500',          // unit recedes behind the number
  },
});

export default React.memo(SensorMini);
