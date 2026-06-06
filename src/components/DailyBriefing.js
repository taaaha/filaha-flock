import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, shadows } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import Icon from './Icon';
import HealthScore from './HealthScore';
import LivingSky from './LivingSky';
import { DAILY_TASKS } from '../utils/guideContent';
import TaskChecklistModal from './TaskChecklistModal';
import { deviceStatus } from '../utils/thresholds';
import { STATUS } from '../utils/colors';

const DAILY_KEY = '@filaha:dailyTasksDone';
const SEV_COLOR = { danger: 'danger', warn: 'warn', info: 'accent', success: 'ok' };
const SEV_WEIGHT = { danger: 4, warn: 3, info: 2, success: 1 };
const SKY_H = 116;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function timeOfDay(hour) {
  if (hour < 5)  return { key: 'greetNight' };
  if (hour < 12) return { key: 'greetMorning' };
  if (hour < 17) return { key: 'greetAfternoon' };
  if (hour < 21) return { key: 'greetEvening' };
  return { key: 'greetNight' };
}

/**
 * The dashboard hero. The living-sky scene (time of day + farm mood, with the
 * chick) IS the top of this card; the greeting + "Add coop" sit over it, and
 * the cream body carries the status ring, the plain-language status sentence,
 * the daily-tasks chip, and the single most urgent insight. One friendly,
 * cohesive card — not a separate banner stacked on a separate card.
 */
