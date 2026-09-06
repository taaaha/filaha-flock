import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { colors, barStyle } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import PrimaryButton from '../components/PrimaryButton';
import CoopMascot from '../components/CoopMascot';
import { LANGS } from '../translations';
import RegionPicker from '../components/RegionPicker';
import {
  COUNTRIES, COUNTRY_IDS, getCountry, countryName,
  regionLabel, regionsOf, regionName,
  isValidPhone, fullPhone, digitsOnly,
} from '../utils/regions';

// ─────────────────────────────────────────────────────────────────────
// Guided setup.
//
// Three things have to be true before the app is worth anything: it has to be
// in a language the farmer reads, it has to know where the farm is (which
// decides the climate advice AND which air-quality law applies), and it has to
// know the number the coop device should ring at 2 a.m.
//
// Everything else can wait. So the flow asks exactly those, one question per
// screen, each with a plain sentence saying why it is being asked — nobody
// hands over a phone number to an app that will not say what it does with it.
// ─────────────────────────────────────────────────────────────────────

const VALUE_SLIDES = [
  { status: 'ok',      titleKey: 'onboardingTitle1', descKey: 'onboardingDesc1' },
  { status: 'danger',  titleKey: 'onboardingTitle2', descKey: 'onboardingDesc2' },
  { status: 'offline', titleKey: 'onboardingTitle3', descKey: 'onboardingDesc3' },
];

// Screen ids in order. The value slides come first so the farmer knows what he
// is signing up for before being asked for anything personal.
const STEPS = ['lang', 'slide0', 'slide1', 'slide2', 'name', 'country', 'region', 'phone', 'done'];
// Only the steps that ask for something count toward "Step n of 4" — a progress
// bar that also counts the marketing slides makes the form feel longer.
const FORM_STEPS = ['name', 'country', 'region', 'phone'];

