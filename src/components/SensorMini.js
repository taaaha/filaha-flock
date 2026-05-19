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
    minHeight: 84,
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderStartWidth: 3,
    borderStartColor: colors.border,
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 16,
    minHeight: 32, // 2-line slot → all four tiles align
  },
  value: {
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 27,
    marginTop: 6,
  },
  unit: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default React.memo(SensorMini);
