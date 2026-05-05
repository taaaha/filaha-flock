import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';
import { formatRelativeTime, formatTime } from '../utils/formatters';

function alertColor(alert) {
  if (alert.type === 'CLEAR') return colors.ok;
  if (alert.subType === 'POWER_CUT') return colors.power;
  return colors.danger;
}

function alertTitle(alert, t) {
  if (alert.type === 'CLEAR') return t('alertCleared');
  switch (alert.subType) {
    case 'NH3': return t('ammoniaDanger');
    case 'CO2': return t('co2Danger');
    case 'TEMP': return t('tempDanger');
    case 'HUM': return t('humDanger');
    case 'POWER_CUT': return t('powerCut');
    case 'BATTERY': return t('lowBattery');
    default: return alert.message || t('danger');
  }
}

function AlertItem({ alert, onPress, t, now }) {
  const color = alertColor(alert);
  const title = alertTitle(alert, t);

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#1a2235' }}
      style={[
        styles.item,
        alert.acknowledged && { opacity: 0.55 },
      ]}
    >
      <View style={[styles.stripe, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color }]} numberOfLines={1}>
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
        {alert.message ? (
          <Text style={styles.message} numberOfLines={2}>
            {alert.message}
          </Text>
        ) : null}
        <Text style={styles.timestamp}>{formatTime(alert.timestamp)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
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
    paddingVertical: 12,
    paddingHorizontal: 12,
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
