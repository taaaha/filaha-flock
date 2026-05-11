import React, { useState, useMemo } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView,
} from 'react-native';
import { colors, shadows } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import Icon from './Icon';
import {
  targetTempAt, DENSITY, FEED_PROFILE, MARKET_REF, VACCINATION,
} from '../utils/poultryData';

const BREEDS = [
  { id: 'broiler', icon: 'feather', color: '#fb923c' },
  { id: 'layer',   icon: 'egg',     color: '#facc15' },
  { id: 'beldi',   icon: 'heart',   color: '#a78bfa' },
];

// ── Brooder temperature calculator ──
export function BrooderCalc({ t, defaultBreed = 'broiler', defaultAge = 1 }) {
  const styles = useStyles(makeStyles);
  const [breed, setBreed] = useState(defaultBreed);
  const [age, setAge] = useState(String(defaultAge));

  const ageNum = Math.max(1, Math.min(120, parseInt(age, 10) || 1));
  const targetTemp = useMemo(() => targetTempAt(breed, ageNum), [breed, ageNum]);

  let zone = '';
  if (targetTemp >= 30) zone = 'brooding';
  else if (targetTemp >= 24) zone = 'grower';
  else zone = 'finisher';

  return (
    <View style={styles.calc}>
      <BreedTabs current={breed} onChange={setBreed} t={t} />
      <View style={styles.calcRow}>
        <Text style={styles.calcLabel}>{t('ageInDays')}</Text>
        <TextInput
          value={age}
          onChangeText={(v) => setAge(v.replace(/[^0-9]/g, '').slice(0, 3))}
          keyboardType="number-pad"
          style={styles.calcInput}
        />
      </View>
      <View style={[styles.result, { borderColor: colors.temp + '60', backgroundColor: colors.temp + '14' }]}>
        <Icon name="thermometer" size={32} color={colors.temp} />
        <View style={{ flex: 1 }}>
          <Text style={styles.resultLabel}>{t('optimalTemp')}</Text>
          <Text style={[styles.resultValue, { color: colors.temp }]}>
            {targetTemp.toFixed(1)}°C
          </Text>
          <Text style={styles.resultHint}>
            {t('basedOn')} {t(breed)} • {t('day')} {ageNum}
          </Text>
        </View>
      </View>
      <Text style={styles.source}>
        {t('sourcedFrom')}Cobb 500 / Aviagen Ross 308 management guides
      </Text>
    </View>
  );
}

// ── Density calculator ──
export function DensityCalc({ t, defaultBreed = 'broiler' }) {
  const styles = useStyles(makeStyles);
  const [breed, setBreed] = useState(defaultBreed);
  const [area, setArea] = useState('50');

  const areaNum = Math.max(1, parseFloat(area) || 1);
  const profile = DENSITY[breed] || DENSITY.broiler;
  const maxBirds = Math.floor(areaNum * profile.recommended);

  return (
    <View style={styles.calc}>
      <BreedTabs current={breed} onChange={setBreed} t={t} />
      <View style={styles.calcRow}>
        <Text style={styles.calcLabel}>{t('areaInM2')}</Text>
        <TextInput
          value={area}
          onChangeText={(v) => setArea(v.replace(/[^0-9.]/g, '').slice(0, 6))}
          keyboardType="decimal-pad"
          style={styles.calcInput}
        />
      </View>
      <View style={[styles.result, { borderColor: colors.accent + '60', backgroundColor: colors.accent + '14' }]}>
        <Icon name="home" size={32} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.resultLabel}>{t('birdsTotal')}</Text>
          <Text style={[styles.resultValue, { color: colors.accent }]}>{maxBirds}</Text>
          <Text style={styles.resultHint}>
            {profile.recommended} {t('birdsPerM2')} • {areaNum} m²
          </Text>
        </View>
      </View>
      <Text style={styles.source}>
        {t('sourcedFrom')}{profile.sourceNote}
      </Text>
    </View>
  );
}

