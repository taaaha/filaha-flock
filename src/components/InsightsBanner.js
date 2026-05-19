import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors, shadows } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import Icon from './Icon';

const SEV_COLOR = { danger: 'danger', warn: 'warn', info: 'accent', success: 'ok' };
const SEV_WEIGHT = { danger: 4, warn: 3, info: 2, success: 1 };

/**
 * Compact dashboard entry point for the Smart Insights page.
 * Shows the single most urgent insight + a count, and routes to the
 * dedicated Insights tab where the full list lives. Keeps the dashboard
 * uncluttered while staying discoverable.
 */
export default function InsightsBanner({ insights, t, onPress }) {
  const styles = useStyles(makeStyles);
  if (!insights || insights.length === 0) return null;

  const top = [...insights].sort(
    (a, b) => (SEV_WEIGHT[b.severity] || 2) - (SEV_WEIGHT[a.severity] || 2)
  )[0];
  const tint = colors[SEV_COLOR[top.severity]] || colors.accent;
  const count = insights.length;

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: tint + '22' }}
      accessibilityRole="button"
      accessibilityLabel={`${t('insightsBannerTitle') || 'Smart insights'}. ${top.title}`}
      style={({ pressed }) => [
        styles.card,
        { borderStartColor: tint },
        top.severity === 'danger' ? shadows.glow(tint) : shadows.sm,
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={[styles.iconChip, { backgroundColor: tint + '1f' }]}>
        <Icon name={top.icon || 'target'} size={20} color={tint} strokeWidth={2.4} />
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.kicker} numberOfLines={1}>
            {t('insightsBannerTitle') || 'Smart insights'}
          </Text>
          <View style={[styles.countPill, { backgroundColor: tint + '1f' }]}>
            <Text style={[styles.countText, { color: tint }]}>{count}</Text>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={2}>{top.title}</Text>
      </View>

      <Icon name="chevronRight" size={20} color={colors.textTertiary} strokeWidth={2.4} />
    </Pressable>
  );
}

const makeStyles = () => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderStartWidth: 4,
  },
  iconChip: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { flex: 1, gap: 4 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kicker: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
    flex: 1,
  },
  countPill: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 7,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 12, fontWeight: '900' },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
});
