import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Pressable, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { colors, useTheme } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import Icon from '../components/Icon';
import { WilayaPicker } from '../components/GuideExtras';
import { LANGS } from '../translations';
import {
  isIgnoringBatteryOptimizations,
  requestIgnoreBatteryOptimizations,
  checkSmsPermission,
  requestSmsPermissions,
  checkCallPermission,
  requestCallPermission,
  checkSendSmsPermission,
  requestSendSmsPermission,
  requestNotificationPermission,
  checkNotificationsEnabled,
  showAlertNotification,
  sendSms,
} from '../services/SmsService';
import { makeDirectCall } from '../services/CallService';
import Field from '../components/Field';
import ToggleRow from '../components/ToggleRow';
import ThresholdSlider from '../components/ThresholdSlider';
import PrimaryButton from '../components/PrimaryButton';
import { showToast } from '../components/Toast';

export default function SettingsScreen() {
  const {
    t, language, theme, settings, thresholds,
    setLanguage, setTheme, updateSettings, updateThresholds, resetThresholds,
  } = useApp();
  const styles = useStyles(makeStyles);

  const [farmerName, setFarmerName] = useState(settings.farmerName || '');
  const [farmName, setFarmName] = useState(settings.farmName || '');
  const [emergencyContact, setEmergencyContact] = useState(settings.emergencyContact || '');
  const [smsGranted, setSmsGranted] = useState(false);
  const [callGranted, setCallGranted] = useState(false);
  const [sendSmsGranted, setSendSmsGranted] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [batteryOk, setBatteryOk] = useState(true);

  useEffect(() => { setFarmerName(settings.farmerName || ''); }, [settings.farmerName]);
  useEffect(() => { setFarmName(settings.farmName || ''); }, [settings.farmName]);
  useEffect(() => { setEmergencyContact(settings.emergencyContact || ''); }, [settings.emergencyContact]);

  useEffect(() => { refreshPermissions(); }, []);

  const refreshPermissions = async () => {
    const [sms, call, send, notif, batt] = await Promise.all([
      checkSmsPermission(),
      checkCallPermission(),
      checkSendSmsPermission(),
      checkNotificationsEnabled(),
      isIgnoringBatteryOptimizations(),
    ]);
    setSmsGranted(sms);
    setCallGranted(call);
    setSendSmsGranted(send);
    setNotifEnabled(notif);
    setBatteryOk(batt);
  };

  const onSaveProfile = async () => {
    await updateSettings({
      farmerName: farmerName.trim(),
      farmName: farmName.trim(),
    });
    showToast(t('profileSaved'), 'success');
  };

  const onSaveContact = async () => {
    const trimmed = emergencyContact.trim();
    await updateSettings({ emergencyContact: trimmed });
    showToast(trimmed ? t('contactSaved') : t('saved'), 'success');
  };

  const onLanguage = (lang) => {
    if (lang === language) return;
    setLanguage(lang);
    Alert.alert(t('languageChanged'), t('languageChangedMessage'), [
      { text: t('done'), style: 'default' },
    ]);
  };

  const onResetThresholds = () => {
    Alert.alert(t('resetDefaults'), '', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('done'),
        onPress: async () => {
          await resetThresholds();
          showToast(t('thresholdsSaved'), 'success');
        },
      },
    ]);
  };

  const onTestCall = async () => {
    const num = (emergencyContact || settings.emergencyContact || '').trim();
    if (!num) { showToast(t('noEmergencyNumber'), 'warn'); return; }
    let granted = await checkCallPermission();
    if (!granted) granted = await requestCallPermission();
    if (!granted) { showToast(t('permissionDenied'), 'error'); return; }
    showToast(t('callStarted'), 'info');
    const ok = await makeDirectCall(num);
    if (!ok) showToast(t('callFailed'), 'error');
  };

  // Run a complete end-to-end test: notification + SMS + call
  const onTestAll = async () => {
    const num = (emergencyContact || settings.emergencyContact || '').trim();
    if (!num) { showToast(t('noEmergencyNumber'), 'warn'); return; }

    // 1) Ensure notification permission, then post notification
    let nOk = await checkNotificationsEnabled();
    if (!nOk) {
      await requestNotificationPermission();
      nOk = await checkNotificationsEnabled();
    }
    const notifResult = await showAlertNotification(
      `🧪 ${t('testAlert')} — Filaha Flock`,
      t('testNotificationBody') || 'This is a Filaha Flock test notification. If you see this, alerts are working.',
      false
    );
    showToast(
      notifResult ? `✓ ${t('notificationPermission')}` : `✗ ${t('notificationPermission')}`,
      notifResult ? 'success' : 'error'
    );

    // 2) Send SMS
    setTimeout(async () => {
      let smsOk = await checkSendSmsPermission();
      if (!smsOk) smsOk = await requestSendSmsPermission();
      if (smsOk) {
        const sent = await sendSms(num,
          `🧪 Filaha Flock test SMS\n${new Date().toLocaleString()}`);
        showToast(
          sent ? `✓ SMS` : `✗ SMS`,
          sent ? 'success' : 'error'
        );
      } else {
        showToast(`✗ SMS — ${t('permissionDenied')}`, 'error');
      }
    }, 800);

    // 3) Place call
    setTimeout(async () => {
      let cOk = await checkCallPermission();
      if (!cOk) cOk = await requestCallPermission();
      if (cOk) {
        showToast(t('callStarted'), 'info');
        await makeDirectCall(num);
      } else {
        showToast(`✗ ${t('callPermission')}`, 'error');
      }
    }, 2200);
  };

  const onRequestSms = async () => {
    const ok = await requestSmsPermissions();
    refreshPermissions();
    showToast(ok ? t('permissionGranted') : t('permissionDenied'), ok ? 'success' : 'error');
  };
  const onRequestCall = async () => {
    const ok = await requestCallPermission();
    refreshPermissions();
    showToast(ok ? t('permissionGranted') : t('permissionDenied'), ok ? 'success' : 'error');
  };
  const onRequestSendSms = async () => {
    const ok = await requestSendSmsPermission();
    refreshPermissions();
    showToast(ok ? t('permissionGranted') : t('permissionDenied'), ok ? 'success' : 'error');
  };
  const onRequestNotif = async () => {
    const ok = await requestNotificationPermission();
    setTimeout(refreshPermissions, 500);
    showToast(ok ? t('permissionGranted') : t('permissionDenied'), ok ? 'success' : 'error');
  };
  const onRequestBattery = async () => {
    await requestIgnoreBatteryOptimizations();
    setTimeout(refreshPermissions, 1000);
  };

  const onThresholdChange = (key, v) => {
    updateThresholds({ [key]: v });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>{t('settings')}</Text>

        {/* Profile */}
        <Text style={styles.sectionTitle}>{t('profile')}</Text>
        <Field
          label={t('farmerName')}
          value={farmerName}
          onChangeText={setFarmerName}
        />
        <Field
          label={t('farmName')}
          value={farmName}
          onChangeText={setFarmName}
        />
        <PrimaryButton
          title={t('save')}
          icon="✓"
          variant="primary"
          onPress={onSaveProfile}
          style={{ marginBottom: 16 }}
        />

        {/* Language */}
        <Text style={styles.sectionTitle}>{t('language')}</Text>
        <View style={styles.langGrid}>
          {Object.keys(LANGS).map((code) => (
            <Pressable
              key={code}
              onPress={() => onLanguage(code)}
              android_ripple={{ color: colors.accent + '22' }}
              style={[styles.langRow, language === code && styles.langRowActive]}
            >
              <Text style={[styles.langText, language === code && styles.langTextActive]}>
                {LANGS[code].name}
              </Text>
              {language === code ? <Text style={styles.langCheck}>✓</Text> : null}
            </Pressable>
          ))}
        </View>

        {/* Appearance */}
        <Text style={styles.sectionTitle}>{t('appearance') || 'Appearance'}</Text>
        <View style={styles.themeRow}>
          <Pressable
            onPress={() => setTheme('dark')}
            android_ripple={{ color: colors.accent + '22' }}
            style={[styles.themeBtn, theme === 'dark' && styles.themeBtnActive]}
          >
            <View style={[styles.themePreview, { backgroundColor: '#070b14', borderColor: '#1e2a44' }]}>
              <View style={[styles.themePreviewBar, { backgroundColor: '#3b82f6' }]} />
              <View style={[styles.themePreviewCard, { backgroundColor: '#11182a' }]} />
            </View>
            <View style={styles.themeBtnLabelRow}>
              <Icon name="moon" size={16} color={theme === 'dark' ? colors.accent : colors.textSecondary} />
              <Text style={[styles.themeBtnLabel, theme === 'dark' && { color: colors.accent }]}>
                {t('darkMode') || 'Dark'}
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setTheme('light')}
            android_ripple={{ color: colors.accent + '22' }}
            style={[styles.themeBtn, theme === 'light' && styles.themeBtnActive]}
          >
            <View style={[styles.themePreview, { backgroundColor: '#f5f7fb', borderColor: '#e2e8f0' }]}>
              <View style={[styles.themePreviewBar, { backgroundColor: '#2563eb' }]} />
              <View style={[styles.themePreviewCard, { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' }]} />
            </View>
            <View style={styles.themeBtnLabelRow}>
              <Icon name="sun" size={16} color={theme === 'light' ? colors.accent : colors.textSecondary} />
              <Text style={[styles.themeBtnLabel, theme === 'light' && { color: colors.accent }]}>
                {t('lightMode') || 'Light'}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Wilaya (region) */}
        <Text style={styles.sectionTitle}>{t('wilaya')}</Text>
        <Text style={styles.wilayaHint}>{t('wilayaHint')}</Text>
        <WilayaPicker
          t={t}
          current={settings.wilaya}
          onPick={(w) => { updateSettings({ wilaya: w }); showToast(t('saved'), 'success'); }}
        />

        {/* Thresholds */}
        <View style={{ marginTop: 16 }}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{t('thresholds')}</Text>
            <Pressable onPress={onResetThresholds} android_ripple={{ color: colors.accent + '22' }}>
              <Text style={styles.resetText}>{t('resetDefaults')}</Text>
            </Pressable>
          </View>

          <ThresholdSlider
            label={t('co2')} warnLabel={t('warnLevel')} dangerLabel={t('dangerLevel')}
            warn={thresholds.co2.warn} danger={thresholds.co2.danger}
            min={500} max={5000} step={100} unit="ppm"
            onChange={(v) => onThresholdChange('co2', v)}
          />
          <ThresholdSlider
            label={t('nh3')} warnLabel={t('warnLevel')} dangerLabel={t('dangerLevel')}
            warn={thresholds.nh3.warn} danger={thresholds.nh3.danger}
            min={5} max={80} step={1} unit="ppm"
            onChange={(v) => onThresholdChange('nh3', v)}
          />
          <ThresholdSlider
            label={t('temperature')} warnLabel={t('warnLevel')} dangerLabel={t('dangerLevel')}
            warn={thresholds.temp.warn} danger={thresholds.temp.danger}
            min={20} max={50} step={1} unit="°C"
            onChange={(v) => onThresholdChange('temp', v)}
          />
          <ThresholdSlider
            label={t('humidity')} warnLabel={t('warnLevel')} dangerLabel={t('dangerLevel')}
            warn={thresholds.hum.warn} danger={thresholds.hum.danger}
            min={30} max={100} step={1} unit="%"
            onChange={(v) => onThresholdChange('hum', v)}
          />
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>{t('alerts')}</Text>
        <ToggleRow
          label={t('alertSound')}
          value={!!settings.alertSound}
          onValueChange={(v) => updateSettings({ alertSound: v })}
        />
        <ToggleRow
          label={t('vibration')}
          value={!!settings.vibrate}
          onValueChange={(v) => updateSettings({ vibrate: v })}
        />

        {/* Emergency */}
        <Text style={styles.sectionTitle}>{t('emergencyContact')}</Text>
        <Field
          value={emergencyContact}
          onChangeText={setEmergencyContact}
          placeholder={t('emergencyContactPlaceholder')}
          keyboardType="phone-pad"
        />
        <PrimaryButton
          title={t('save')}
          icon="✓"
          variant="primary"
          onPress={onSaveContact}
          style={{ marginBottom: 10 }}
        />

        <View style={styles.testRow}>
          <PrimaryButton
            title={t('testCall')}
            icon="📞"
            variant="success"
            onPress={onTestCall}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            title={t('testAll')}
            icon="🧪"
            variant="warn"
            onPress={onTestAll}
            style={{ flex: 1 }}
          />
        </View>

        <Text style={styles.testHint}>
          {t('testAllHint')}
        </Text>

        <ToggleRow
          label={t('autoCall')}
          value={!!settings.autoCallOnDanger}
          onValueChange={(v) => updateSettings({ autoCallOnDanger: v, autoCall: v })}
        />
        <ToggleRow
          label={t('autoSms')}
          value={!!settings.autoSmsOnDanger}
          onValueChange={(v) => updateSettings({ autoSmsOnDanger: v })}
        />
        <ToggleRow
          label={t('autoCallPowerCut')}
          value={!!settings.autoCallOnPowerCut}
          onValueChange={(v) => updateSettings({ autoCallOnPowerCut: v })}
        />

        {/* Permissions */}
        <Text style={styles.sectionTitle}>{t('permissions')}</Text>
        <PermissionRow
          label={t('smsPermission')}
          granted={smsGranted}
          grantedLabel={t('granted')}
          deniedLabel={t('enable')}
          onPress={onRequestSms}
        />
        <PermissionRow
          label={t('sendSmsPermission')}
          granted={sendSmsGranted}
          grantedLabel={t('granted')}
          deniedLabel={t('enable')}
          onPress={onRequestSendSms}
        />
        <PermissionRow
          label={t('callPermission')}
          granted={callGranted}
          grantedLabel={t('granted')}
          deniedLabel={t('enable')}
          onPress={onRequestCall}
        />
        <PermissionRow
          label={t('notificationPermission')}
          granted={notifEnabled}
          deniedLabel={t('enable')}
          grantedLabel={t('granted')}
          onPress={onRequestNotif}
        />
        <PermissionRow
          label={t('batteryOptimization')}
          granted={batteryOk}
          grantedLabel={t('granted')}
          deniedLabel={t('enable')}
          hint={t('batteryOptimizationDesc')}
          onPress={onRequestBattery}
        />

        <Text style={styles.versionText}>
          Filaha Flock • {t('version')} 1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function PermissionRow({ label, granted, grantedLabel, deniedLabel, hint, onPress }) {
  const styles = useStyles(makeStyles);
  const isGranted = granted === true;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#1a2235' }}
      style={[styles.permRow, isGranted && styles.permRowOk]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.permLabel}>{label}</Text>
        {hint ? <Text style={styles.permHint}>{hint}</Text> : null}
      </View>
      <View style={[
        styles.permBadge,
        isGranted ? styles.permBadgeOk : styles.permBadgeBad,
      ]}>
        <Text style={[
          styles.permBadgeText,
          { color: isGranted ? colors.ok : colors.danger },
        ]}>
          {isGranted ? grantedLabel : deniedLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const makeStyles = () => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  screenTitle: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 18,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resetText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  langGrid: { gap: 8 },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 52,
  },
  langRowActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '14',
  },
  langText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  langTextActive: { color: colors.accent, fontWeight: '800' },
  langCheck: { color: colors.accent, fontSize: 18, fontWeight: '900' },

  themeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  themeBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
    gap: 10,
  },
  themeBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '12',
  },
  themePreview: {
    width: '100%',
    height: 68,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    gap: 6,
    justifyContent: 'flex-start',
  },
  themePreviewBar: {
    height: 6,
    width: '50%',
    borderRadius: 3,
  },
  themePreviewCard: {
    flex: 1,
    borderRadius: 6,
  },
  themeBtnLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  themeBtnLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  wilayaHint: {
    color: colors.textTertiary,
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 15,
  },

  testRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  testHint: {
    color: colors.textTertiary,
    fontSize: 11,
    marginBottom: 12,
    lineHeight: 16,
  },

  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    minHeight: 60,
  },
  permRowOk: {
    borderColor: colors.ok + '40',
  },
  permLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  permHint: { color: colors.textTertiary, fontSize: 11, marginTop: 3, lineHeight: 15 },
  permBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  permBadgeOk: { backgroundColor: colors.ok + '22', borderColor: colors.ok + '55' },
  permBadgeBad: { backgroundColor: colors.danger + '22', borderColor: colors.danger + '55' },
  permBadgeText: { fontSize: 11, fontWeight: '800' },
  versionText: {
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 28,
  },
});
