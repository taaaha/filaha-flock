import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, StatusBar, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { colors } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import { isToday } from '../utils/formatters';
import AlertItem from '../components/AlertItem';
import Icon from '../components/Icon';

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
        barStyle={colors.bg === '#070b14' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoSm}>
            <Icon name="feather" size={19} color={colors.accent} strokeWidth={2.3} />
          </View>
          <Text style={styles.title}>{t('alerts')}</Text>
        </View>
        <Pressable
          onPress={onClearAll}
          style={[
            styles.clearBtn,
            alerts.length === 0 && { opacity: 0.4 },
          ]}
          disabled={alerts.length === 0}
        >
          <Text style={styles.clearBtnText}>{t('clearAll')}</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            android_ripple={{ color: '#1a2235' }}
            style={[
              styles.filterChip,
              filter === f && styles.filterChipActive,
            ]}
          >
            <Text style={[
              styles.filterText,
              filter === f && styles.filterTextActive,
            ]}>
              {t(f === 'all' ? 'all' : f === 'alerts' ? 'alertsTab' : f === 'cleared' ? 'cleared' : 'today')}
            </Text>
          </Pressable>
        ))}
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
            <Text style={styles.emptyIcon}>✓</Text>
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
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoSm: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  logoSmImg: { width: 34, height: 34 },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearBtnText: {
    color: colors.danger,
    fontWeight: '700',
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
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    color: colors.ok,
    marginBottom: 12,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyHint: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
});
