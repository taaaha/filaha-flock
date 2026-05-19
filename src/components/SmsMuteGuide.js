import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, Linking } from 'react-native';
import { colors } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import Icon from './Icon';
import PrimaryButton from './PrimaryButton';

/**
 * One-time guide that walks the farmer through muting the monitoring
 * device's SMS conversation. The device sends data every 30s by SMS, which
 * the stock Messages app will notify on — Filaha can't suppress that (it's
 * not the default SMS app), so we teach the user to mute that one thread.
 * Filaha keeps processing the messages silently regardless.
 */
export default function SmsMuteGuide({ visible, t, onClose, onAck }) {
  const styles = useStyles(makeStyles);

  const openMessages = () => {
    // Opens the default SMS app so the user can find & mute the thread.
    Linking.openURL('sms:').catch(() => {});
  };

  const steps = [t('smsGuideStep1'), t('smsGuideStep2'), t('smsGuideStep3')];

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.handle} />

          <View style={styles.head}>
            <View style={[styles.iconChip, { backgroundColor: colors.accent + '1f' }]}>
              <Icon name="bell" size={20} color={colors.accent} strokeWidth={2.4} />
            </View>
            <Text style={styles.title}>{t('smsGuideTitle') || 'Silence device messages'}</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            <Text style={styles.why}>{t('smsGuideWhy')}</Text>

            <View style={styles.steps}>
              {steps.map((s, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{s}</Text>
                </View>
              ))}
            </View>

            <View style={styles.note}>
              <Icon name="checkCircle" size={18} color={colors.ok} strokeWidth={2.4} />
              <Text style={styles.noteText}>{t('smsGuideNote')}</Text>
            </View>
          </ScrollView>

          <PrimaryButton
            title={t('smsGuideOpen') || 'Open Messages app'}
            icon="✉"
            variant="subtle"
            onPress={openMessages}
            style={{ marginTop: 14 }}
          />
          <PrimaryButton
            title={t('smsGuideDone') || 'Got it'}
            icon="✓"
            variant="primary"
            onPress={onAck}
            style={{ marginTop: 10 }}
          />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = () => ({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '86%',
  },
  handle: {
    alignSelf: 'center',
    width: 42, height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    marginBottom: 18,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconChip: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
  },
  why: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },
  steps: { gap: 14 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  stepText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.ok + '14',
    borderWidth: 1,
    borderColor: colors.ok + '40',
  },
  noteText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
});
