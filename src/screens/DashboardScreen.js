import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { colors, STATUS } from '../utils/colors';
import { deviceStatus, statusPriority } from '../utils/thresholds';
import { buildFakeDataSms } from '../utils/smsParser';
import CoopCard from '../components/CoopCard';
import SummaryBar from '../components/SummaryBar';
import PrimaryButton from '../components/PrimaryButton';
import Field from '../components/Field';

export default function DashboardScreen({ navigation }) {
  const {
    t,
    devices,
    settings,
    thresholds,
    powerCut,
    lastReadingFor,
    addDevice,
    injectMessage,
    now,
  } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [coopName, setCoopName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [error, setError] = useState('');

  const augmented = useMemo(() => {
    return devices.map((d) => {
      const reading = lastReadingFor(d.id);
      const isPowerCut = !!powerCut[d.id];
      const status = deviceStatus(d, reading, thresholds, now, isPowerCut);
      return { device: d, reading, status };
    });
  }, [devices, lastReadingFor, thresholds, powerCut, now]);

  const sorted = useMemo(() => {
    return [...augmented].sort(
      (a, b) => statusPriority(a.status) - statusPriority(b.status)
    );
  }, [augmented]);

  const counts = useMemo(() => {
    let ok = 0, warn = 0, danger = 0, offline = 0;
    augmented.forEach((it) => {
      switch (it.status) {
        case STATUS.OK: ok++; break;
        case STATUS.WARN: warn++; break;
        case STATUS.DANGER: case STATUS.POWER_CUT: danger++; break;
        case STATUS.OFFLINE: offline++; break;
        default: break;
      }
    });
    return { total: augmented.length, ok, warn, danger, offline };
  }, [augmented]);

  const farmName = (settings && settings.farmName) || t('appName');

  const onTestSms = () => {
    if (devices.length === 0) {
      Alert.alert(t('appName'), t('noCoopsYet'));
      return;
    }
    const target = sorted[0]?.device || devices[0];
    const message = buildFakeDataSms(target.id, {
      co2: 800 + Math.floor(Math.random() * 200),
      nh3: 2 + Math.random() * 3,
      temp: 27 + Math.random() * 3,
      hum: 58 + Math.random() * 8,
      bat: 70 + Math.floor(Math.random() * 25),
    });
    injectMessage(message, false);
  };

  const onSubmitNew = async () => {
    setError('');
    const cleanedId = deviceId.trim().toUpperCase();
    const cleanedName = coopName.trim();
    if (!cleanedId) { setError(t('deviceIdHint')); return; }
    if (!cleanedName) { setError(t('coopName')); return; }
    const result = await addDevice({ name: cleanedName, deviceId: cleanedId });
    if (!result.ok) {
      setError(t('deviceId') + ' ✗');
      return;
    }
    setCoopName('');
    setDeviceId('');
    setModalVisible(false);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>🐔</Text>
          <View>
            <Text style={styles.appName} numberOfLines={1}>{t('appName')}</Text>
            <Text style={styles.farmName} numberOfLines={1}>{farmName}</Text>
          </View>
        </View>
        <Pressable
          onPress={onTestSms}
          android_ripple={{ color: '#1a2235' }}
          style={styles.simBtn}
        >
          <Text style={styles.simBtnIcon}>📡</Text>
          <Text style={styles.simBtnText}>{t('testSms')}</Text>
        </Pressable>
      </View>

      <SummaryBar counts={counts} t={t} />

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.device.id}
        renderItem={({ item }) => (
          <CoopCard
            device={item.device}
            reading={item.reading}
            status={item.status}
            thresholds={thresholds}
            t={t}
            now={now}
            onPress={() => navigation.navigate('CoopDetail', { deviceId: item.device.id })}
          />
        )}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🐔</Text>
            <Text style={styles.emptyTitle}>{t('noCoopsYet')}</Text>
            <Text style={styles.emptyHint}>{t('noCoopsHint')}</Text>
          </View>
        }
      />

      <Pressable
        onPress={() => setModalVisible(true)}
        android_ripple={{ color: '#ffffff33', borderless: true }}
        style={styles.fab}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('addNewCoop')}</Text>
            <Field
              label={t('coopName')}
              value={coopName}
              onChangeText={setCoopName}
              placeholder={t('coopNamePlaceholder')}
            />
            <Field
              label={t('deviceId')}
              value={deviceId}
              onChangeText={(v) => setDeviceId(v.toUpperCase())}
              placeholder={t('deviceIdPlaceholder')}
              autoCapitalize="characters"
              hint={t('deviceIdHint')}
              maxLength={32}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.modalActions}>
              <PrimaryButton
                title={t('cancel')}
                variant="subtle"
                onPress={() => { setModalVisible(false); setError(''); }}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title={t('add')}
                onPress={onSubmitNew}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  logo: {
    fontSize: 30,
  },
  appName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  farmName: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  simBtnIcon: { fontSize: 14 },
  simBtnText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyHint: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabIcon: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 32,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
});
