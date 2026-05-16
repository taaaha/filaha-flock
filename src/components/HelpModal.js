import React from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { colors, shadows } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import Icon from './Icon';

/**
 * Reusable contextual help modal. Pass `screen` to look up canned content
 * or pass explicit `title` / `bullets` for a one-off explanation.
 *
 * Usage:
 *   <HelpModal visible={open} onClose={...} t={t} screen="dashboard" />
 */

const HELP_CONTENT = {
  dashboard: {
    titleKey: 'helpDashboardTitle',
    titleFallback: 'How the Dashboard works',
    bullets: [
      { key: 'helpDashboard1', fallback: 'Each card is one coop. Tap to see its sensor history, change settings, or delete it.' },
      { key: 'helpDashboard2', fallback: 'The colored stripe on the left shows status: green = OK, orange = warning, red = danger, gray = offline, orange = power cut.' },
      { key: 'helpDashboard3', fallback: 'The number under each coop name is its age in days. Color matches the rearing phase.' },
      { key: 'helpDashboard4', fallback: 'When a coop is in danger, an action card appears at the top telling you exactly what to do.' },
      { key: 'helpDashboard5', fallback: 'The Daily Briefing at the top gives you a health score from 0 to 100 — your whole farm at a glance.' },
      { key: 'helpDashboard6', fallback: 'The + button adds a coop. The two test buttons let you simulate sensor data and alerts without real hardware.' },
    ],
  },
  guide: {
    titleKey: 'helpGuideTitle',
    titleFallback: 'How the Guide works',
    bullets: [
      { key: 'helpGuide1', fallback: 'Six tabs cover everything: Today, Phases, Tools, Health, Market, Topics.' },
      { key: 'helpGuide2', fallback: 'Today: 7 daily tasks. Tap to mark done. Enable reminders for 7am and 7pm.' },
      { key: 'helpGuide3', fallback: 'Phases: brooding (1–7d), grower (8–21d), finisher (22–42d). Tap each for detailed advice.' },
      { key: 'helpGuide4', fallback: 'Tools: brooder temperature, density, profit, vaccination schedule, growth curve. Tap any to open.' },
      { key: 'helpGuide5', fallback: 'Health: 10 most common diseases in Algeria with symptoms and action steps.' },
      { key: 'helpGuide6', fallback: 'Market: current DZD prices for chicks, feed, live birds, eggs.' },
    ],
  },
  settings: {
    titleKey: 'helpSettingsTitle',
    titleFallback: 'How Settings work',
    bullets: [
      { key: 'helpSettings1', fallback: 'Profile: your name and farm name. Shown in alerts and SMS.' },
      { key: 'helpSettings2', fallback: 'Language: Arabic, French, English. The app and notifications switch instantly.' },
      { key: 'helpSettings3', fallback: 'Appearance: dark mode or light mode. Pick what suits the light around you.' },
      { key: 'helpSettings4', fallback: 'Wilaya: your region. Used for climate-aware advice and heat-stress alerts.' },
      { key: 'helpSettings5', fallback: 'Thresholds: when the app warns you. Temperature and humidity have low AND high limits.' },
      { key: 'helpSettings6', fallback: 'Emergency contact: the number the app calls and texts when danger hits. Save it, enable Auto-call.' },
      { key: 'helpSettings7', fallback: 'Permissions: required for the app to work — SMS, calls, notifications, battery. Grant them all.' },
    ],
  },
  alerts: {
    titleKey: 'helpAlertsTitle',
    titleFallback: 'How Alerts work',
    bullets: [
      { key: 'helpAlerts1', fallback: 'Every alert shows: which coop, what sensor breached, and what to do about it.' },
      { key: 'helpAlerts2', fallback: 'Tap "OK" to acknowledge — clears the red badge on the tab.' },
      { key: 'helpAlerts3', fallback: 'Alerts older than 24h auto-acknowledge.' },
      { key: 'helpAlerts4', fallback: 'When an alert fires: phone vibrates, system notification appears with "Call Now", optionally calls your emergency contact and SMSes them — all automatic if enabled in Settings.' },
    ],
  },
  coopDetail: {
    titleKey: 'helpCoopTitle',
    titleFallback: 'How a Coop\'s detail screen works',
    bullets: [
      { key: 'helpCoop1', fallback: 'The four sensor tiles show current readings. Tap one to chart its trend.' },
      { key: 'helpCoop2', fallback: 'The strain panel tells you the optimal temperature for the bird\'s current age and the THI heat-stress level.' },
      { key: 'helpCoop3', fallback: 'Battery: the sensor\'s own battery. Below 20% = replace soon.' },
      { key: 'helpCoop4', fallback: '"Test device" sends fake sensor data to verify your alert pipeline.' },
      { key: 'helpCoop5', fallback: 'Delete: removes the coop and all its history. Cannot be undone.' },
    ],
  },
};

export default function HelpModal({ visible, onClose, t, screen, title, bullets }) {
  const styles = useStyles(makeStyles);
  const content = screen ? HELP_CONTENT[screen] : null;
  const resolvedTitle = title || (content ? (t(content.titleKey) || content.titleFallback) : (t('help') || 'Help'));
  const resolvedBullets = bullets || (content
    ? content.bullets.map((b) => (t(b.key) && t(b.key) !== b.key) ? t(b.key) : b.fallback)
    : []
  );

  return (
    <Modal animationType="slide" transparent visible={!!visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, shadows.lg]}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <View style={styles.headIcon}>
              <Icon name="info" size={20} color={colors.accent} />
            </View>
            <Text style={styles.headTitle}>{resolvedTitle}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Icon name="x" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 14 }}>
            {resolvedBullets.map((b, i) => (
              <View key={i} style={styles.bullet}>
                <View style={styles.dot} />
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </ScrollView>
          <Pressable
            onPress={onClose}
            android_ripple={{ color: '#ffffff22' }}
            style={styles.gotIt}
          >
            <Text style={styles.gotItText}>{t('gotIt') || 'Got it'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = () => ({
  backdrop: { flex: 1, backgroundColor: '#000000cc', justifyContent: 'flex-end' },
  card: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18,
    maxHeight: '85%',
    borderTopWidth: 1, borderColor: colors.border,
  },
  handle: {
    alignSelf: 'center', width: 42, height: 4, borderRadius: 2,
    backgroundColor: colors.borderLight, marginBottom: 14,
  },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingBottom: 14, marginBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.accent + '18',
    borderWidth: 1, borderColor: colors.accent + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  headTitle: { flex: 1, color: colors.textPrimary, fontSize: 17, fontWeight: '900' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 9,
  },
  bulletText: { flex: 1, color: colors.textPrimary, fontSize: 14, lineHeight: 21 },
  gotIt: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  gotItText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
});
