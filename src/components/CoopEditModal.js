import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, Modal, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import Field from './Field';
import PrimaryButton from './PrimaryButton';
import { BREEDS, STRAINS_BY_BREED, strainLabel } from '../utils/poultryData';

function ageDaysOf(device) {
  if (!device?.chickArrivalDate) return 0;
  const ms = Date.now() - device.chickArrivalDate;
  if (ms < 0) return 0;
  return Math.floor(ms / 86400000) + 1;
}

/**
 * Edit an existing coop. Mirrors the add-coop form but the device id is
 * fixed (it identifies the hardware) — only the editable attributes change.
 */
export default function CoopEditModal({ visible, device, t, onClose, onSave }) {
  const styles = useStyles(makeStyles);
  const [name, setName] = useState('');
  const [chickAge, setChickAge] = useState('');
  const [breed, setBreed] = useState('broiler');
  const [strain, setStrain] = useState(null);

  // Re-seed the form every time it opens for a device.
  useEffect(() => {
    if (!visible || !device) return;
    setName(device.name || '');
    setChickAge(String(ageDaysOf(device)));
    setBreed(device.breed || 'broiler');
    setStrain(device.strain || STRAINS_BY_BREED[device.breed || 'broiler']?.[0] || null);
  }, [visible, device]);

  const onBreedChange = (b) => {
    setBreed(b);
    const first = STRAINS_BY_BREED[b]?.[0];
    setStrain(first || null);
  };

  const onSubmit = () => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const ageNum = parseInt(chickAge, 10);
    onSave({
      name: cleanName,
      chickAgeDays: Number.isFinite(ageNum) ? ageNum : 0,
      breed,
      strain,
    });
  };

  if (!device) return null;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.backdrop}
      >
        <View style={styles.card}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('editCoop') || 'Edit coop'}</Text>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {/* Device id is fixed hardware identity — shown, not editable */}
            <View style={styles.idChip}>
              <Text style={styles.idLabel}>{t('deviceId') || 'Device ID'}</Text>
              <Text style={styles.idValue}>{device.id}</Text>
            </View>

            <Field
              label={t('coopName')}
              value={name}
              onChangeText={setName}
              placeholder={t('coopNamePlaceholder')}
            />
            <Field
              label={t('chickAgeLabel')}
              value={chickAge}
              onChangeText={(v) => setChickAge(v.replace(/[^0-9]/g, '').slice(0, 3))}
              placeholder="0"
              keyboardType="number-pad"
              hint={t('chickAgeHint')}
              maxLength={3}
            />

            <Text style={styles.formLabel}>{t('chickenType')}</Text>
            <View style={styles.breedRow}>
              {BREEDS.filter((b) => b !== 'mixed').map((b) => (
                <Pressable
                  key={b}
                  onPress={() => onBreedChange(b)}
                  android_ripple={{ color: colors.accent + '22' }}
                  style={[styles.chip, breed === b && styles.chipActive]}
                >
                  <Text style={[styles.chipText, breed === b && styles.chipTextActive]}>
                    {t(b)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.formLabel}>{t('strain')}</Text>
            <View style={styles.strainGrid}>
              {(STRAINS_BY_BREED[breed] || []).map((id) => (
                <Pressable
                  key={id}
                  onPress={() => setStrain(id)}
                  android_ripple={{ color: colors.accent + '22' }}
                  style={[styles.strainChip, strain === id && styles.chipActive]}
                >
                  <Text style={[styles.chipText, strain === id && styles.chipTextActive]}>
                    {strainLabel(id)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <PrimaryButton
              title={t('cancel')}
              variant="subtle"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              title={t('save')}
              icon="✓"
              onPress={onSubmit}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
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
    padding: 22,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 42, height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    marginBottom: 16,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 16,
  },
  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  idLabel: {
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: '600',
  },
  idValue: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    writingDirection: 'ltr',
  },
  formLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 6,
  },
  breedRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  strainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  strainChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '14',
  },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: colors.accent },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
});
