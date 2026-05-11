import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, Animated, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, shadows } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import Icon from './Icon';

const TUTORIAL_KEY = '@filaha:tutorialDone';

export function shouldShowTutorial() {
  return AsyncStorage.getItem(TUTORIAL_KEY).then((v) => v !== '1');
}

const STEPS = [
  {
    icon: 'home',
    color: '#3b82f6',
    titleKey: 'tutStep1Title',
    bodyKey: 'tutStep1Body',
  },
  {
    icon: 'plus',
    color: '#10b981',
    titleKey: 'tutStep2Title',
    bodyKey: 'tutStep2Body',
  },
  {
    icon: 'phone',
    color: '#ef4444',
    titleKey: 'tutStep3Title',
    bodyKey: 'tutStep3Body',
  },
  {
    icon: 'book',
    color: '#a78bfa',
    titleKey: 'tutStep4Title',
    bodyKey: 'tutStep4Body',
  },
  {
    icon: 'bell',
    color: '#f59e0b',
    titleKey: 'tutStep5Title',
    bodyKey: 'tutStep5Body',
  },
];

export default function Tutorial({ visible, onClose, t }) {
  const styles = useStyles(makeStyles);
  const [step, setStep] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1, duration: 300, useNativeDriver: true,
    }).start();
  }, [step, fade]);

  const finish = async () => {
    await AsyncStorage.setItem(TUTORIAL_KEY, '1');
    onClose && onClose();
  };

  const next = () => {
    if (step >= STEPS.length - 1) { finish(); return; }
    fade.setValue(0);
    setStep((s) => s + 1);
  };

  const skip = () => finish();
  const current = STEPS[step];

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={skip}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { opacity: fade }]}>
          <View style={[styles.iconBox, { backgroundColor: current.color + '22', borderColor: current.color + '60' }]}>
            <Icon name={current.icon} size={40} color={current.color} strokeWidth={2.2} />
          </View>
          <Text style={styles.title}>{t(current.titleKey)}</Text>
          <Text style={styles.body}>{t(current.bodyKey)}</Text>

          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === step && styles.dotActive,
                  i === step && { backgroundColor: current.color },
                ]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable onPress={skip} style={styles.skipBtn}>
              <Text style={styles.skipText}>{t('skip')}</Text>
            </Pressable>
            <Pressable
              onPress={next}
              android_ripple={{ color: '#ffffff44' }}
              style={[styles.nextBtn, { backgroundColor: current.color }, shadows.glow(current.color)]}
            >
              <Text style={styles.nextText}>
                {step >= STEPS.length - 1 ? t('getStarted') : t('next')}
              </Text>
              <Icon name="chevronRight" size={18} color="#fff" />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = () => ({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000ee',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    ...shadows.lg,
  },
  iconBox: {
    width: 84, height: 84, borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
  },
  nextText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
