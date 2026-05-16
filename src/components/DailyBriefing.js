import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, shadows } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import Icon from './Icon';
import HealthScore from './HealthScore';
import { computeFarmHealth, healthTier } from '../utils/farmHealth';
import { DAILY_TASKS } from '../utils/guideContent';

const DAILY_KEY = '@filaha:dailyTasksDone';

function timeOfDay(hour) {
  if (hour < 5)  return { icon: 'moon', key: 'greetNight' };
  if (hour < 12) return { icon: 'sun',  key: 'greetMorning' };
  if (hour < 17) return { icon: 'sun',  key: 'greetAfternoon' };
  if (hour < 21) return { icon: 'sun',  key: 'greetEvening' };
  return { icon: 'moon', key: 'greetNight' };
}

function todayLabel(now, language) {
  const d = new Date(now);
  const dayNames = {
    ar: ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],
    en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    fr: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
  };
  const monthNames = {
    ar: ['جانفي','فيفري','مارس','أفريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
    en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    fr: ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'],
  };
  const days = dayNames[language] || dayNames.en;
  const months = monthNames[language] || monthNames.en;
  return `${days[d.getDay()]} • ${d.getDate()} ${months[d.getMonth()]}`;
}

export default function DailyBriefing({
  t, language, settings, devices, readings, thresholds, powerCut, now,
  onPressTasks, onPressHelp,
}) {
  const styles = useStyles(makeStyles);
  const [doneCount, setDoneCount] = useState(0);

  const greet = timeOfDay(new Date(now).getHours());
  const farmerName = (settings?.farmerName || '').trim();
  const farmName = (settings?.farmName || '').trim();
  const dateLabel = todayLabel(now, language);

  const score = useMemo(() =>
    computeFarmHealth(devices, readings, thresholds, powerCut, now),
  [devices, readings, thresholds, powerCut, now]);
  const tier = healthTier(score, colors);

  useEffect(() => {
    const todayKey = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    })();
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DAILY_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed.date === todayKey) {
          setDoneCount(Object.values(parsed.ids || {}).filter(Boolean).length);
        }
      } catch (e) {}
    })();
  }, [now]);

  const hasDevices = !!devices && devices.length > 0;
  const tasksRemaining = DAILY_TASKS.length - doneCount;
  const allDone = tasksRemaining <= 0;

  const hint = score == null
    ? (t('healthNoDataBody') || 'Add a coop to start monitoring.')
    : score >= 90 ? (t('healthExcellentBody') || 'Everything is running well.')
    : score >= 70 ? (t('healthGoodBody') || 'Watch a few coops; keep up the daily checks.')
    : score >= 50 ? (t('healthFairBody') || 'Several coops need attention.')
    :               (t('healthPoorBody') || 'Critical. Check the dashboard now.');

  return (
    <View style={[styles.card, shadows.md]}>
      {/* Header: greeting + date */}
      <View style={styles.headerRow}>
        <View style={styles.greetCol}>
          <View style={styles.greetLine}>
            <Icon name={greet.icon} size={18} color={tier.color} strokeWidth={2.4} />
            <Text style={styles.greeting} numberOfLines={1}>
              {t(greet.key) || 'Hello'}{farmerName ? `، ${farmerName}` : ''}
            </Text>
          </View>
          <Text style={styles.dateText} numberOfLines={1}>
            {dateLabel}{farmName ? `  •  ${farmName}` : ''}
          </Text>
        </View>
        {onPressHelp ? (
          <Pressable
            onPress={onPressHelp}
            hitSlop={12}
            android_ripple={{ color: colors.accent + '33', borderless: true, radius: 22 }}
            style={styles.helpBtn}
            accessibilityRole="button"
          >
            <Icon name="info" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {/* Body: health ring + status */}
      <View style={styles.body}>
        <HealthScore score={score} t={t} size={92} strokeWidth={9} />
        <View style={styles.bodyRight}>
          <Text style={styles.scoreLabel}>{t('farmHealth') || 'Farm health'}</Text>
          <Text style={[styles.scoreTier, { color: tier.color }]} numberOfLines={1}>
            {t(`tier_${tier.label}`) || tier.label}
          </Text>
          <Text style={styles.scoreHint} numberOfLines={3}>{hint}</Text>
        </View>
      </View>

      {/* Tasks row */}
      {hasDevices ? (
        <Pressable
          onPress={onPressTasks}
          android_ripple={{ color: (allDone ? colors.ok : colors.accent) + '22' }}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.tasksRow,
            allDone && styles.tasksRowDone,
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={[
            styles.tasksIcon,
            { backgroundColor: (allDone ? colors.ok : colors.accent) + '1f' },
          ]}>
            <Icon
              name={allDone ? 'checkCircle' : 'clock'}
              size={18}
              color={allDone ? colors.ok : colors.accent}
              strokeWidth={2.4}
            />
          </View>
          <View style={styles.tasksTextCol}>
            <Text style={styles.tasksTitle} numberOfLines={1}>
              {allDone
                ? (t('allTasksDone') || "All today's tasks done — great job")
                : (t('tasksDoneToday') || 'Daily tasks')}
            </Text>
            {!allDone ? (
              <Text style={styles.tasksProgress} numberOfLines={1}>
                {doneCount}/{DAILY_TASKS.length}
              </Text>
            ) : null}
          </View>
          <Icon name="chevronRight" size={18} color={colors.textTertiary} strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = () => ({
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  greetCol: { flex: 1 },
  greetLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greeting: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
  },
  dateText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 5,
  },
  helpBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 16,
  },
  bodyRight: { flex: 1 },
  scoreLabel: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '800',
  },
  scoreTier: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  scoreHint: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },

  tasksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tasksRowDone: {
    backgroundColor: colors.ok + '12',
    borderColor: colors.ok + '50',
  },
  tasksIcon: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  tasksTextCol: { flex: 1 },
  tasksTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  tasksProgress: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});
