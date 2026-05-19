import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, shadows } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import Icon from './Icon';
import HealthScore from './HealthScore';
import { computeFarmHealth, healthTier } from '../utils/farmHealth';
import { DAILY_TASKS } from '../utils/guideContent';
import TaskChecklistModal from './TaskChecklistModal';

const DAILY_KEY = '@filaha:dailyTasksDone';
const SEV_COLOR = { danger: 'danger', warn: 'warn', info: 'accent', success: 'ok' };
const SEV_WEIGHT = { danger: 4, warn: 3, info: 2, success: 1 };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function timeOfDay(hour) {
  if (hour < 5)  return { icon: 'moon', key: 'greetNight' };
  if (hour < 12) return { icon: 'sun',  key: 'greetMorning' };
  if (hour < 17) return { icon: 'sun',  key: 'greetAfternoon' };
  if (hour < 21) return { icon: 'sun',  key: 'greetEvening' };
  return { icon: 'moon', key: 'greetNight' };
}

/**
 * Compact daily briefing. Everything the old tall card had — health score,
 * greeting, daily-tasks checklist, smart guidance — but in ~1/3 the height
 * so the screen stays focused on the flock cards. The FULL insight list
 * lives in the dedicated Insights tab; here we surface only the single most
 * urgent one as a tappable strip.
 */
export default function DailyBriefing({
  t, language, settings, devices, readings, thresholds, powerCut, now,
  onPressTasks, onPressHelp,
  insights = [], onOpenInsight, onSeeAllInsights,
}) {
  const styles = useStyles(makeStyles);
  const [doneIds, setDoneIds] = useState({});
  const [tasksOpen, setTasksOpen] = useState(false);

  const greet = timeOfDay(new Date(now).getHours());
  const farmerName = (settings?.farmerName || '').trim();

  const score = useMemo(() =>
    computeFarmHealth(devices, readings, thresholds, powerCut, now),
  [devices, readings, thresholds, powerCut, now]);
  const tier = healthTier(score, colors);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DAILY_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed.date === todayStr()) setDoneIds(parsed.ids || {});
        else setDoneIds({});
      } catch (e) {}
    })();
  }, [now]);

  const toggleTask = (id) => {
    setDoneIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      AsyncStorage.setItem(
        DAILY_KEY, JSON.stringify({ date: todayStr(), ids: next })
      ).catch(() => {});
      return next;
    });
  };

  const hasDevices = !!devices && devices.length > 0;
  const doneCount = DAILY_TASKS.filter((x) => doneIds[x.id]).length;
  const allDone = hasDevices && doneCount >= DAILY_TASKS.length;

  const sortedInsights = useMemo(() => {
    if (!insights || insights.length === 0) return [];
    return [...insights].sort(
      (a, b) => (SEV_WEIGHT[b.severity] || 2) - (SEV_WEIGHT[a.severity] || 2)
    );
  }, [insights]);
  const topInsight = sortedInsights[0];
  const moreCount = Math.max(0, sortedInsights.length - 1);

  const greeting = `${t(greet.key) || 'Hello'}${farmerName ? `، ${farmerName}` : ''}`;
  const statusLine = score == null
    ? (t('healthNoDataBody') || 'Add a coop to start monitoring.')
    : `${t(`tier_${tier.label}`) || tier.label}${
        score >= 90 ? '' : (topInsight ? ` · ${topInsight.title}` : '')}`;

  return (
    <>
    <View style={[styles.card, shadows.sm]}>
      {/* Top strip: ring · greeting+status · tasks */}
      <View style={styles.strip}>
        <HealthScore score={score} t={t} size={54} strokeWidth={6} />

        <View style={styles.mid}>
          <View style={styles.greetLine}>
            <Icon name={greet.icon} size={14} color={tier.color} strokeWidth={2.4} />
            <Text style={styles.greeting} numberOfLines={1}>{greeting}</Text>
            {onPressHelp ? (
              <Pressable
                onPress={onPressHelp}
                hitSlop={12}
                android_ripple={{ color: colors.accent + '33', borderless: true, radius: 18 }}
                accessibilityRole="button"
              >
                <Icon name="info" size={16} color={colors.textTertiary} />
              </Pressable>
            ) : null}
          </View>
          <Text style={[styles.status, { color: tier.color }]} numberOfLines={1}>
            {statusLine}
          </Text>
        </View>

        {hasDevices ? (
          <Pressable
            onPress={() => setTasksOpen(true)}
            android_ripple={{ color: (allDone ? colors.ok : colors.accent) + '22', borderless: false }}
            accessibilityRole="button"
            accessibilityLabel={t('tasksDoneToday') || 'Daily tasks'}
            style={({ pressed }) => [
              styles.tasksBtn,
              { borderColor: (allDone ? colors.ok : colors.accent) + '55' },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Icon
              name={allDone ? 'checkCircle' : 'clock'}
              size={16}
              color={allDone ? colors.ok : colors.accent}
              strokeWidth={2.5}
            />
            <Text style={[styles.tasksTxt, { color: allDone ? colors.ok : colors.accent }]}>
              {doneCount}/{DAILY_TASKS.length}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* One-line smart guidance — the single most urgent item. The rest
          live in the Insights tab (tap the count). */}
      {topInsight ? (
        <Pressable
          onPress={() => onOpenInsight && onOpenInsight(topInsight)}
          android_ripple={{ color: colors.accent + '18' }}
          accessibilityRole="button"
          accessibilityLabel={topInsight.title}
          style={({ pressed }) => [styles.insRow, pressed && { opacity: 0.85 }]}
        >
          <View style={[
            styles.insDot,
            { backgroundColor: colors[SEV_COLOR[topInsight.severity]] || colors.accent },
          ]} />
          <Text style={styles.insText} numberOfLines={1}>{topInsight.title}</Text>
          {moreCount > 0 ? (
            <Pressable
              onPress={onSeeAllInsights}
              hitSlop={8}
              android_ripple={{ color: colors.accent + '22' }}
              style={styles.morePill}
            >
              <Text style={styles.moreTxt}>+{moreCount}</Text>
            </Pressable>
          ) : null}
          <Icon name="chevronRight" size={16} color={colors.textTertiary} strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </View>

    <TaskChecklistModal
      visible={tasksOpen}
      tasks={DAILY_TASKS}
      doneIds={doneIds}
      language={language}
      t={t}
      onToggle={toggleTask}
      onClose={() => setTasksOpen(false)}
    />
    </>
  );
}

const makeStyles = () => ({
  card: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mid: { flex: 1, gap: 3 },
  greetLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greeting: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  status: {
    fontSize: 13,
    fontWeight: '700',
  },

  tasksBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: colors.bgElevated,
  },
  tasksTxt: { fontSize: 13, fontWeight: '900' },

  insRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  insDot: { width: 8, height: 8, borderRadius: 4 },
  insText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  morePill: {
    paddingHorizontal: 8,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent + '1f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreTxt: { color: colors.accent, fontSize: 12, fontWeight: '900' },
});