export default function DailyBriefing({
  t, language, settings, devices, readings, thresholds, powerCut, now,
  onAddCoop, helpButton,
  insights = [], onOpenInsight, onSeeAllInsights,
}) {
  const styles = useStyles(makeStyles);
  const [doneIds, setDoneIds] = useState({});
  const [tasksOpen, setTasksOpen] = useState(false);
  const [insExpanded, setInsExpanded] = useState(false);

  const hour = new Date(now).getHours();
  const greet = timeOfDay(hour);
  const farmerName = (settings?.farmerName || '').trim();

  // Farmer-language breakdown: how many coops are fine vs need attention vs
  // are in actual danger. Powers the ring, the status sentence AND the sky mood.
  const counts = useMemo(() => {
    let ok = 0, attention = 0, danger = 0;
    (devices || []).forEach((d) => {
      const list = (readings && readings[d.id]) || [];
      const reading = list.length ? list[list.length - 1] : null;
      const isPowerCut = !!(powerCut && powerCut[d.id]);
      const s = deviceStatus(d, reading, thresholds, now, isPowerCut);
      if (s === STATUS.OK) ok++;
      else if (s === STATUS.DANGER || s === STATUS.POWER_CUT) danger++;
      else attention++;                              // WARN + OFFLINE
    });
    return { total: (devices || []).length, ok, attention, danger };
  }, [devices, readings, thresholds, powerCut, now]);

  const worstColor =
      counts.total === 0 ? colors.textSecondary
    : counts.danger > 0  ? colors.danger
    : counts.attention > 0 ? colors.warn
    : colors.ok;

  // Sky mood + legible overlay color. An empty farm gets a cheerful sky, not fog.
  const skyKey = counts.danger > 0 ? 'danger'
    : counts.attention > 0 ? 'warn'
    : 'ok';
  const darkSky = hour < 5 || hour >= 20 || counts.danger > 0;
  const onSky = darkSky ? '#ffffff' : '#33271d';

  const cardW = Dimensions.get('window').width - 32;

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

  const sep = language === 'ar' ? '، ' : ', ';
  const greeting = `${t(greet.key) || 'Hello'}${farmerName ? sep + farmerName : ''}`;

  // Plain-language status the farmer instantly understands. Kept SEPARATE from
  // the insight (which has its own row) so it never truncates to a confusing "…".
  let sentence;
  if (counts.total === 0) sentence = t('healthNoDataBody') || 'Add a coop to start.';
  else if (counts.danger === 1) sentence = t('farmDanger1') || 'Danger in 1 coop';
  else if (counts.danger > 1) sentence = (t('farmDangerN') || 'Danger in {n} coops').replace('{n}', counts.danger);
  else if (counts.attention === 1) sentence = t('farmAttention1') || '1 coop needs attention';
  else if (counts.attention > 1) sentence = (t('farmAttentionN') || '{n} coops need attention').replace('{n}', counts.attention);
  else sentence = t('farmAllOk') || 'All your coops are fine';

  return (
    <>
    <View style={[styles.card, shadows.md]}>
      {/* ── Living sky hero (scene + greeting + add) ── */}
      <View style={styles.sky}>
        <LivingSky statusKey={skyKey} hour={hour} height={SKY_H} width={cardW} />
        <View style={styles.skyOverlay} pointerEvents="box-none">
          <Text style={[styles.greeting, { color: onSky }]} numberOfLines={1}>
            {greeting}
          </Text>
          <View style={styles.heroActions}>
            {onAddCoop ? (
              <Pressable
                onPress={onAddCoop}
                android_ripple={{ color: '#ffffff44' }}
                accessibilityRole="button"
                accessibilityLabel={t('addCoop')}
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.addPlus}>＋</Text>
                <Text style={styles.addText}>{t('addCoop')}</Text>
              </Pressable>
            ) : null}
            {helpButton || null}
          </View>
        </View>
      </View>

      {/* ── Body: status ring + sentence + tasks, then smart guidance ── */}
      <View style={styles.body}>
        <View style={styles.statusRow}>
          <HealthScore counts={counts} size={46} strokeWidth={6} />
          <Text style={[styles.status, { color: worstColor }]} numberOfLines={2}>
            {sentence}
          </Text>
          {hasDevices ? (
            <Pressable
              onPress={() => setTasksOpen(true)}
              android_ripple={{ color: (allDone ? colors.ok : colors.accent) + '22' }}
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
                size={15}
                color={allDone ? colors.ok : colors.accent}
                strokeWidth={2.5}
              />
              <Text style={[styles.tasksTxt, { color: allDone ? colors.ok : colors.accent }]}>
                {doneCount}/{DAILY_TASKS.length}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Smart guidance — each insight is a full-width tappable row; a big
            full-width button reveals the rest (no tiny tap targets). */}
        {topInsight ? (
          <View style={styles.insSection}>
            {(insExpanded ? sortedInsights : [topInsight]).map((ins, i) => (
              <Pressable
                key={ins.id}
                onPress={() => onOpenInsight && onOpenInsight(ins)}
                android_ripple={{ color: colors.accent + '14' }}
                accessibilityRole="button"
                accessibilityLabel={ins.title}
                style={({ pressed }) => [
                  styles.insItem,
                  i > 0 && { marginTop: 6 },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={[
                  styles.insDot,
                  { backgroundColor: colors[SEV_COLOR[ins.severity]] || colors.accent },
                ]} />
                <Text style={styles.insItemText} numberOfLines={2}>{ins.title}</Text>
                <Icon name="chevronRight" size={17} color={colors.textTertiary} strokeWidth={2.4} />
              </Pressable>
            ))}

            {moreCount > 0 ? (
              <Pressable
                onPress={() => setInsExpanded((v) => !v)}
                android_ripple={{ color: colors.accent + '18' }}
                accessibilityRole="button"
                accessibilityLabel={insExpanded ? (t('insightsShowLess') || 'Show less') : (t('insightsShowAll') || 'Show all')}
                style={({ pressed }) => [styles.showAllBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.showAllText}>
                  {insExpanded
                    ? (t('insightsShowLess') || 'Show less')
                    : `${t('insightsShowAll') || 'Show all'} (${moreCount})`}
                </Text>
                <Icon
                  name={insExpanded ? 'chevronUp' : 'chevronDown'}
                  size={16}
                  color={colors.accent}
                  strokeWidth={2.6}
                />
              </Pressable>
            ) : null}

            {insExpanded && onSeeAllInsights ? (
              <Pressable
                onPress={onSeeAllInsights}
                android_ripple={{ color: colors.accent + '14' }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.seeAll, pressed && { opacity: 0.8 }]}
              >
                <Icon name="target" size={14} color={colors.accent} strokeWidth={2.5} />
                <Text style={styles.seeAllText}>{t('smartInsights') || 'Insights'}</Text>
                <Icon name="chevronRight" size={14} color={colors.accent} strokeWidth={2.6} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
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
    marginTop: 8,
    marginBottom: 14,
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  // Sky hero
  sky: { height: SKY_H, width: '100%' },
  skyOverlay: {
    ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    paddingHorizontal: 14,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  greeting: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginTop: 4,
    textShadowColor: '#0000002e',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingStart: 11,
    paddingEnd: 13,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  addPlus: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: -2 },
  addText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Body
  body: { paddingHorizontal: 14, paddingVertical: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  status: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginTop: 12,
  },
  tasksBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: colors.bgElevated,
  },
  tasksTxt: { fontSize: 13, fontWeight: '800' },

  // Smart guidance — full-width rows + a big show-all button
  insSection: { marginTop: 12 },
  insDot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  insItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.cardElevated,
  },
  insItemText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 18,
  },
  showAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    backgroundColor: colors.accent + '0e',
  },
  showAllText: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 8,
  },
  seeAllText: { color: colors.accent, fontSize: 13, fontWeight: '800' },
});
