import React, { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors, shadows } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import Icon from './Icon';

// severity → palette key, sort weight, tag-label key.
// Higher weight floats to the top so the most urgent guidance is seen first.
const SEVERITY = {
  danger:  { colorKey: 'danger', weight: 4, tagKey: 'insightSevDanger' },
  warn:    { colorKey: 'warn',   weight: 3, tagKey: 'insightSevWarn' },
  info:    { colorKey: 'accent', weight: 2, tagKey: 'insightSevInfo' },
  success: { colorKey: 'ok',     weight: 1, tagKey: 'insightSevSuccess' },
};

const DEFAULT_VISIBLE = 2;

function InsightCard({ ins, t, onPress, styles }) {
  const sev = SEVERITY[ins.severity] || SEVERITY.info;
  const tint = colors[sev.colorKey] || colors.accent;
  const actionable = !!ins.deviceId && !!onPress;

  const Body = (
    <>
      <View style={styles.cardHead}>
        <View style={[styles.iconChip, { backgroundColor: tint + '1f' }]}>
          <Icon name={ins.icon || 'target'} size={20} color={tint} strokeWidth={2.4} />
        </View>
        <View style={styles.headText}>
          <View style={[styles.tag, { backgroundColor: tint + '1f' }]}>
            <Text style={[styles.tagText, { color: tint }]} numberOfLines={1}>
              {t(sev.tagKey) || ins.severity}
            </Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {ins.title}
          </Text>
        </View>
      </View>

      <Text style={styles.cardBody}>{ins.body}</Text>

      {actionable ? (
        <View style={[styles.cta, { backgroundColor: tint + '14', borderColor: tint + '40' }]}>
          <Text style={[styles.ctaText, { color: tint }]} numberOfLines={1}>
            {t('openCoop') || 'Open coop'}
          </Text>
          <Icon name="chevronRight" size={16} color={tint} strokeWidth={2.6} />
        </View>
      ) : null}
    </>
  );

  const cardStyle = [
    styles.card,
    { borderStartColor: tint },
    ins.severity === 'danger' ? shadows.glow(tint) : shadows.sm,
  ];

  if (!actionable) {
    return <View style={cardStyle}>{Body}</View>;
  }

  return (
    <Pressable
      onPress={() => onPress(ins.deviceId)}
      android_ripple={{ color: tint + '22' }}
      accessibilityRole="button"
      accessibilityLabel={`${ins.title}. ${ins.body}`}
      style={({ pressed }) => [cardStyle, pressed && styles.cardPressed]}
    >
      {Body}
    </Pressable>
  );
}

export default function SmartInsights({ insights, t, onNavigateCoop }) {
  const styles = useStyles(makeStyles);
  const [expanded, setExpanded] = useState(false);

  // Sort by severity weight (stable for equal weights — preserves the
  // engine's own ordering inside a tier).
  const sorted = useMemo(() => {
    if (!insights || insights.length === 0) return [];
    return insights
      .map((ins, i) => ({ ins, i }))
      .sort((a, b) => {
        const wa = (SEVERITY[a.ins.severity] || SEVERITY.info).weight;
        const wb = (SEVERITY[b.ins.severity] || SEVERITY.info).weight;
        return wb - wa || a.i - b.i;
      })
      .map((x) => x.ins);
  }, [insights]);

  if (sorted.length === 0) return null;

  const visible = expanded ? sorted : sorted.slice(0, DEFAULT_VISIBLE);
  const hidden = sorted.length - DEFAULT_VISIBLE;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="target" size={17} color={colors.accent} strokeWidth={2.5} />
          <Text style={styles.headerTitle}>{t('smartInsights') || 'Smart insights'}</Text>
        </View>
        <View style={styles.headerCountPill}>
          <Text style={styles.headerCount}>{sorted.length}</Text>
        </View>
      </View>

      <View style={styles.stack}>
        {visible.map((ins) => (
          <InsightCard
            key={ins.id}
            ins={ins}
            t={t}
            onPress={onNavigateCoop}
            styles={styles}
          />
        ))}
      </View>

      {hidden > 0 ? (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          android_ripple={{ color: colors.accent + '22' }}
          accessibilityRole="button"
          style={styles.showMore}
        >
          <Text style={styles.showMoreText}>
            {expanded
              ? (t('insightsShowLess') || 'Show less')
              : `${t('insightsShowAll') || 'Show all'} (${hidden})`}
          </Text>
          <Icon
            name={expanded ? 'chevronUp' : 'chevronDown'}
            size={16}
            color={colors.accent}
            strokeWidth={2.6}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = () => ({
  wrap: { marginBottom: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '900',
  },
  headerCountPill: {
    minWidth: 24,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: colors.accent + '1f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCount: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },

  stack: {
    marginHorizontal: 16,
    gap: 10,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderStartWidth: 4,
    borderStartColor: colors.accent,
  },
  cardPressed: { opacity: 0.88, transform: [{ scale: 0.992 }] },

  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: { flex: 1, gap: 5 },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '900',
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },

  cardBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '900',
  },

  showMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 10,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  showMoreText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '900',
  },
});
