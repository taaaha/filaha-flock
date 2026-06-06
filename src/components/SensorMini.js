import React from 'react';
import { View, Text } from 'react-native';
import { colors, statusColor } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import { sensorStatus } from '../utils/thresholds';
import { formatNumber } from '../utils/formatters';
import Icon from './Icon';

const DECIMALS = { co2: 0, nh3: 1, temp: 1, hum: 0 };
const UNIT = { co2: 'ppm', nh3: 'ppm', temp: '°C', hum: '%' };
const SENSOR_ICON = { co2: 'cloud', nh3: 'wind', temp: 'thermometer', hum: 'droplet' };

// A friendly little stat pill: a soft round icon badge in the sensor's own
// color, then the value (tinted by status) with a small label underneath.
// Reads as a rounded, hand-made chip rather than a flat data cell.
function SensorMini({ sensorKey, value, label, thresholds }) {
  const styles = useStyles(makeStyles);
  const status = sensorStatus(sensorKey, value, thresholds || {});
  const noData = value === null || value === undefined || isNaN(value);
  const accent = noData ? colors.textDim : statusColor(status);
  const sensorColor = colors[sensorKey] || colors.accent;

  return (
    <View style={styles.pill}>
      <View style={[styles.iconBadge, { backgroundColor: sensorColor + '24' }]}>
        <Icon name={SENSOR_ICON[sensorKey]} size={16} color={sensorColor} strokeWidth={2.4} />
      </View>
      <View style={styles.textCol}>
        <Text
          style={[styles.value, { color: noData ? colors.textTertiary : accent }]}
          numberOfLines={1}
        >
          {noData ? '—' : formatNumber(value, DECIMALS[sensorKey] || 0)}
          {!noData ? <Text style={styles.unit}> {UNIT[sensorKey]}</Text> : null}
        </Text>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

const makeStyles = () => ({
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, minWidth: 0 },
  value: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  unit: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '500',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
});

export default React.memo(SensorMini);
