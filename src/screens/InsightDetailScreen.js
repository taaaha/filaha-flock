import React, { useMemo } from 'react';
import { View, Text, ScrollView, StatusBar, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { BrooderCalc, DensityCalc, VaccineSchedule } from '../components/Calculators';
import { useApp } from '../contexts/AppContext';
import { colors, statusColor } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import { TOPICS } from '../utils/guideContent';
import { sensorStatus } from '../utils/thresholds';
import { formatNumber } from '../utils/formatters';

const SEV = { danger: 'danger', warn: 'warn', info: 'accent', success: 'ok' };
const UNIT = { co2: 'ppm', nh3: 'ppm', temp: '°C', hum: '%' };
const DEC = { co2: 0, nh3: 1, temp: 1, hum: 0 };

function pickLang(obj, lang) {
  if (!obj) return '';
  return obj[lang] || obj.ar || obj.en || obj.fr || '';
}

export default function InsightDetailScreen({ route, navigation }) {
  const { t, language, devices, lastReadingFor, thresholds } = useApp();
  const styles = useStyles(makeStyles);
  const insight = route?.params?.insight || {};

  const tint = colors[SEV[insight.severity]] || colors.accent;
  const device = useMemo(
    () => devices.find((d) => d.id === insight.deviceId),
    [devices, insight.deviceId]
  );
  const reading = insight.deviceId ? lastReadingFor(insight.deviceId) : null;
  const topic = useMemo(
    () => TOPICS.find((tp) => tp.id === insight.topicId),
    [insight.topicId]
  );

  const sKey = insight.sensorKey;
  const sVal = sKey && reading ? reading[sKey] : null;
  const hasVal = sVal !== null && sVal !== undefined && !isNaN(sVal);
  const sStatus = hasVal ? sensorStatus(sKey, sVal, thresholds || {}) : null;

  const sections = topic ? pickLang(topic.sections, language) : [];

  return (
    <View style={styles.safe}>
      <StatusBar
        barStyle={colors.bg === '#070b14' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            android_ripple={{ color: colors.textTertiary + '33', borderless: true, radius: 22 }}
            style={styles.backBtn}
            accessibilityRole="button"
          >
            <Icon name="chevronLeft" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.topTitle} numberOfLines={1}>
            {t('insightDetailTitle') || 'Details'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* The issue */}
          <View style={[styles.card, { borderStartColor: tint, borderStartWidth: 4 }]}>
            <View style={styles.issueHead}>
              <View style={[styles.iconChip, { backgroundColor: tint + '1f' }]}>
                <Icon name={insight.icon || 'target'} size={22} color={tint} strokeWidth={2.4} />
              </View>
              <Text style={styles.issueTitle}>{insight.title}</Text>
            </View>
            <Text style={styles.issueBody}>{insight.body}</Text>
          </View>

          {/* The live data behind it */}
          {hasVal ? (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>{t('insightLiveData') || 'Live reading'}</Text>
              <View style={styles.dataRow}>
                <View style={[styles.dot, { backgroundColor: statusColor(sStatus) }]} />
                <Text style={styles.dataValue}>
                  {formatNumber(sVal, DEC[sKey] || 0)}
                  <Text style={styles.dataUnit}> {UNIT[sKey]}</Text>
                </Text>
                <Text style={[styles.dataStatus, { color: statusColor(sStatus) }]}>
                  {t(`status${sStatus ? sStatus.charAt(0).toUpperCase() + sStatus.slice(1) : ''}`) || ''}
                </Text>
              </View>
              {device ? (
                <Text style={styles.dataMeta}>{device.name} · {device.id}</Text>
              ) : null}
            </View>
          ) : null}

          {/* Related guidance from the research */}
          {sections && sections.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>{t('insightGuidance') || 'What to do'}</Text>
              {sections.map((s, i) => {
                const parts = String(s.b || '')
                  .split('•')
                  .map((x) => x.trim())
                  .filter(Boolean);
                const isList = parts.length > 1;
                return (
                  <View key={i} style={[styles.guideBlock, i > 0 && styles.guideBlockSep]}>
                    <Text style={styles.guideH}>{s.h}</Text>
                    {isList ? (
                      parts.map((line, j) => (
                        <View key={j} style={styles.bulletRow}>
                          <View style={[
                            styles.bulletDot,
                            { backgroundColor: (topic && topic.color) || colors.accent },
                          ]} />
                          <Text style={styles.bulletText}>{line}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.guideB}>{s.b}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Contextual tool */}
          {insight.tool ? (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>{t('insightTool') || 'Tool'}</Text>
              {insight.tool === 'brooder' ? (
                <BrooderCalc t={t} defaultBreed={device?.breed || 'broiler'} />
              ) : insight.tool === 'vaccine' ? (
                <VaccineSchedule
                  t={t}
                  language={language}
                  defaultBreed={device?.breed || 'broiler'}
                  chickArrivalDate={device?.chickArrivalDate || Date.now()}
                />
              ) : insight.tool === 'density' ? (
                <DensityCalc t={t} defaultBreed={device?.breed || 'broiler'} />
              ) : null}
            </View>
          ) : null}

          {/* Deep link to the full coop */}
          {insight.deviceId ? (
            <Pressable
              onPress={() => navigation.navigate('CoopDetail', { deviceId: insight.deviceId })}
              android_ripple={{ color: colors.accent + '22' }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.coopBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.coopBtnText}>
                {(t('openCoop') || 'Open coop')}{device ? ` · ${device.name}` : ''}
              </Text>
              <Icon name="chevronRight" size={18} color={colors.accent} strokeWidth={2.4} />
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = () => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  // chevronRight rotated 180° points back in LTR; in RTL it already points away.
  backIcon: { transform: [{ scaleX: -1 }] },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  issueHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconChip: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  issueTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
  },
  issueBody: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
  },

  sectionLabel: {
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  dot: { width: 9, height: 9, borderRadius: 5, alignSelf: 'center' },
  dataValue: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '700',
  },
  dataUnit: {
    color: colors.textTertiary,
    fontSize: 15,
    fontWeight: '600',
  },
  dataStatus: {
    fontSize: 14,
    fontWeight: '700',
  },
  dataMeta: {
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: 8,
  },

  guideBlock: { paddingVertical: 6 },
  guideBlockSep: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 16,
    paddingTop: 16,
  },
  guideH: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  guideB: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 24,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },

  coopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accent + '50',
    backgroundColor: colors.accent + '12',
  },
  coopBtnText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
});
