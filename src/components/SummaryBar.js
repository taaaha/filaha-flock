import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, STATUS, statusColor, shadows } from '../utils/colors';
import { useStyles } from '../utils/useStyles';

function AnimatedCount({ value, color, size = 28 }) {
  const [display, setDisplay] = useState(value);
  const anim = useRef(new Animated.Value(value)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 500, useNativeDriver: false }).start();
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => anim.removeListener(id);
  }, [value, anim]);

  return (
    <Text style={{
      color, fontSize: size, fontWeight: '900',
      lineHeight: size * 1.1,
      letterSpacing: -0.5,
    }}>{display}</Text>
  );
}

function StatPill({ label, count, color, accent = false }) {
  return (
    <View style={[styles.pill, accent && { borderColor: color + '40', backgroundColor: color + '10' }]}>
      <View style={styles.pillTopRow}>
        <View style={[styles.pillDot, { backgroundColor: color }]} />
        <Text style={styles.pillLabel} numberOfLines={1}>{label}</Text>
      </View>
      <AnimatedCount value={count} color={accent ? color : colors.textPrimary} size={22} />
    </View>
  );
}

export default function SummaryBar({ counts, t }) {
  const styles = useStyles(makeStyles);
  // Single elegant card with the four key stats
  return (
    <View style={styles.wrap}>
      <View style={[styles.card, shadows.sm]}>
        <View style={styles.heroSide}>
          <Text style={styles.heroLabel}>{t('totalCoops')}</Text>
          <AnimatedCount value={counts.total} color={colors.textPrimary} size={36} />
        </View>
        <View style={styles.divider} />
        <View style={styles.statsCol}>
          <StatPill
            label={t('ok')}
            count={counts.ok}
            color={statusColor(STATUS.OK)}
            accent={counts.ok > 0 && counts.danger === 0 && counts.warn === 0}
          />
          <StatPill
            label={t('warning')}
            count={counts.warn}
            color={statusColor(STATUS.WARN)}
            accent={counts.warn > 0}
          />
        </View>
        <View style={styles.statsCol}>
          <StatPill
            label={t('danger')}
            count={counts.danger}
            color={statusColor(STATUS.DANGER)}
            accent={counts.danger > 0}
          />
          <StatPill
            label={t('offline')}
            count={counts.offline}
            color={statusColor(STATUS.OFFLINE)}
            accent={counts.offline > 0}
          />
        </View>
      </View>
    </View>
  );
}

const makeStyles = () => ({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  heroSide: {
    justifyContent: 'center',
    minWidth: 64,
  },
  heroLabel: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  statsCol: {
    flex: 1,
    gap: 8,
    justifyContent: 'space-between',
  },
  pill: {
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 1,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },
});
