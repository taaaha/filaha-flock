import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, StatusBar, RefreshControl, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import SmartInsights from '../components/SmartInsights';
import CoopMascot from '../components/CoopMascot';
import { useApp } from '../contexts/AppContext';
import { colors, barStyle } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import { generateInsights } from '../services/Insights';
import { Haptics } from '../services/Haptics';

export default function InsightsScreen({ navigation }) {
  const {
    t, language, devices, readings, alerts, thresholds, now,
  } = useApp();
  const styles = useStyles(makeStyles);
  const [refreshing, setRefreshing] = useState(false);

  const insights = useMemo(() => generateInsights({
    devices, readings, alerts, thresholds, now, t, language,
  }), [devices, readings, alerts, thresholds, now, t, language]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.light();
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  // Forward to the focused issue view (live data + research guidance),
  // not straight to the coop. InsightDetail lives in this same stack.
  const openInsight = useCallback((ins) => {
    navigation.navigate('InsightDetail', { insight: ins });
  }, [navigation]);

  const actionable = insights.filter(
    (i) => i.severity === 'danger' || i.severity === 'warn'
  ).length;

  return (
    <View style={styles.safe}>
      <StatusBar barStyle={barStyle()} backgroundColor={colors.bg} />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.iconBadge}>
              <CoopMascot status={actionable > 0 ? 'warn' : 'ok'} size={36} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {t('smartInsights') || 'Smart insights'}
              </Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                {t('insightsScreenSub') || 'Smart guidance for all your coops'}
              </Text>
            </View>
          </View>

          {/* Summary chips */}
          <View style={styles.chipsRow}>
            <View style={styles.chip}>
              <View style={[styles.chipIcon, { backgroundColor: colors.accent + '1f' }]}>
                <Icon name="target" size={15} color={colors.accent} strokeWidth={2.4} />
              </View>
              <Text style={styles.chipNum}>{insights.length}</Text>
              <Text style={styles.chipLabel}>{t('smartInsights') || 'Insights'}</Text>
            </View>
            <View style={[
              styles.chip,
              actionable > 0 && { backgroundColor: colors.warn + '12', borderColor: colors.warn + '50' },
            ]}>
              <View style={[styles.chipIcon, { backgroundColor: (actionable > 0 ? colors.warn : colors.textTertiary) + '1f' }]}>
                <Icon name="alertTriangle" size={15} color={actionable > 0 ? colors.warn : colors.textTertiary} strokeWidth={2.4} />
              </View>
              <Text style={[
                styles.chipNum,
                { color: actionable > 0 ? colors.warn : colors.textPrimary },
              ]}>{actionable}</Text>
              <Text style={styles.chipLabel}>{t('insightSevWarn') || 'Need action'}</Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        >
          {/* Reports entry — daily/weekly/monthly per-coop production reports */}
          <Pressable
            onPress={() => navigation.navigate('Reports')}
            android_ripple={{ color: colors.accent + '18' }}
            style={{
              flexDirection: 'row', alignItems: 'center',
              marginHorizontal: 16, marginBottom: 14,
              backgroundColor: colors.card, borderRadius: 18,
              borderWidth: 1.5, borderColor: colors.accent + '44',
              paddingHorizontal: 14, paddingVertical: 14,
            }}
          >
            <View style={{
              width: 40, height: 40, borderRadius: 13, marginEnd: 12,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.accent + '1c',
            }}>
              <Icon name="activity" size={20} color={colors.accent} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 15.5, fontWeight: '800' }}>
                {t('reportsTitle')}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12.5, marginTop: 2 }} numberOfLines={2}>
                {t('reportsSub')}
              </Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.textTertiary} />
          </Pressable>

          {insights.length > 0 ? (
            <SmartInsights
              insights={insights}
              t={t}
              onNavigateCoop={openInsight}
              showHeader={false}
              maxVisible={Infinity}
            />
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIconBox}>
                <CoopMascot animated status="ok" size={88} />
              </View>
              <Text style={styles.emptyTitle}>
                {t('insightsAllClear') || 'Everything under control'}
              </Text>
              <Text style={styles.emptyHint}>
                {t('insightsAllClearBody') || 'No actions needed right now. Keep up the daily check.'}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = () => ({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 46, height: 46, borderRadius: 16,
    backgroundColor: colors.accent + '1f',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  brandLogo: { width: 46, height: 46 },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
    lineHeight: 18,
  },

  chipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipIcon: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  chipNum: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '800',
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 96, height: 96, borderRadius: 26,
    backgroundColor: colors.okWash,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 22,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 280,
  },
});
