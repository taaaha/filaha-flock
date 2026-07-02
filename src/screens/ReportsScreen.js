import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { colors, useTheme, barStyle } from '../utils/colors';
import Icon from '../components/Icon';
import CoopMascot from '../components/CoopMascot';
import { generateReport } from '../services/Reports';

const T = {
  title:   { ar: 'تقارير الإنتاج', fr: 'Rapports d’élevage', en: 'Flock reports' },
  daily:   { ar: 'اليوم', fr: 'Jour', en: 'Day' },
  weekly:  { ar: 'الأسبوع', fr: 'Semaine', en: 'Week' },
  monthly: { ar: 'الشهر', fr: 'Mois', en: 'Month' },
  ageDay:  { ar: 'اليوم', fr: 'Jour', en: 'Day' },
  score:   { ar: 'جودة الأجواء', fr: 'Qualité d’ambiance', en: 'Climate quality' },
  basedOn: { ar: 'قياس خلال الفترة', fr: 'mesures sur la période', en: 'readings this period' },
  happened:{ ar: 'ماذا حدث', fr: 'Ce qui s’est passé', en: 'What happened' },
  doNext:  { ar: 'ماذا تفعل', fr: 'Quoi faire', en: 'What to do' },
  growth:  { ar: 'مرجع النمو', fr: 'Repère de croissance', en: 'Growth reference' },
  growthTxt: {
    ar: 'حسب دليل السلالة {strain}: الوزن المستهدف في هذا العمر ≈ {w} غ (زن عينة من الطيور للمقارنة).',
    fr: 'Selon le guide de la souche {strain} : poids cible à cet âge ≈ {w} g (pesez un échantillon pour comparer).',
    en: 'Per the {strain} strain guide: target weight at this age ≈ {w} g (weigh a sample to compare).',
  },
  fcrTxt: {
    ar: 'معامل التحويل المستهدف ≈ {f}.',
    fr: 'Indice de consommation cible ≈ {f}.',
    en: 'Target feed conversion ≈ {f}.',
  },
  avg:     { ar: 'المعدل', fr: 'Moyenne', en: 'Average' },
  range:   { ar: 'المدى', fr: 'Plage', en: 'Range' },
  target:  { ar: 'الهدف', fr: 'Cible', en: 'Target' },
  maxSafe: { ar: 'الحد الأقصى', fr: 'Limite max', en: 'Max safe' },
  inRange: { ar: 'من الوقت ضمن الحد', fr: 'du temps dans la norme', en: 'of time in range' },
  empty:   {
    ar: 'لا توجد بيانات كافية لهذه الفترة بعد. اترك الجهاز يعمل وعد لاحقًا.',
    fr: 'Pas encore assez de données pour cette période. Laissez le boîtier tourner et revenez plus tard.',
    en: 'Not enough data for this period yet. Let the device run and come back later.',
  },
  noCoops: {
    ar: 'أضف حظيرة أولًا لتحصل على تقاريرها.',
    fr: 'Ajoutez d’abord un poulailler pour obtenir ses rapports.',
    en: 'Add a coop first to get its reports.',
  },
  sources: {
    ar: 'الأهداف من دليل تربية السلالات وبيانات ITELV الجزائرية — والقياسات كلها من جهازك.',
    fr: 'Cibles issues des guides de souches et des données ITELV (Algérie) — toutes les mesures viennent de votre boîtier.',
    en: 'Targets come from strain management guides and Algerian ITELV data — every measurement is from your device.',
  },
};
const W = (o, l) => (o && (o[l] || o.en)) || '';