export default function OnboardingScreen() {
  const styles = useStyles(makeStyles);
  const { t, language, setLanguage, completeOnboarding } = useApp();

  const [stepIdx, setStepIdx] = useState(0);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('dz');
  const [region, setRegion] = useState('');
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState({});
  const [regionOpen, setRegionOpen] = useState(false);
  const scrollRef = useRef(null);

  const step = STEPS[stepIdx];
  const cfg = getCountry(country);
  const formPos = FORM_STEPS.indexOf(step);

  const regions = useMemo(() => regionsOf(country), [country]);

  const selectedRegion = regions.find((r) => r.id === region);

  // Per-step validation. `blocked` disables Continue; the message only appears
  // once the field has been touched, so the farmer is never scolded for a field
  // he has not reached yet.
  const nameError = !name.trim() ? t('nameRequired') : null;
  const regionError = !region ? t('regionRequired') : null;
  const phoneError = phone && !isValidPhone(country, phone) ? t('phoneInvalid') : null;

  const blocked =
    (step === 'name' && !!nameError) ||
    (step === 'region' && !!regionError) ||
    (step === 'phone' && (!phone.trim() || !!phoneError));

  const goNext = () => {
    if (step === 'done') {
      completeOnboarding({
        farmerName: name.trim(),
        country,
        region,
        farmerPhone: fullPhone(country, phone),
      });
      return;
    }
    if (blocked) { setTouched((s) => ({ ...s, [step]: true })); return; }
    setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const goBack = () => {
    setStepIdx((i) => Math.max(i - 1, 0));
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // Picking a country re-points the language at that country's own default,
  // but only while the farmer has not already chosen one deliberately.
  const pickCountry = (id) => {
    setCountry(id);
    setRegion('');
    const next = getCountry(id);
    if (!next.langs.includes(language)) setLanguage(next.defaultLang);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={barStyle()} backgroundColor={colors.bg} />

      {/* Progress: a slim bar for the form half, nothing during the slides. */}
      <View style={styles.topBar}>
        {stepIdx > 0 ? (
          <Pressable onPress={goBack} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backText}>{'‹  ' + t('back')}</Text>
          </Pressable>
        ) : <View style={styles.backBtn} />}

        {formPos >= 0 ? (
          <Text style={styles.stepLabel}>
            {t('stepOf', { n: formPos + 1, total: FORM_STEPS.length })}
          </Text>
        ) : <View />}
        <View style={styles.backBtn} />
      </View>

      {formPos >= 0 ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((formPos + 1) / FORM_STEPS.length) * 100}%` }]} />
        </View>
      ) : <View style={styles.progressSpacer} />}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'lang' ? (
            <>
              <Text style={styles.brand}>Filaha Flock</Text>
              <View style={styles.mascotWrap}>
                <CoopMascot animated status="ok" size={104} />
              </View>
              <Text style={styles.title}>{t('chooseLanguage')}</Text>
              <View style={styles.langGrid}>
                {Object.keys(LANGS).map((code) => (
                  <Pressable
                    key={code}
                    onPress={() => setLanguage(code)}
                    style={[styles.langCard, language === code && styles.langCardActive]}
                  >
                    <Text style={[styles.langCardText, language === code && styles.langCardTextActive]}>
                      {LANGS[code].name}
                    </Text>
                    {language === code ? <Text style={styles.langTick}>✓</Text> : null}
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {step.startsWith('slide') ? (() => {
            const slide = VALUE_SLIDES[Number(step.slice(5))];
            return (
              <>
                <View style={styles.mascotWrap}>
                  <CoopMascot animated status={slide.status} size={120} />
                </View>
                <Text style={styles.title}>{t(slide.titleKey)}</Text>
                <Text style={styles.desc}>{t(slide.descKey)}</Text>
                <View style={styles.dots}>
                  {VALUE_SLIDES.map((_, i) => (
                    <View key={i} style={[styles.dot, i === Number(step.slice(5)) && styles.dotActive]} />
                  ))}
                </View>
              </>
            );
          })() : null}

          {step === 'name' ? (
            <>
              <Text style={styles.kicker}>{t('setupGreetTitle')}</Text>
              <Text style={styles.title}>{t('yourName')}</Text>
              <Text style={styles.why}>{t('yourNameWhy')}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t('yourNamePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                autoFocus
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={goNext}
              />
              {touched.name && nameError ? <Text style={styles.error}>{nameError}</Text> : null}
            </>
          ) : null}

          {step === 'country' ? (
            <>
              <Text style={styles.title}>{t('yourCountry')}</Text>
              <Text style={styles.why}>{t('yourCountryWhy')}</Text>
              <View style={styles.countryList}>
                {COUNTRY_IDS.map((id) => {
                  const c = COUNTRIES[id];
                  const active = country === id;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => pickCountry(id)}
                      style={[styles.countryCard, active && styles.countryCardActive]}
                    >
                      <Text style={styles.flag}>{c.flag}</Text>
                      <View style={styles.flex}>
                        <Text style={[styles.countryName, active && styles.countryNameActive]}>
                          {countryName(id, language)}
                        </Text>
                        <Text style={styles.countryMeta}>
                          {c.dial} · {c.currency}
                        </Text>
                      </View>
                      {active ? <Text style={styles.tick}>✓</Text> : null}
                    </Pressable>
                  );
                })}
              </View>

              {/* Say out loud what changed, rather than silently reconfiguring. */}
              {country === 'de' ? (
                <View style={styles.note}>
                  <Text style={styles.noteTitle}>{t('euLimitsTitle')}</Text>
                  <Text style={styles.noteBody}>{t('euLimitsBody')}</Text>
                </View>
              ) : null}
              {country === 'qa' ? (
                <View style={styles.note}>
                  <Text style={styles.noteTitle}>{t('gulfHeatTitle')}</Text>
                  <Text style={styles.noteBody}>{t('gulfHeatBody')}</Text>
                </View>
              ) : null}
            </>
          ) : null}

          {step === 'region' ? (
            <>
              <Text style={styles.title}>{t('yourRegionTitle')}</Text>
              <Text style={styles.why}>{t('yourRegionWhy')}</Text>
              <Pressable style={styles.select} onPress={() => setRegionOpen(true)}>
                <Text style={[styles.selectText, !selectedRegion && styles.selectPlaceholder]}>
                  {selectedRegion
                    ? regionName(selectedRegion, language)
                    : t('pickRegionLabel', { label: regionLabel(country, language) })}
                </Text>
                <Text style={styles.chevron}>▾</Text>
              </Pressable>
              {touched.region && regionError ? <Text style={styles.error}>{regionError}</Text> : null}
            </>
          ) : null}

          {step === 'phone' ? (
            <>
              <Text style={styles.title}>{t('yourPhone')}</Text>
              <Text style={styles.why}>{t('yourPhoneWhy')}</Text>
              <View style={styles.phoneRow}>
                <View style={styles.dialBox}>
                  <Text style={styles.flagSmall}>{cfg.flag}</Text>
                  <Text style={styles.dialText}>{cfg.dial}</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  value={phone}
                  onChangeText={(v) => setPhone(digitsOnly(v))}
                  placeholder={cfg.phoneExample}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                  autoFocus
                  maxLength={cfg.phoneDigits}
                />
              </View>
              {phoneError ? <Text style={styles.error}>{phoneError}</Text> : null}
            </>
          ) : null}

          {step === 'done' ? (
            <>
              <View style={styles.mascotWrap}>
                <CoopMascot animated status="ok" size={120} />
              </View>
              <Text style={styles.title}>{t('setupDoneTitle', { name: name.trim() })}</Text>
              <Text style={styles.desc}>{t('setupDoneBody')}</Text>

              <View style={styles.summary}>
                <SummaryRow styles={styles} label={t('country')}
                  value={`${cfg.flag}  ${countryName(country, language)}`} />
                <SummaryRow styles={styles} label={regionLabel(country, language)}
                  value={selectedRegion ? regionName(selectedRegion, language) : '—'} />
                <SummaryRow styles={styles} label={t('phone')}
                  value={fullPhone(country, phone)} last />
              </View>
              <Text style={styles.limitsNote}>
                {t('limitsForCountry', { country: countryName(country, language) })}
              </Text>
            </>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            title={step === 'done' ? t('getStarted') : t('continueBtn')}
            onPress={goNext}
            disabled={blocked}
            style={[styles.cta, blocked && styles.ctaDisabled]}
          />
        </View>
      </KeyboardAvoidingView>

      <RegionPicker
        visible={regionOpen}
        onClose={() => setRegionOpen(false)}
        country={country}
        value={region}
        onSelect={(id) => { setRegion(id); setRegionOpen(false); }}
      />
    </SafeAreaView>
  );
}

function SummaryRow({ styles, label, value, last }) {
  return (
    <View style={[styles.sumRow, last && styles.sumRowLast]}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={styles.sumValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const makeStyles = () => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    height: 40,
  },
  backBtn: { minWidth: 72, paddingVertical: 6, paddingHorizontal: 4 },
  backText: { color: colors.textSecondary, fontSize: 15, fontWeight: '700' },
  stepLabel: { color: colors.textTertiary, fontSize: 13, fontWeight: '700' },

  progressTrack: {
    height: 3,
    backgroundColor: colors.border,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: { height: 3, backgroundColor: colors.accent, borderRadius: 2 },
  progressSpacer: { height: 7 },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 20,
    textAlign: 'center',
  },
  mascotWrap: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  kicker: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  desc: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 330,
  },
  why: {
    color: colors.textTertiary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 330,
    marginBottom: 22,
  },

  // Language
  langGrid: { width: '100%', gap: 10, marginTop: 8 },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  langCardActive: { borderColor: colors.accent, backgroundColor: colors.cardElevated },
  langCardText: { color: colors.textSecondary, fontSize: 17, fontWeight: '700' },
  langCardTextActive: { color: colors.textPrimary },
  langTick: { color: colors.accent, fontSize: 18, fontWeight: '800' },

  // Inputs
  input: {
    width: '100%',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  error: { color: colors.danger, fontSize: 13.5, marginTop: 8, fontWeight: '600' },

  phoneRow: { flexDirection: 'row', width: '100%', gap: 10 },
  dialBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    backgroundColor: colors.cardElevated,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 14,
  },
  flagSmall: { fontSize: 18 },
  dialText: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
  phoneInput: { flex: 1 },

  // Country
  countryList: { width: '100%', gap: 10 },
  countryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  countryCardActive: { borderColor: colors.accent, backgroundColor: colors.cardElevated },
  flag: { fontSize: 30 },
  countryName: { color: colors.textSecondary, fontSize: 17, fontWeight: '800' },
  countryNameActive: { color: colors.textPrimary },
  countryMeta: { color: colors.textTertiary, fontSize: 13, marginTop: 2, fontWeight: '600' },
  tick: { color: colors.accent, fontSize: 20, fontWeight: '800' },

  note: {
    width: '100%',
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.okWash,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteTitle: { color: colors.okInk, fontSize: 14, fontWeight: '800', marginBottom: 4 },
  noteBody: { color: colors.textSecondary, fontSize: 13.5, lineHeight: 20 },

  // Region select
  select: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  selectText: { color: colors.textPrimary, fontSize: 17, fontWeight: '700', flex: 1 },
  selectPlaceholder: { color: colors.textTertiary, fontWeight: '600' },
  chevron: { color: colors.textTertiary, fontSize: 16, marginStart: 8 },

  // Summary
  summary: {
    width: '100%',
    marginTop: 26,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  sumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  sumRowLast: { borderBottomWidth: 0 },
  sumLabel: { color: colors.textTertiary, fontSize: 14, fontWeight: '700' },
  sumValue: { color: colors.textPrimary, fontSize: 15, fontWeight: '800', flexShrink: 1 },
  limitsNote: {
    color: colors.textTertiary,
    fontSize: 12.5,
    marginTop: 12,
    textAlign: 'center',
  },

  dots: { flexDirection: 'row', justifyContent: 'center', paddingTop: 22, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.accent },

  footer: { paddingHorizontal: 20, paddingBottom: 22, paddingTop: 8 },
  cta: { width: '100%' },
  ctaDisabled: { opacity: 0.45 },

});
