import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Pressable, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { colors } from '../utils/colors';
import { LANGS } from '../translations';
import {
  isIgnoringBatteryOptimizations,
  requestIgnoreBatteryOptimizations,
  checkSmsPermission,
  requestSmsPermissions,
  checkCallPermission,
  requestCallPermission,
  requestNotificationPermission,
} from '../services/SmsService';
import Field from '../components/Field';
import ToggleRow from '../components/ToggleRow';
import ThresholdSlider from '../components/ThresholdSlider';
import PrimaryButton from '../components/PrimaryButton';
import { makePhoneCall } from '../services/CallService';

export default function SettingsScreen() {
  const {
    t, language, settings, thresholds,
    setLanguage, updateSettings, updateThresholds, resetThresholds,
  } = useApp();

  const [farmerName, setFarmerName] = useState(settings.farmerName || '');
  const [farmName, setFarmName] = useState(settings.farmName || '');
  const [emergencyContact, setEmergencyContact] = useState(settings.emergencyContact || '');
  const [smsGranted, setSmsGranted] = useState(false);
  const [callGranted, setCallGranted] = useState(false);
  const [batteryOk, setBatteryOk] = useState(true);

  useEffect(() => { setFarmerName(settings.farmerName || ''); }, [settings.farmerName]);
  useEffect(() => { setFarmName(settings.farmName || ''); }, [settings.farmName]);
  useEffect(() => { setEmergencyContact(settings.emergencyContact || ''); }, [settings.emergencyContact]);

  useEffect(() => {
    refreshPermissions();
  }, []);

  const refreshPermissions = async () => {
    const sms = await checkSmsPermission();
    const call = await checkCallPermission();
    const battery = await isIgnoringBatteryOptimizations();
    setSmsGranted(sms);
    setCallGranted(call);
    setBatteryOk(battery);
  };

  const onSaveProfile = () => {
    updateSettings({
      farmerName: farmerName.trim(),
      farmName: farmName.trim(),
    });
  };

  const onSaveContact = () => {
    updateSettings({ emergencyContact: emergencyContact.trim() });
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
      { text: t('done'), onPress: () => resetThresholds() },
    ]);
  };

  const onTestCall = async () => {
    const num = (emergencyContact || settings.emergencyContact || '').trim();
    if (!num) {
      Alert.alert(t('callEmergency'), t('emergencyContact'));
      return;
    }
    const ok = await makePhoneCall(num);
    if (!ok) Alert.alert(t('callEmergency'), '✗');
  };

  const onRequestSms = async () => {
    await requestSmsPermissions();
    refreshPermissions();
  };
  const onRequestCall = async () => {
    await requestCallPermission();
    refreshPermissions();
  };
  const onRequestNotif = async () => {
    await requestNotificationPermission();
    refreshPermissions();
  };
  const onRequestBattery = async () => {
    await requestIgnoreBatteryOptimizations();
    setTimeout(refreshPermissions, 1000);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
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
              style={[
                styles.langRow,
                language === code && styles.langRowActive,
              ]}
            >
              <Text style={[
                styles.langText,
                language === code && styles.langTextActive,
              ]}>
                {LANGS[code].name}
              </Text>
              {language === code ? (
                <Text style={styles.langCheck}>✓</Text>
              ) : null}
            </Pressable>
          ))}
        </View>

        {/* Thresholds */}
        <View style={{ marginTop: 16 }}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{t('thresholds')}</Text>
            <Pressable onPress={onResetThresholds}>
              <Text style={styles.resetText}>{t('resetDefaults')}</Text>
            </Pressable>
          </View>

          <ThresholdSlider
            label={t('co2')}
            warnLabel={t('warnLevel')}
            dangerLabel={t('dangerLevel')}
            warn={thresholds.co2.warn}
            danger={thresholds.co2.danger}
            min={500}
            max={5000}
            step={100}
            unit="ppm"
            onChange={(v) => updateThresholds({ co2: v })}
          />
          <ThresholdSlider
            label={t('nh3')}
            warnLabel={t('warnLevel')}
            dangerLabel={t('dangerLevel')}
            warn={thresholds.nh3.warn}
            danger={thresholds.nh3.danger}
            min={5}
            max={80}
            step={1}
            unit="ppm"
            onChange={(v) => updateThresholds({ nh3: v })}
          />
          <ThresholdSlider
            label={t('temperature')}
            warnLabel={t('warnLevel')}
            dangerLabel={t('dangerLevel')}
            warn={thresholds.temp.warn}
            danger={thresholds.temp.danger}
            min={20}
            max={50}
            step={1}
            unit="°C"
            onChange={(v) => updateThresholds({ temp: v })}
          />
          <ThresholdSlider
            label={t('humidity')}
            warnLabel={t('warnLevel')}
            dangerLabel={t('dangerLevel')}
            warn={thresholds.hum.warn}
            danger={thresholds.hum.danger}
            min={30}
            max={100}
            step={1}
            unit="%"
            onChange={(v) => updateThresholds({ hum: v })}
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
          label={t('emergencyContact')}
          value={emergencyContact}
          onChangeText={setEmergencyContact}
          placeholder={t('emergencyContactPlaceholder')}
          keyboardType="phone-pad"
        />
        <PrimaryButton
          title={t('save')}
          variant="primary"
          onPress={onSaveContact}
          style={{ marginBottom: 8 }}
        />
        <PrimaryButton
          title={t('testCall')}
          icon="📞"
          variant="success"
          onPress={onTestCall}
          style={{ marginBottom: 12 }}
        />
        <ToggleRow
          label={t('autoCall')}
          value={!!settings.autoCallOnDanger}
          onValueChange={(v) => updateSettings({ autoCallOnDanger: v, autoCall: v })}
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
          t={t}
        />
        <PermissionRow
          label={t('callPermission')}
          granted={callGranted}
          grantedLabel={t('granted')}
          deniedLabel={t('enable')}
          onPress={onRequestCall}
          t={t}
        />
        <PermissionRow
          label={t('notificationPermission')}
          granted={null}
          deniedLabel={t('enable')}
          grantedLabel={t('granted')}
          onPress={onRequestNotif}
          t={t}
        />
        <PermissionRow
          label={t('batteryOptimization')}
          granted={batteryOk}
          grantedLabel={t('granted')}
          deniedLabel={t('enable')}
          hint={t('batteryOptimizationDesc')}
          onPress={onRequestBattery}
          t={t}
        />

        <Text style={styles.versionText}>
          {t('version')}: 1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function PermissionRow({ label, granted, grantedLabel, deniedLabel, hint, onPress }) {
  const isGranted = granted === true;
  const showStatus = granted !== null && granted !== undefined;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#1a2235' }}
      style={styles.permRow}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.permLabel}>{label}</Text>
        {hint ? <Text style={styles.permHint}>{hint}</Text> : null}
      </View>
      <View style={[
        styles.permBadge,
        showStatus ? (isGranted ? styles.permBadgeOk : styles.permBadgeBad) : styles.permBadgeNeutral,
      ]}>
        <Text style={[
          styles.permBadgeText,
          { color: showStatus ? (isGranted ? colors.ok : colors.danger) : colors.accent },
        ]}>
          {showStatus ? (isGranted ? grantedLabel : deniedLabel) : deniedLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  screenTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 14,
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
    fontWeight: '700',
  },
  langGrid: { gap: 8, marginBottom: 8 },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 50,
  },
  langRowActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '11',
  },
  langText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  langTextActive: { color: colors.accent },
  langCheck: { color: colors.accent, fontSize: 18, fontWeight: '900' },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    minHeight: 56,
  },
  permLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  permHint: { color: colors.textTertiary, fontSize: 11, marginTop: 2 },
  permBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  permBadgeOk: { backgroundColor: colors.ok + '22', borderColor: colors.ok + '55' },
  permBadgeBad: { backgroundColor: colors.danger + '22', borderColor: colors.danger + '55' },
  permBadgeNeutral: { backgroundColor: colors.accent + '22', borderColor: colors.accent + '55' },
  permBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  versionText: {
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
});
