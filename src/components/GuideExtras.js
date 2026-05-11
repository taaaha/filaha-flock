import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { colors, shadows } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import Icon from './Icon';
import {
  STRAINS, STRAINS_BY_BREED, targetWeightAt, targetFCRAt,
  DISEASES, MARKET_REF, WILAYAS, heatStressTHI, FEED_PROFILE, strainLabel,
} from '../utils/poultryData';

// ─────────────────────────────────────────────────────────────────────
// Growth curve viewer — interactive day-by-day weight + FCR
// ─────────────────────────────────────────────────────────────────────

export function GrowthCurveViewer({ t, defaultStrain = 'cobb500' }) {
  const styles = useStyles(makeStyles);
  const [strainId, setStrainId] = useState(defaultStrain);
  const [benchmark, setBenchmark] = useState('standard'); // standard | field
  const strain = STRAINS[strainId];
  const broilers = STRAINS_BY_BREED.broiler;

  const data = useMemo(() => {
    const points = [];
    const maxDay = strain.growth?.[strain.growth.length - 1]?.day || 42;
    for (let d = 1; d <= maxDay; d++) {
      points.push({
        day: d,
        weight: targetWeightAt(strainId, d),
        fcr: targetFCRAt(strainId, d),
      });
    }
    return points;
  }, [strainId, strain]);

  const W = 320, H = 160, PAD_L = 36, PAD_R = 10, PAD_T = 14, PAD_B = 22;
  const xMax = data[data.length - 1]?.day || 42;
  const yMax = Math.max(...data.map((p) => p.weight || 0));

  const path = data
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${PAD_L + ((p.day - 1) / (xMax - 1)) * (W - PAD_L - PAD_R)},${PAD_T + (1 - (p.weight || 0) / yMax) * (H - PAD_T - PAD_B)}`)
    .join(' ');

  const fieldData = strain.field;
  return (
    <View style={styles.gcWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 6 }}>
        {broilers.map((id) => (
          <Pressable
            key={id}
            onPress={() => setStrainId(id)}
            android_ripple={{ color: colors.accent + '22' }}
            style={[styles.chip, strainId === id && styles.chipActive]}
          >
            <Text style={[styles.chipText, strainId === id && styles.chipTextActive]}>
              {strainLabel(id)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Svg width={W} height={H} style={{ alignSelf: 'center', marginTop: 8 }}>
        {/* axis */}
        <Line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke={colors.border} strokeWidth={1} />
        <Line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke={colors.border} strokeWidth={1} />
        {[0.25, 0.5, 0.75, 1].map((p) => {
          const y = PAD_T + (1 - p) * (H - PAD_T - PAD_B);
          return (
            <G key={p}>
              <Line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke={colors.border} strokeWidth={0.5} strokeDasharray="2 3" />
              <SvgText x={4} y={y + 4} fontSize="9" fill={colors.textTertiary}>
                {Math.round(yMax * p)}
              </SvgText>
            </G>
          );
        })}
        {[7, 14, 21, 28, 35, 42, 49, 56].filter((d) => d <= xMax).map((d) => {
          const x = PAD_L + ((d - 1) / (xMax - 1)) * (W - PAD_L - PAD_R);
          return (
            <SvgText key={d} x={x - 6} y={H - 6} fontSize="9" fill={colors.textTertiary}>
              {`${d}d`}
            </SvgText>
          );
        })}
        {/* curve */}
        <Path d={path} stroke={colors.accent} strokeWidth={2} fill="none" />
        {/* markers at milestones */}
        {strain.growth.map((p, i) => {
          const x = PAD_L + ((p.day - 1) / (xMax - 1)) * (W - PAD_L - PAD_R);
          const y = PAD_T + (1 - p.weight / yMax) * (H - PAD_T - PAD_B);
          return <Circle key={i} cx={x} cy={y} r={3} fill={colors.accent} />;
        })}
        {/* Field benchmark line if available */}
        {fieldData && (
          <Circle
            cx={PAD_L + ((fieldData.age - 1) / (xMax - 1)) * (W - PAD_L - PAD_R)}
            cy={PAD_T + (1 - fieldData.weight / yMax) * (H - PAD_T - PAD_B)}
            r={5} stroke={colors.danger} strokeWidth={2} fill={colors.danger + '40'}
          />
        )}
      </Svg>

      {/* Benchmarks side-by-side */}
      <View style={styles.benchRow}>
        <View style={[styles.benchCard, { borderColor: colors.accent + '60' }]}>
          <Text style={[styles.benchLabel, { color: colors.accent }]}>{t('breederStandard')}</Text>
          <Text style={styles.benchValue}>
            {strain.growth[strain.growth.length - 1].weight}g
          </Text>
          <Text style={styles.benchHint}>
            {strain.growth[strain.growth.length - 1].day}d • FCR {strain.growth[strain.growth.length - 1].fcr || '—'}
          </Text>
        </View>
        {fieldData && (
          <View style={[styles.benchCard, { borderColor: colors.danger + '60' }]}>
            <Text style={[styles.benchLabel, { color: colors.danger }]}>{t('algerianField')}</Text>
            <Text style={styles.benchValue}>{fieldData.weight}g</Text>
            <Text style={styles.benchHint}>
              {fieldData.age}d • FCR {fieldData.fcr} • {fieldData.mortality}% mort.
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.source}>
        {t('sourcedFrom')}{strain.owner} {benchmark === 'standard' ? 'standard 2022' : 'ITELV/OFAL field'}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Disease watchlist (Algeria-specific)
// ─────────────────────────────────────────────────────────────────────

export function DiseaseWatchlist({ t, language }) {
  const styles = useStyles(makeStyles);
  const [open, setOpen] = useState(null);
  const sevColor = (s) => s === 'critical' ? colors.danger : s === 'high' ? colors.warn : colors.accent;
  const sevLabel = (s) =>
    s === 'critical' ? t('severityCritical')
    : s === 'high' ? t('severityHigh')
    : t('severityMedium');

  return (
    <View style={{ gap: 8 }}>
      {DISEASES.map((d) => {
        const isOpen = open === d.id;
        const name = d.name[language] || d.name.en;
        const action = d.action[language] || d.action.en;
        return (
          <View key={d.id} style={styles.diseaseCard}>
            <Pressable
              onPress={() => setOpen(isOpen ? null : d.id)}
              android_ripple={{ color: sevColor(d.severity) + '22' }}
              style={styles.diseaseHead}
            >
              <View style={[styles.diseaseDot, { backgroundColor: sevColor(d.severity) }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.diseaseName} numberOfLines={1}>{name}</Text>
                <Text style={styles.diseaseMeta}>
                  {sevLabel(d.severity)} • {d.season}
                </Text>
              </View>
              <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size={16} color={colors.textTertiary} />
            </Pressable>
            {isOpen && (
              <View style={styles.diseaseBody}>
                <Text style={styles.diseaseSection}>{t('diseaseTriggers')}</Text>
                {d.triggers.map((tr, i) => (
                  <Text key={i} style={styles.diseaseItem}>• {tr}</Text>
                ))}
                <Text style={[styles.diseaseSection, { marginTop: 8 }]}>{t('diseaseAction')}</Text>
                <Text style={styles.diseaseAction}>{action}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Algerian market prices
// ─────────────────────────────────────────────────────────────────────

export function MarketPrices({ t }) {
  const styles = useStyles(makeStyles);
  const items = [
    { key: 'priceDocBroiler', range: MARKET_REF.doc_broiler_dec2025, unit: 'DZD' },
    { key: 'priceLivePerKg',  range: MARKET_REF.broiler_live_dec2025, unit: 'DZD/kg' },
    { key: 'priceRetailPerKg',range: MARKET_REF.broiler_retail_dec2025, unit: 'DZD/kg' },
    { key: 'priceFeedPerKg',  range: MARKET_REF.feed_complete_dzd_per_kg, unit: 'DZD/kg' },
    { key: 'priceEggPerUnit', range: MARKET_REF.egg_retail_dzd_per_unit, unit: 'DZD' },
  ];
  return (
    <View style={{ gap: 8 }}>
      {items.map((it) => (
        <View key={it.key} style={styles.priceRow}>
          <Text style={styles.priceLabel}>{t(it.key)}</Text>
          <View>
            <Text style={styles.priceValue}>
              {it.range.min}–{it.range.max} <Text style={styles.priceUnit}>{it.unit}</Text>
            </Text>
          </View>
        </View>
      ))}
      <Text style={styles.source}>{t('marketAsOf')} {MARKET_REF.asOf}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Wilaya picker — sets climate profile for heat-stress logic
// ─────────────────────────────────────────────────────────────────────

export function WilayaPicker({ t, current, onPick }) {
  const styles = useStyles(makeStyles);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      {WILAYAS.map((w) => {
        const active = current === w.id;
        return (
          <Pressable
            key={w.id}
            onPress={() => onPick(w.id)}
            android_ripple={{ color: colors.accent + '22' }}
            style={[styles.wilayaChip, active && styles.wilayaChipActive]}
          >
            <Icon name="mapPin" size={12} color={active ? colors.accent : colors.textSecondary} />
            <Text style={[styles.wilayaText, active && styles.wilayaTextActive]}>{w.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Feed phase table
// ─────────────────────────────────────────────────────────────────────

export function FeedPhaseTable({ t, breed = 'broiler' }) {
  const styles = useStyles(makeStyles);
  const profile = FEED_PROFILE[breed] || FEED_PROFILE.broiler;
  return (
    <View>
      {profile.phases.map((p, i) => (
        <View key={i} style={styles.phaseRow}>
          <View style={styles.phaseHeader}>
            <Text style={styles.phaseName}>{p.name}</Text>
            <Text style={styles.phaseDays}>{p.days}</Text>
          </View>
          <View style={styles.phaseMeta}>
            <Metric label={t('protein')} value={`${p.cp}%`} />
            <Metric label={t('energy')} value={`${p.kcal}`} />
            {p.ca && <Metric label={t('calcium')} value={`${p.ca}%`} />}
          </View>
        </View>
      ))}
      {profile.formulation && (
        <Text style={styles.formulaNote}>{profile.formulation}</Text>
      )}
    </View>
  );
}

function Metric({ label, value }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const makeStyles = () => ({
  gcWrap: { gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent + '20', borderColor: colors.accent },
  chipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
  chipTextActive: { color: colors.accent },
  benchRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  benchCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 10,
  },
  benchLabel: {
    fontSize: 10, fontWeight: '800', letterSpacing: 0.6,
  },
  benchValue: {
    color: colors.textPrimary,
    fontSize: 20, fontWeight: '900', marginTop: 4,
  },
  benchHint: {
    color: colors.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 2,
  },
  source: {
    color: colors.textTertiary, fontSize: 10, fontStyle: 'italic', marginTop: 6, textAlign: 'center',
  },

  // Disease list
  diseaseCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  diseaseHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
  },
  diseaseDot: { width: 10, height: 10, borderRadius: 5 },
  diseaseName: {
    color: colors.textPrimary, fontSize: 13, fontWeight: '800',
  },
  diseaseMeta: {
    color: colors.textTertiary, fontSize: 11, marginTop: 2, fontWeight: '600',
  },
  diseaseBody: {
    paddingHorizontal: 12, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10,
  },
  diseaseSection: {
    color: colors.accentSoft, fontSize: 11, fontWeight: '900', letterSpacing: 0.5,
    marginBottom: 4,
  },
  diseaseItem: {
    color: colors.textPrimary, fontSize: 13, lineHeight: 19,
  },
  diseaseAction: {
    color: colors.textPrimary, fontSize: 13, lineHeight: 20, fontWeight: '500',
  },

  // Market prices
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: colors.bgElevated, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  priceLabel: {
    color: colors.textSecondary, fontSize: 13, fontWeight: '700', flex: 1,
  },
  priceValue: {
    color: colors.textPrimary, fontSize: 16, fontWeight: '900',
  },
  priceUnit: {
    color: colors.textTertiary, fontSize: 11, fontWeight: '600',
  },

  // Wilaya
  wilayaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1, borderColor: colors.border,
  },
  wilayaChipActive: { borderColor: colors.accent, backgroundColor: colors.accent + '14' },
  wilayaText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  wilayaTextActive: { color: colors.accent },

  // Feed phases
  phaseRow: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    padding: 12, marginBottom: 8,
  },
  phaseHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  phaseName: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  phaseDays: { color: colors.textTertiary, fontSize: 11, fontWeight: '700' },
  phaseMeta: { flexDirection: 'row', gap: 8 },
  metric: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  metricLabel: {
    color: colors.textTertiary, fontSize: 9, fontWeight: '800', letterSpacing: 0.5,
  },
  metricValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '900', marginTop: 2 },

  formulaNote: {
    color: colors.textTertiary, fontSize: 11, fontStyle: 'italic',
    marginTop: 6, lineHeight: 16,
  },
});