// ── Profit estimator ──
export function ProfitCalc({ t, defaultBreed = 'broiler' }) {
  const styles = useStyles(makeStyles);
  const [breed, setBreed] = useState(defaultBreed);
  const [birds, setBirds] = useState('1000');
  const [feedPrice, setFeedPrice] = useState(String(MARKET_REF.feedPriceDZD));
  const [marketPrice, setMarketPrice] = useState(
    String(breed === 'beldi' ? MARKET_REF.beldiLiveDZD : MARKET_REF.broilerLiveDZD)
  );

  const profile = FEED_PROFILE[breed] || FEED_PROFILE.broiler;
  const n = parseInt(birds, 10) || 0;
  const fp = parseFloat(feedPrice) || 0;
  const mp = parseFloat(marketPrice) || 0;

  const totalFeedKg = n * (profile.totalFeedKg || profile.totalFeedKgPerBird || 4.5);
  const feedCost = totalFeedKg * fp;
  const totalWeight = n * (profile.marketWeightKg || 2.5);
  const revenue = totalWeight * mp;
  const profit = revenue - feedCost;
  const profitPerBird = n > 0 ? profit / n : 0;

  return (
    <View style={styles.calc}>
      <BreedTabs current={breed} onChange={setBreed} t={t} />
      <View style={styles.calcRow}>
        <Text style={styles.calcLabel}>{t('birdsTotal')}</Text>
        <TextInput
          value={birds}
          onChangeText={(v) => setBirds(v.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          style={styles.calcInput}
        />
      </View>
      <View style={styles.calcRow}>
        <Text style={styles.calcLabel}>{t('feedCostPerKg')}</Text>
        <TextInput
          value={feedPrice}
          onChangeText={(v) => setFeedPrice(v.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          style={styles.calcInput}
        />
      </View>
      <View style={styles.calcRow}>
        <Text style={styles.calcLabel}>{t('marketPricePerKg')}</Text>
        <TextInput
          value={marketPrice}
          onChangeText={(v) => setMarketPrice(v.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          style={styles.calcInput}
        />
      </View>
      <View style={styles.kpiRow}>
        <Kpi label={t('estimatedFeed')} value={`${(totalFeedKg).toFixed(0)} kg`} color={colors.warn} />
        <Kpi label={t('estimatedRevenue')} value={`${(revenue / 1000).toFixed(0)}k`} color={colors.accent} />
      </View>
      <View style={[styles.result, {
        borderColor: profit >= 0 ? colors.ok + '60' : colors.danger + '60',
        backgroundColor: (profit >= 0 ? colors.ok : colors.danger) + '14',
      }]}>
        <Icon name="target" size={32} color={profit >= 0 ? colors.ok : colors.danger} />
        <View style={{ flex: 1 }}>
          <Text style={styles.resultLabel}>{t('estimatedProfit')}</Text>
          <Text style={[styles.resultValue, { color: profit >= 0 ? colors.ok : colors.danger }]}>
            {profit >= 0 ? '+' : ''}{(profit / 1000).toFixed(1)}k DZD
          </Text>
          <Text style={styles.resultHint}>
            {profitPerBird.toFixed(0)} DZD {t('perBird')}
          </Text>
        </View>
      </View>
      <Text style={styles.source}>
        {t('sourcedFrom')}{t('basedOn')} {profile.cycleDays} {t('day')} • FCR ~{profile.fcrTarget}
      </Text>
    </View>
  );
}

// ── Vaccination schedule ──
export function VaccineSchedule({ t, defaultBreed = 'broiler', chickArrivalDate = Date.now() }) {
  const styles = useStyles(makeStyles);
  const [breed, setBreed] = useState(defaultBreed);
  const schedule = VACCINATION[breed] || VACCINATION.broiler;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  return (
    <View style={styles.calc}>
      <BreedTabs current={breed} onChange={setBreed} t={t} />
      <ScrollView style={{ maxHeight: 320 }}>
        {schedule.map((v, i) => {
          const date = new Date(chickArrivalDate + (v.day - 1) * dayMs);
          const dateStr = date.toLocaleDateString();
          const past = date.getTime() < now;
          return (
            <View key={i} style={[styles.vaccineRow, past && { opacity: 0.5 }]}>
              <View style={[styles.vaccineDay, past && { backgroundColor: colors.ok + '22', borderColor: colors.ok }]}>
                <Text style={[styles.vaccineDayNum, past && { color: colors.ok }]}>{v.day}</Text>
                <Text style={styles.vaccineDayLabel}>{t('day')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vaccineName}>{v.vaccine}</Text>
                <Text style={styles.vaccineMeta}>
                  {dateStr} • {v.route} • {v.notes}
                </Text>
              </View>
              {past ? <Icon name="check" size={18} color={colors.ok} /> : null}
            </View>
          );
        })}
      </ScrollView>
      <Text style={styles.source}>
        {t('sourcedFrom')}Standard Algerian poultry vaccination protocol
      </Text>
    </View>
  );
}

// ── Helpers ──
function BreedTabs({ current, onChange, t }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.breedTabs}>
      {BREEDS.map((b) => (
        <Pressable
          key={b.id}
          onPress={() => onChange(b.id)}
          android_ripple={{ color: b.color + '22' }}
          style={[styles.breedTab, current === b.id && { borderColor: b.color + '80', backgroundColor: b.color + '18' }]}
        >
          <Icon name={b.icon} size={14} color={current === b.id ? b.color : colors.textSecondary} />
          <Text style={[styles.breedTabText, current === b.id && { color: b.color }]}>
            {t(b.id)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Kpi({ label, value, color }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

const makeStyles = () => ({
  calc: {
    backgroundColor: colors.bgElevated,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  breedTabs: {
    flexDirection: 'row',
    gap: 6,
  },
  breedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  breedTabText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calcLabel: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  calcInput: {
    width: 120,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  resultLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  resultValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  resultHint: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  source: {
    color: colors.textTertiary,
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpi: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kpiLabel: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 3,
  },
  vaccineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  vaccineDay: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.accent + '14',
    borderWidth: 1,
    borderColor: colors.accent + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaccineDayNum: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '900',
  },
  vaccineDayLabel: {
    color: colors.textTertiary,
    fontSize: 9,
    fontWeight: '700',
  },
  vaccineName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  vaccineMeta: {
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
});
