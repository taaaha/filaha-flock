import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, StatusBar, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import SmartInsights from '../components/SmartInsights';
import { useApp } from '../contexts/AppContext';
import { colors } from '../utils/colors';
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
      <StatusBar barStyle={colors.bg === '#070b14' ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.iconBadge}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.brandLogo}
                resizeMode="cover"
              />
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
              <Text style={styles.chipNum}>{insights.length}</Text>
              <Text style={styles.chipLabel}>{t('smartInsights') || 'Insights'}</Text>
            </View>
            <View style={[
              styles.chip,
              actionable > 0 && { backgroundColor: colors.warn + '14', borderColor: colors.warn + '50' },
            ]}>
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
                <Icon name="checkCircle" size={44} color={colors.ok} strokeWidth={2.2} />
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
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: colors.accent + '1f',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  brandLogo: { width: 46, height: 46 },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
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
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipNum: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
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
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: colors.ok + '14',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 22,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
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
