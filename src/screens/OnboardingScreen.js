import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { colors } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import PrimaryButton from '../components/PrimaryButton';
import { LANGS } from '../translations';

const { width } = Dimensions.get('window');

const SLIDES = [
  { icon: '🐔', titleKey: 'onboardingTitle1', descKey: 'onboardingDesc1' },
  { icon: '⚠️', titleKey: 'onboardingTitle2', descKey: 'onboardingDesc2' },
  { icon: '📡', titleKey: 'onboardingTitle3', descKey: 'onboardingDesc3' },
];

export default function OnboardingScreen() {
  const styles = useStyles(makeStyles);
  const { t, language, setLanguage, completeOnboarding } = useApp();
  const [step, setStep] = useState(0);
  const isLast = step === SLIDES.length - 1;

  const onNext = () => {
    if (isLast) {
      completeOnboarding();
    } else {
      setStep((s) => s + 1);
    }
  };

  const slide = SLIDES[step];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={styles.langRow}>
        {Object.keys(LANGS).map((code) => (
          <Pressable
            key={code}
            onPress={() => setLanguage(code)}
            style={[
              styles.langChip,
              language === code && styles.langChipActive,
            ]}
          >
            <Text style={[
              styles.langChipText,
              language === code && styles.langChipTextActive,
            ]}>
              {LANGS[code].name}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.brand}>Filaha Flock</Text>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{slide.icon}</Text>
        </View>
        <Text style={styles.title}>{t(slide.titleKey)}</Text>
        <Text style={styles.desc}>{t(slide.descKey)}</Text>
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === step && styles.dotActive,
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title={isLast ? t('getStarted') : t('next')}
          onPress={onNext}
          style={styles.cta}
        />
        {!isLast ? (
          <Pressable onPress={completeOnboarding} style={styles.skipBtn}>
            <Text style={styles.skipText}>{t('skip')}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = () => ({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 8,
  },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  langChipText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  langChipTextActive: {
    color: '#fff',
  },
  brand: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
    textAlign: 'center',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  icon: {
    fontSize: 72,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  desc: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.accent,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  cta: {
    width: '100%',
  },
  skipBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
