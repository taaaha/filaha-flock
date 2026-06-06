import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, StatusBar, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { colors, barStyle } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import { isToday } from '../utils/formatters';
import AlertItem from '../components/AlertItem';
import Icon from '../components/Icon';
import CoopMascot from '../components/CoopMascot';

const FILTERS = ['all', 'alerts', 'cleared', 'today'];

export default function AlertsScreen() {
  const styles = useStyles(makeStyles);
  const { t, alerts, acknowledgeAlert, clearAllAlerts, now } = useApp();
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    let list = alerts;
    switch (filter) {
      case 'alerts':
        list = list.filter((a) => a.type === 'ALERT');
        break;
      case 'cleared':
        list = list.filter((a) => a.type === 'CLEAR');
        break;
      case 'today':
        list = list.filter((a) => isToday(a.timestamp));
        break;
      default: break;
    }
    return list;
  }, [alerts, filter]);

  const counts = useMemo(() => ({
    all: alerts.length,
    alerts: alerts.filter((a) => a.type === 'ALERT').length,
    cleared: alerts.filter((a) => a.type === 'CLEAR').length,
    today: alerts.filter((a) => isToday(a.timestamp)).length,
  }), [alerts]);

  const onClearAll = () => {
    if (alerts.length === 0) return;
    Alert.alert(
      t('clearAll'),
      '',
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('done'), style: 'destructive', onPress: () => clearAllAlerts() },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <StatusBar
        barStyle={barStyle()}
        backgroundColor={colors.bg}
      />
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoSm}>
            <CoopMascot status={counts.alerts > 0 ? 'danger' : 'ok'} size={32} />
          </View>
          <Text style={styles.title}>{t('alerts')}</Text>
        </View>
        <Pressable
          onPress={onClearAll}
          android_ripple={{ color: colors.danger + '18' }}
          style={({ pressed }) => [
            styles.clearBtn,
            alerts.length === 0 && { opacity: 0.4 },
            pressed && { opacity: 0.85 },
          ]}
          disabled={alerts.length === 0}
        >
          <Icon name="trash" size={15} color={colors.danger} strokeWidth={2.3} />
          <Text style={styles.clearBtnText}>{t('clearAll')}</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f;
          const label = t(f === 'all' ? 'all' : f === 'alerts' ? 'alertsTab' : f === 'cleared' ? 'cleared' : 'today');
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              android_ripple={{ color: colors.accent + '22' }}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {label}
              </Text>
              <View style={[styles.filterCount, active && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                  {counts[f]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlertItem
            alert={item}
            t={t}
            now={now}
            onPress={() => acknowledgeAlert(item.id)}
          />
        )}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <CoopMascot animated status="ok" size={88} />
            <Text style={styles.emptyTitle}>{t('noAlerts')}</Text>
            <Text style={styles.emptyHint}>{t('noAlertsHint')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const makeStyles = () => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  logoSm: {
    width: 44, height: 44, borderRadius: 15,
    backgroundColor: colors.accent + '1f',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.danger + '45',
    backgroundColor: colors.danger + '0e',
  },
  clearBtnText: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingStart: 13,
    paddingEnd: 8,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  filterTextActive: { color: '#fff' },
  filterCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.textTertiary + '24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountActive: { backgroundColor: '#ffffff33' },
  filterCountText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
  filterCountTextActive: { color: '#fff' },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyHint: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
});
