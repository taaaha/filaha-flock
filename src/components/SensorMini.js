import React from 'react';
import { View, Text } from 'react-native';
import { colors, statusColor } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import { sensorStatus } from '../utils/thresholds';
import { formatNumber } from '../utils/formatters';

const DECIMALS = { co2: 0, nh3: 1, temp: 1, hum: 0 };
const UNIT = { co2: 'ppm', nh3: 'ppm', temp: '°C', hum: '%' };

// Clean & minimal, RTL-safe: muted label on top, big value below. Status
// is the value's COLOUR — no floating dot to get shoved across the cell
// by the bidi/flex layout in Arabic.
export default function SensorMini({ sensorKey, value, label, thresholds }) {
  const styles = useStyles(makeStyles);
  const status = sensorStatus(sensorKey, value, thresholds || {});
  const noData = value === null || value === undefined || isNaN(value);
  const valueColor = noData ? colors.textTertiary : statusColor(status);

  return (
    <View style={styles.cell}>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
      {/* Number + unit in ONE Text, LTR, so it never reorders to "°C 28". */}
      <Text style={[styles.value, { color: valueColor }]} numberOfLines={1}>
        {noData ? '—' : formatNumber(value, DECIMALS[sensorKey] || 0)}
        {!noData ? <Text style={styles.unit}> {UNIT[sensorKey]}</Text> : null}
      </Text>
    </View>
  );
}

const makeStyles = () => ({
  cell: {
    width: '50%',
    paddingEnd: 12,
    marginBottom: 16,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
    // Fixed two-line slot so all four cells align even when one label
    // wraps (e.g. "ثاني أكسيد الكربون") and others are single words.
    minHeight: 34,
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  unit: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
});
