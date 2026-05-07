import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { colors, STATUS, statusColor } from '../utils/colors';

function AnimatedCount({ value, color }) {
  const [display, setDisplay] = useState(value);
  const anim = useRef(new Animated.Value(value)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value,
      duration: 450,
      useNativeDriver: false,
    }).start();
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => anim.removeListener(id);
  }, [value, anim]);

  return <Text style={[styles.count, { color }]}>{display}</Text>;
}

function StatCard({ label, count, color, icon, active }) {
  return (
    <View style={[
      styles.card,
      { borderTopColor: color },
      active && { borderColor: color + '70', backgroundColor: color + '10' },
    ]}>
      <View style={styles.cardHead}>
        <View style={[styles.iconBox, { backgroundColor: color + '22' }]}>
          <Text style={[styles.icon, { color }]}>{icon}</Text>
        </View>
        <AnimatedCount value={count} color={color} />
      </View>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function SummaryBar({ counts, t }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <StatCard
        label={t('totalCoops')}
        count={counts.total}
        color={colors.accent}
        icon="🏡"
      />
      <StatCard
        label={t('ok')}
        count={counts.ok}
        color={statusColor(STATUS.OK)}
        icon="✓"
        active={counts.ok > 0 && counts.danger === 0 && counts.warn === 0}
      />
      <StatCard
        label={t('warning')}
        count={counts.warn}
        color={statusColor(STATUS.WARN)}
        icon="▲"
        active={counts.warn > 0}
      />
      <StatCard
        label={t('danger')}
        count={counts.danger}
        color={statusColor(STATUS.DANGER)}
        icon="!"
        active={counts.danger > 0}
      />
      <StatCard
        label={t('offline')}
        count={counts.offline}
        color={statusColor(STATUS.OFFLINE)}
        icon="○"
        active={counts.offline > 0}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 3,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    minWidth: 100,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 14,
    fontWeight: '900',
  },
  count: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
});
