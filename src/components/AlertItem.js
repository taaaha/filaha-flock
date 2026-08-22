import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, STATUS, statusColor, statusWash, statusInk } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import { formatRelativeTime, formatTime } from '../utils/formatters';

function alertStatus(alert) {
  if (alert.type === 'CLEAR') return STATUS.OK;
  if (alert.subType === 'POWER_CUT') return STATUS.POWER_CUT;
  return STATUS.DANGER;
}

function alertTitle(alert, t) {
  if (alert.type === 'CLEAR') {
    // A resolved power cut has its own wording — "cleared" alone is too vague.
    return alert.subType === 'POWER_CUT' ? t('powerRestored') : t('alertCleared');
  }
  switch (alert.subType) {
    case 'NH3': return t('ammoniaDanger');
    case 'CO2': return t('co2Danger');
    case 'TEMP': return t('tempDanger');
    case 'HUM': return t('humDanger');
    case 'POWER_CUT': return t('powerCut');
    case 'BATTERY': return t('lowBattery');
    case 'HEAT_STRESS': return t('heatStress');
    default: return t('danger');
  }
}

// Alerts used to store an already-translated body, which froze them in the
// language they were raised in — so an Arabic UI showed English bodies and
// vice-versa. We now store plain numbers and format them here, at render
// time, so every alert always matches the current language.
function alertDetail(alert) {
  const d = alert.detail;
  if (!d || d.value === null || d.value === undefined) return null;
  if (d.kind === 'value') return `${d.value} ${d.unit || ''}`.trim();
  if (d.kind === 'thi')   return `THI ${d.value}`;
  if (d.kind === 'pct')   return `${d.value}%`;
  return null;
}

function AlertItem({ alert, onPress, t, now }) {
  const styles = useStyles(makeStyles);
  const status = alertStatus(alert);
  const color = statusColor(status);
  const wash = statusWash(status);
  const ink = statusInk(status);
  const title = alertTitle(alert, t);
  const detail = alertDetail(alert);

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.textPrimary + '10' }}
      style={[
        styles.item,
        { backgroundColor: wash, borderColor: color + '33' },
        alert.acknowledged && { opacity: 0.55 },
      ]}
    >
      <View style={[styles.stripe, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: ink }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.time}>
            {formatRelativeTime(alert.timestamp, t, now)}
          </Text>
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          {alert.deviceName}
          {alert.farmName ? ` • ${alert.farmName}` : ''}
        </Text>
        {detail ? (
          <Text style={styles.message} numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
        <Text style={styles.timestamp}>{formatTime(alert.timestamp)}</Text>
      </View>
    </Pressable>
  );
}

const makeStyles = () => ({
  item: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stripe: {
    width: 5,
  },
  body: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  time: {
    color: colors.textTertiary,
    fontSize: 11,
    marginLeft: 8,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  timestamp: {
    color: colors.textTertiary,
    fontSize: 10,
    marginTop: 6,
  },
});

export default memo(AlertItem);
