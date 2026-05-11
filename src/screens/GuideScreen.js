import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, StatusBar,
  Modal, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { colors, shadows } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import { DAILY_TASKS, AGE_PHASES, TOPICS } from '../utils/guideContent';
import Icon from '../components/Icon';
import { showToast } from '../components/Toast';
import { BrooderCalc, DensityCalc, ProfitCalc, VaccineSchedule } from '../components/Calculators';
import {
  GrowthCurveViewer, DiseaseWatchlist, MarketPrices, FeedPhaseTable,
} from '../components/GuideExtras';
import {
  showAlertNotification,
  scheduleDailyReminder,
  cancelDailyReminder,
} from '../services/SmsService';

const DAILY_KEY = '@filaha:dailyTasksDone';
const REMINDERS_KEY = '@filaha:dailyRemindersEnabled';

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function pickLang(obj, lang) {
  if (!obj) return '';
  return obj[lang] || obj.en || obj.fr || obj.ar || '';
}

export default function GuideScreen() {
  const { t, language } = useApp();
  const styles = useStyles(makeStyles);
  const [doneIds, setDoneIds] = useState({});
  const [remindersOn, setRemindersOn] = useState(false);
  const [activeTopic, setActiveTopic] = useState(null);
  const [activePhase, setActivePhase] = useState(null);

  useEffect(() => {
    (async () => {
      const today = getTodayKey();
      const stored = await AsyncStorage.getItem(DAILY_KEY);
      const reminders = await AsyncStorage.getItem(REMINDERS_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.date === today) setDoneIds(parsed.ids || {});
        } catch (e) {}
      }
      setRemindersOn(reminders === '1');
    })();
  }, []);

  const completedCount = useMemo(() =>
    DAILY_TASKS.filter((x) => doneIds[x.id]).length,
  [doneIds]);

  const toggleTask = async (id) => {
    const next = { ...doneIds, [id]: !doneIds[id] };
    setDoneIds(next);
    await AsyncStorage.setItem(DAILY_KEY, JSON.stringify({ date: getTodayKey(), ids: next }));
  };

  const toggleReminders = async () => {
    const next = !remindersOn;
    setRemindersOn(next);
    await AsyncStorage.setItem(REMINDERS_KEY, next ? '1' : '0');

    if (next) {
      // Schedule two daily AlarmManager reminders: 07:00 (morning check) and 19:00 (evening)
      await scheduleDailyReminder({
        hour: 7, minute: 0,
        title: t('morningReminderTitle'),
        body: t('morningReminderBody'),
        reqCode: 1,
      });
      await scheduleDailyReminder({
        hour: 19, minute: 0,
        title: t('eveningReminderTitle'),
        body: t('eveningReminderBody'),
        reqCode: 2,
      });
      showToast(t('remindersEnabled'), 'success');
    } else {
      await cancelDailyReminder(1);
      await cancelDailyReminder(2);
      showToast(t('remindersDisabled'), 'info');
    }
  };

  const progressPct = (completedCount / DAILY_TASKS.length) * 100;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Icon name="book" size={28} color={colors.accent} strokeWidth={2.2} />
          </View>
          <Text style={styles.title}>{t('guideTitle')}</Text>
          <Text style={styles.subtitle}>{t('guideIntro')}</Text>
        </View>

        {/* ── Daily checklist ── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionHeadLeft}>
              <Icon name="checkCircle" size={18} color={colors.ok} />
              <Text style={styles.sectionTitle}>{t('dailyChecklist')}</Text>
            </View>
            <Text style={styles.progressText}>{completedCount}/{DAILY_TASKS.length}</Text>
          </View>
          <Text style={styles.sectionHint}>{t('dailyChecklistHint')}</Text>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>

          {DAILY_TASKS.map((task) => {
            const done = !!doneIds[task.id];
            return (
              <Pressable
                key={task.id}
                onPress={() => toggleTask(task.id)}
                android_ripple={{ color: colors.accent + '22' }}
                style={[styles.taskRow, done && styles.taskRowDone]}
              >
                <View style={[styles.taskIconBox, done && styles.taskIconBoxDone]}>
                  <Icon
                    name={done ? 'check' : task.icon}
                    size={18}
                    color={done ? '#fff' : colors.accentSoft}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, done && styles.taskTitleDone]}>
                    {pickLang(task.title, language)}
                  </Text>
                  <Text style={styles.taskDetail} numberOfLines={done ? 1 : 3}>
                    {pickLang(task.detail, language)}
                  </Text>
                </View>
                <View style={[styles.checkBox, done && styles.checkBoxOn]}>
                  {done ? <Icon name="check" size={14} color="#fff" /> : null}
                </View>
              </Pressable>
            );
          })}

          {/* Reminders toggle */}
          <Pressable
            onPress={toggleReminders}
            android_ripple={{ color: colors.accent + '22' }}
            style={styles.reminderRow}
          >
            <Icon name="bellRing" size={20} color={remindersOn ? colors.ok : colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.reminderTitle}>{t('dailyReminders')}</Text>
              <Text style={styles.reminderHint}>{t('remindMe')}</Text>
            </View>
            <View style={[styles.toggle, remindersOn && styles.toggleOn]}>
              <View style={[styles.toggleKnob, remindersOn && styles.toggleKnobOn]} />
            </View>
          </Pressable>
        </View>

        {/* ── Age phases ── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionHeadLeft}>
              <Icon name="clock" size={18} color={colors.accent} />
              <Text style={styles.sectionTitle}>{t('ageBased')}</Text>
            </View>
          </View>
          <Text style={styles.sectionHint}>{t('ageBasedHint')}</Text>

          <View style={styles.phaseRow}>
            {AGE_PHASES.map((phase) => (
              <Pressable
                key={phase.id}
                onPress={() => setActivePhase(phase)}
                android_ripple={{ color: phase.color + '33' }}
                style={[styles.phaseCard, { borderColor: phase.color + '60' }]}
              >
                <View style={[styles.phaseDot, { backgroundColor: phase.color }]} />
                <Text style={styles.phaseRange}>{pickLang(phase.range, language)}</Text>
                <Text style={styles.phaseTitle} numberOfLines={2}>
                  {pickLang(phase.title, language)}
                </Text>
                <Text style={[styles.phaseTemp, { color: phase.color }]}>
                  {phase.targetTemp}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Interactive calculators ── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionHeadLeft}>
              <Icon name="target" size={18} color={colors.accent} />
              <Text style={styles.sectionTitle}>{t('calculators')}</Text>
            </View>
          </View>

          <CalculatorCard
            title={t('brooderCalc')}
            hint={t('brooderCalcHint')}
            icon="thermometer"
            iconColor={colors.temp}
            t={t}
            Component={BrooderCalc}
          />
          <CalculatorCard
            title={t('densityCalc')}
            hint={t('densityCalcHint')}
            icon="home"
            iconColor={colors.accent}
            t={t}
            Component={DensityCalc}
          />
          <CalculatorCard
            title={t('profitCalc')}
            hint={t('profitCalcHint')}
            icon="target"
            iconColor={colors.ok}
            t={t}
            Component={ProfitCalc}
          />
          <CalculatorCard
            title={t('vaccineCalc')}
            hint={t('vaccineCalcHint')}
            icon="shield"
            iconColor={colors.warn}
            t={t}
            Component={VaccineSchedule}
          />
          <CalculatorCard
            title={t('growthCurve')}
            hint={t('growthCurveHint')}
            icon="activity"
            iconColor={colors.accentSoft}
            t={t}
            Component={(props) => <GrowthCurveViewer {...props} />}
          />
        </View>

        {/* ── Algerian disease watchlist ── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionHeadLeft}>
              <Icon name="alertTriangle" size={18} color={colors.danger} />
              <Text style={styles.sectionTitle}>{t('diseaseAlgeria')}</Text>
            </View>
          </View>
          <Text style={styles.sectionHint}>
            10 diseases with Algerian field protocols • {t('basedOn')} ITELV + Ceva + 2024 academic literature
          </Text>
          <DiseaseWatchlist t={t} language={language} />
        </View>

        {/* ── Market reference prices ── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionHeadLeft}>
              <Icon name="target" size={18} color={colors.ok} />
              <Text style={styles.sectionTitle}>{t('marketPrices')}</Text>
            </View>
          </View>
          <MarketPrices t={t} />
        </View>

        {/* ── Feed program (broiler) ── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionHeadLeft}>
              <Icon name="feather" size={18} color={colors.warn} />
              <Text style={styles.sectionTitle}>{t('feedPhases')}</Text>
            </View>
          </View>
          <Text style={styles.sectionHint}>
            ITELV standard, Cobb/Ross-compatible — 3-phase broiler program
          </Text>
          <FeedPhaseTable t={t} breed="broiler" />
        </View>

        {/* ── Topics list ── */}
        <View style={[styles.section, { marginBottom: 0 }]}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionHeadLeft}>
              <Icon name="book" size={18} color={colors.accent} />
              <Text style={styles.sectionTitle}>{t('topicTemperature').split('—')[0].split('&')[0].trim()}</Text>
            </View>
          </View>
          <Text style={styles.sectionHint}>{t('guideIntro')}</Text>

          {TOPICS.map((topic) => (
            <Pressable
              key={topic.id}
              onPress={() => setActiveTopic(topic)}
              android_ripple={{ color: topic.color + '22' }}
              style={styles.topicCard}
            >
              <View style={[styles.topicIconBox, { backgroundColor: topic.color + '1d', borderColor: topic.color + '40' }]}>
                <Icon name={topic.icon} size={22} color={topic.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.topicTitle}>{t(topic.titleKey)}</Text>
                <Text style={styles.topicSummary} numberOfLines={2}>
                  {pickLang(topic.summary, language)}
                </Text>
              </View>
              <Icon name="chevronRight" size={18} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* ── Topic modal ── */}
      <TopicModal
        topic={activeTopic}
        language={language}
        onClose={() => setActiveTopic(null)}
        t={t}
      />

      {/* ── Phase modal ── */}
      <PhaseModal
        phase={activePhase}
        language={language}
        onClose={() => setActivePhase(null)}
        t={t}
      />
    </SafeAreaView>
  );
}