export default function ReportsScreen({ navigation }) {
  useTheme();
  const { language, devices, thresholds, alerts, readings } = useApp();
  const lang = ['ar', 'fr', 'en'].includes(language) ? language : 'ar';
  const styles = makeStyles();

  const [coopId, setCoopId] = useState(devices[0]?.id || null);
  const [period, setPeriod] = useState('daily');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const device = devices.find((d) => d.id === coopId) || devices[0];

  const load = useCallback(async () => {
    if (!device) return;
    setLoading(true);
    try {
      const rep = await generateReport({
        device, period, language: lang, thresholds, alerts,
        localReadings: readings[device.id] || [],
      });
      setReport(rep);
    } catch (e) {
      setReport({ empty: true, period });
    } finally {
      setLoading(false);
    }
  }, [device, period, lang, thresholds, alerts, readings]);

  useEffect(() => { load(); }, [load]);

  const scoreColor = report && report.score != null
    ? (report.score >= 80 ? colors.ok : report.score >= 55 ? colors.warn : colors.danger)
    : colors.textTertiary;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <StatusBar barStyle={barStyle()} backgroundColor={colors.bg} />

      <View style={styles.header}>
        <Pressable onPress={() => navigation?.goBack?.()} hitSlop={12}>
          <Icon name="arrowLeft" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{W(T.title, lang)}</Text>
        <View style={{ width: 24 }} />
      </View>

      {devices.length === 0 ? (
        <View style={styles.emptyWrap}>
          <CoopMascot status="sleepy" size={84} />
          <Text style={styles.emptyText}>{W(T.noCoops, lang)}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Coop selector */}
          {devices.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coopRow}>
              {devices.map((d) => (
                <Pressable key={d.id} onPress={() => setCoopId(d.id)}
                  android_ripple={{ color: colors.accent + '22' }}
                  style={[styles.coopChip, d.id === device?.id && styles.coopChipActive]}>
                  <Text style={[styles.coopChipTxt, d.id === device?.id && { color: '#fffdf7' }]} numberOfLines={1}>
                    {d.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {/* Period tabs */}
          <View style={styles.tabs}>
            {['daily', 'weekly', 'monthly'].map((p) => (
              <Pressable key={p} onPress={() => setPeriod(p)}
                android_ripple={{ color: colors.accent + '22' }}
                style={[styles.tab, period === p && styles.tabActive]}>
                <Text style={[styles.tabTxt, period === p && { color: '#fffdf7' }]}>
                  {W(T[p], lang)}
                </Text>
              </Pressable>
            ))}
          </View>

          {loading ? (
            <View style={styles.loadingWrap}><ActivityIndicator color={colors.accent} size="large" /></View>
          ) : !report || report.empty ? (
            <View style={styles.emptyWrap}>
              <CoopMascot status="sleepy" size={84} />
              <Text style={styles.emptyText}>{W(T.empty, lang)}</Text>
            </View>
          ) : (
            <>
              {/* Hero: coop + age + score */}
              <View style={styles.hero}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroName} numberOfLines={1}>{report.deviceName}</Text>
                  {report.ageDays != null ? (
                    <Text style={styles.heroMeta}>
                      {W(T.ageDay, lang)} {report.ageDays}
                      {report.strainName ? `  ·  ${report.strainName}` : ''}
                    </Text>
                  ) : null}
                  <Text style={styles.heroSamples}>
                    {report.samples} {W(T.basedOn, lang)}
                  </Text>
                </View>
                <View style={[styles.scoreRing, { borderColor: scoreColor }]}>
                  <Text style={[styles.scoreNum, { color: scoreColor }]}>
                    {report.score != null ? report.score : '—'}
                  </Text>
                  <Text style={styles.scorePct}>%</Text>
                </View>
              </View>
              <Text style={styles.scoreCaption}>{W(T.score, lang)}</Text>

              {/* Metric cards */}
              <View style={styles.metricGrid}>
                {report.metrics.map((m) => {
                  const c = m.verdict === 'good' ? colors.ok : m.verdict === 'mixed' ? colors.warn
                    : (m.key === 'temp' && m.verdict === 'low') ? colors.co2 : colors.danger;
                  return (
                    <View key={m.key} style={[styles.metricCard, { borderColor: c + '44' }]}>
                      <View style={styles.metricHead}>
                        <Text style={styles.metricLabel}>{m.label}</Text>
                        <View style={[styles.verdictPill, { backgroundColor: c + '18' }]}>
                          <Text style={[styles.verdictTxt, { color: c }]}>{m.verdictLabel}</Text>
                        </View>
                      </View>
                      <Text style={styles.metricAvg}>
                        {m.avg}<Text style={styles.metricUnit}> {m.unit}</Text>
                      </Text>
                      <Text style={styles.metricSub}>
                        {W(T.range, lang)}: {m.min}–{m.max}
                        {m.target != null ? `   ·   ${W(m.targetIsMax ? T.maxSafe : T.target, lang)}: ${m.target}` : ''}
                      </Text>
                      {m.inRange != null ? (
                        <View style={styles.rangeBarWrap}>
                          <View style={[styles.rangeBar, { width: `${m.inRange}%`, backgroundColor: c }]} />
                          <Text style={styles.rangeTxt}>{m.inRange}% {W(T.inRange, lang)}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>

              {/* What happened */}
              <Text style={styles.section}>{W(T.happened, lang)}</Text>
              <View style={styles.card}>
                {report.highlights.map((h, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletTxt}>{h}</Text>
                  </View>
                ))}
              </View>

              {/* What to do */}
              <Text style={styles.section}>{W(T.doNext, lang)}</Text>
              <View style={[styles.card, { borderColor: colors.accent + '55' }]}>
                {report.recommendations.map((r, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <View style={styles.recNum}><Text style={styles.recNumTxt}>{i + 1}</Text></View>
                    <Text style={styles.bulletTxt}>{r}</Text>
                  </View>
                ))}
              </View>

              {/* Growth reference */}
              {report.growth ? (
                <>
                  <Text style={styles.section}>{W(T.growth, lang)}</Text>
                  <View style={styles.card}>
                    <Text style={styles.bulletTxt}>
                      {W(T.growthTxt, lang)
                        .replace('{strain}', report.growth.strain)
                        .replace('{w}', String(report.growth.weightTarget))}
                      {report.growth.fcrTarget != null
                        ? ' ' + W(T.fcrTxt, lang).replace('{f}', String(report.growth.fcrTarget))
                        : ''}
                    </Text>
                  </View>
                </>
              ) : null}

              <Text style={styles.sources}>{W(T.sources, lang)}</Text>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function makeStyles() {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
    },
    title: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },

    coopRow: { gap: 8, paddingBottom: 12 },
    coopChip: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, maxWidth: 180,
    },
    coopChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    coopChipTxt: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },

    tabs: {
      flexDirection: 'row', backgroundColor: colors.bgElevated, borderRadius: 14,
      borderWidth: 1, borderColor: colors.border, padding: 4, marginBottom: 16,
    },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
    tabActive: { backgroundColor: colors.accent },
    tabTxt: { color: colors.textSecondary, fontSize: 13.5, fontWeight: '800' },

    loadingWrap: { paddingVertical: 60, alignItems: 'center' },
    emptyWrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 14 },
    emptyText: { color: colors.textSecondary, fontSize: 14.5, textAlign: 'center', lineHeight: 22 },

    hero: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border,
      padding: 16,
    },
    heroLeft: { flex: 1, minWidth: 0 },
    heroName: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' },
    heroMeta: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 3 },
    heroSamples: { color: colors.textTertiary, fontSize: 11.5, marginTop: 6 },
    scoreRing: {
      width: 76, height: 76, borderRadius: 38, borderWidth: 5,
      alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
      backgroundColor: colors.bgElevated,
    },
    scoreNum: { fontSize: 24, fontWeight: '800' },
    scorePct: { color: colors.textTertiary, fontSize: 11, fontWeight: '700', marginTop: 8 },
    scoreCaption: {
      color: colors.textTertiary, fontSize: 11.5, fontWeight: '700',
      textAlign: 'right', marginTop: 6, marginBottom: 14, marginEnd: 6,
    },

    metricGrid: { gap: 10, marginBottom: 6 },
    metricCard: {
      backgroundColor: colors.card, borderRadius: 16, borderWidth: 1.5, padding: 14,
    },
    metricHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    metricLabel: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '800', letterSpacing: 0.3 },
    verdictPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    verdictTxt: { fontSize: 11.5, fontWeight: '800' },
    metricAvg: { color: colors.textPrimary, fontSize: 26, fontWeight: '800', marginTop: 6 },
    metricUnit: { fontSize: 13, fontWeight: '600', color: colors.textTertiary },
    metricSub: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
    rangeBarWrap: {
      marginTop: 10, height: 18, backgroundColor: colors.bgElevated, borderRadius: 9,
      overflow: 'hidden', justifyContent: 'center',
    },
    rangeBar: { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.25 },
    rangeTxt: { color: colors.textSecondary, fontSize: 10.5, fontWeight: '700', marginStart: 8 },

    section: {
      color: colors.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 0.6,
      textTransform: 'uppercase', marginTop: 18, marginBottom: 8,
    },
    card: {
      backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
      padding: 14, gap: 10,
    },
    bulletRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
    bulletDot: { color: colors.accent, fontSize: 15, fontWeight: '800', lineHeight: 21 },
    bulletTxt: { flex: 1, color: colors.textPrimary, fontSize: 14, lineHeight: 21 },
    recNum: {
      width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent + '1c',
      alignItems: 'center', justifyContent: 'center', marginTop: 1,
    },
    recNumTxt: { color: colors.accent, fontSize: 11.5, fontWeight: '800' },

    sources: {
      color: colors.textTertiary, fontSize: 11, lineHeight: 16, textAlign: 'center',
      marginTop: 20, paddingHorizontal: 10,
    },
  });
}
