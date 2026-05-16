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

  const tasksRemaining = DAILY_TASKS.length - doneCount;

  return (
    <View style={[styles.card, shadows.md]}>
      {/* Header row: greeting + date + help */}
      <View style={styles.headerRow}>
        <View style={styles.greetCol}>
          <View style={styles.greetLine}>
            <Icon name={greet.icon} size={16} color={tier.color} strokeWidth={2.2} />
            <Text style={styles.greeting} numberOfLines={1}>
              {t(greet.key) || 'Hello'}{farmerName ? `, ${farmerName}` : ''}
            </Text>
          </View>
          <Text style={styles.dateText}>{dateLabel}{farmName ? ` • ${farmName}` : ''}</Text>
        </View>
        {onPressHelp ? (
          <Pressable
            onPress={onPressHelp}
            hitSlop={10}
            android_ripple={{ color: colors.accent + '33', borderless: true, radius: 20 }}
            style={styles.helpBtn}
          >
            <Icon name="info" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {/* Body: health score + status */}
      <View style={styles.body}>
        <HealthScore score={score} t={t} size={88} strokeWidth={9} />
        <View style={styles.bodyRight}>
          <Text style={styles.scoreLabel}>{t('farmHealth') || 'Farm health'}</Text>
          <Text style={[styles.scoreTier, { color: tier.color }]}>
            {t(`tier_${tier.label}`) || tier.label.toUpperCase()}
          </Text>
          {score != null ? (
            <Text style={styles.scoreHint} numberOfLines={2}>
              {score >= 90 ? (t('healthExcellentBody') || 'Everything is running well.') :
               score >= 70 ? (t('healthGoodBody') || 'Watch a few coops; keep up the daily checks.') :
               score >= 50 ? (t('healthFairBody') || 'Several coops need attention. Open the danger list.') :
                             (t('healthPoorBody') || 'Critical. Check the dashboard NOW.')}
            </Text>
          ) : (
            <Text style={styles.scoreHint} numberOfLines={2}>
              {t('healthNoDataBody') || 'Add a coop to start monitoring.'}
            </Text>
          )}
        </View>
      </View>

      {/* Tasks chip */}
      {devices && devices.length > 0 ? (
        <Pressable
          onPress={onPressTasks}
          android_ripple={{ color: colors.accent + '22' }}
          style={[styles.tasksChip, tasksRemaining === 0 && {
            backgroundColor: colors.ok + '14', borderColor: colors.ok + '50',
          }]}
        >
          <Icon
            name={tasksRemaining === 0 ? 'checkCircle' : 'clock'}
            size={16}
            color={tasksRemaining === 0 ? colors.ok : colors.accent}
          />
          <Text style={styles.tasksText}>
            {tasksRemaining === 0
              ? (t('allTasksDone') || 'All today\'s tasks done — great job')
              : `${doneCount}/${DAILY_TASKS.length} ${t('tasksDoneToday') || 'daily tasks done'}`}
          </Text>
          <Icon name="chevronRight" size={14} color={colors.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = () => ({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  greetCol: { flex: 1 },
  greetLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greeting: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.1,
    flex: 1,
  },
  dateText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  helpBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  bodyRight: { flex: 1 },
  scoreLabel: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  scoreTier: {
    fontSize: 19,
    fontWeight: '900',
    marginTop: 3,
    letterSpacing: 0.4,
  },
  scoreHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  tasksChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tasksText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