function CalculatorCard({ title, hint, icon, iconColor, Component, t }) {
  const styles = useStyles(makeStyles);
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.calcCard}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        android_ripple={{ color: iconColor + '22' }}
        style={styles.calcHead}
      >
        <View style={[styles.calcIconBox, { backgroundColor: iconColor + '1d', borderColor: iconColor + '40' }]}>
          <Icon name={icon} size={20} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.calcTitle}>{title}</Text>
          <Text style={styles.calcHint} numberOfLines={1}>{hint}</Text>
        </View>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={18} color={colors.textTertiary} />
      </Pressable>
      {open ? <View style={styles.calcBody}><Component t={t} /></View> : null}
    </View>
  );
}

function TopicModal({ topic, language, onClose, t }) {
  const modalStyles = useStyles(makeModalStyles);
  if (!topic) return null;
  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.card}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.head}>
            <View style={[modalStyles.headIcon, { backgroundColor: topic.color + '22' }]}>
              <Icon name={topic.icon} size={22} color={topic.color} />
            </View>
            <Text style={modalStyles.headTitle}>{t(topic.titleKey)}</Text>
            <Pressable onPress={onClose} style={modalStyles.closeBtn}>
              <Icon name="x" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
            <Text style={modalStyles.summary}>
              {pickLang(topic.summary, language)}
            </Text>
            {(topic.sections[language] || topic.sections.en).map((s, i) => (
              <View key={i} style={modalStyles.sectionBlock}>
                <Text style={modalStyles.sectionH}>{s.h}</Text>
                <Text style={modalStyles.sectionB}>{s.b}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PhaseModal({ phase, language, onClose, t }) {
  const modalStyles = useStyles(makeModalStyles);
  if (!phase) return null;
  const points = phase.keyPoints[language] || phase.keyPoints.en;
  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.card}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.head}>
            <View style={[modalStyles.headIcon, { backgroundColor: phase.color + '22' }]}>
              <Icon name="clock" size={20} color={phase.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.headTitle}>{pickLang(phase.title, language)}</Text>
              <Text style={[modalStyles.headSub, { color: phase.color }]}>
                {pickLang(phase.range, language)} • {phase.targetTemp}
              </Text>
            </View>
            <Pressable onPress={onClose} style={modalStyles.closeBtn}>
              <Icon name="x" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
            {points.map((p, i) => (
              <View key={i} style={modalStyles.point}>
                <View style={[modalStyles.pointDot, { backgroundColor: phase.color }]} />
                <Text style={modalStyles.pointText}>{p}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = () => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerIcon: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: colors.accent + '15',
    borderWidth: 1, borderColor: colors.accent + '40',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26, fontWeight: '900',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
    lineHeight: 21,
  },

  section: {
    marginHorizontal: 16,
    marginBottom: 18,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadows.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionHeadLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  sectionHint: {
    color: colors.textTertiary,
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 17,
  },
  progressText: {
    color: colors.ok,
    fontSize: 13,
    fontWeight: '800',
  },
  progressBar: {
    height: 5,
    backgroundColor: colors.bgElevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.ok,
    borderRadius: 3,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  taskRowDone: {
    opacity: 0.7,
    borderColor: colors.ok + '40',
    backgroundColor: colors.ok + '08',
  },
  taskIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.accent + '1a',
    borderWidth: 1, borderColor: colors.accent + '30',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  taskIconBoxDone: {
    backgroundColor: colors.ok,
    borderColor: colors.ok,
  },
  taskTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },
  taskTitleDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  taskDetail: {
    color: colors.textTertiary,
    fontSize: 12,
    lineHeight: 17,
  },
  checkBox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 5,
  },
  checkBoxOn: {
    backgroundColor: colors.ok,
    borderColor: colors.ok,
  },

  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  reminderTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  reminderHint: {
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  toggle: {
    width: 42, height: 24, borderRadius: 12,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: colors.ok },
  toggleKnob: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleKnobOn: { transform: [{ translateX: 18 }] },

  phaseRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phaseCard: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  phaseDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  phaseRange: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  phaseTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  phaseTemp: {
    fontSize: 13,
    fontWeight: '900',
  },

  calcCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    overflow: 'hidden',
  },
  calcHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  calcIconBox: {
    width: 40, height: 40, borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  calcTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  calcHint: {
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 3,
  },
  calcBody: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  topicIconBox: {
    width: 42, height: 42, borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  topicTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  topicSummary: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
});

const makeModalStyles = () => ({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000cc',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 42, height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    marginBottom: 16,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 14,
  },
  headIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  headTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900',
  },
  headSub: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  summary: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionH: {
    color: colors.accentSoft,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  sectionB: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
  point: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  pointDot: {
    width: 6, height: 6, borderRadius: 3, marginTop: 8,
  },
  pointText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
});
