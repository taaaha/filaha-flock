import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { colors } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import Icon from './Icon';

const SEVERITY_COLORS = {
  info:    'accent',
  success: 'ok',
  warn:    'warn',
  danger:  'danger',
};

export default function SmartInsights({ insights, t, onNavigateCoop }) {
  const styles = useStyles(makeStyles);
  const [expandedId, setExpandedId] = useState(insights?.[0]?.id);
  if (!insights || insights.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="target" size={16} color={colors.accent} />
          <Text style={styles.headerTitle}>{t('smartInsights') || 'Smart insights'}</Text>
        </View>
        <Text style={styles.headerCount}>{insights.length}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
      >
        {insights.map((ins) => {
          const sevColor = colors[SEVERITY_COLORS[ins.severity]] || colors.accent;
          const expanded = expandedId === ins.id;
          return (
            <Pressable
              key={ins.id}
              onPress={() => {
                if (ins.deviceId && onNavigateCoop) onNavigateCoop(ins.deviceId);
                else setExpandedId(expanded ? null : ins.id);
              }}
              android_ripple={{ color: sevColor + '22' }}
              style={[
                styles.card,
                { borderColor: sevColor + '60', backgroundColor: sevColor + '0a' },
              ]}
            >
              <View style={styles.cardHead}>
                <View style={[styles.iconBox, { backgroundColor: sevColor + '20', borderColor: sevColor + '40' }]}>
                  <Icon name={ins.icon} size={16} color={sevColor} />
                </View>
                <Text style={[styles.cardTitle, { color: sevColor }]} numberOfLines={2}>
                  {ins.title}
                </Text>
              </View>
              <Text style={styles.cardBody} numberOfLines={4}>
                {ins.body}
              </Text>
              {ins.deviceId ? (
                <View style={styles.cardCta}>
                  <Text style={[styles.cardCtaText, { color: sevColor }]}>
                    {t('openCoop') || 'Open coop'}
                  </Text>
                  <Icon name="chevronRight" size={14} color={sevColor} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = () => ({
  wrap: { marginBottom: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.0,
  },
  headerCount: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '900',
    backgroundColor: colors.accent + '14',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  card: {
    width: 280,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  iconBox: {
    width: 32, height: 32, borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardBody: {
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 17,
  },
  cardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  cardCtaText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
