import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Modal } from 'react-native';
import { useApp } from '../contexts/AppContext';
import { colors } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import { regionsOf, regionName, regionLabel } from '../utils/regions';

// ─────────────────────────────────────────────────────────────────────
// A searchable region sheet that works for any country we serve.
//
// Search matches the local name, the English name and the numeric code, so
// "niedersachsen", "lower saxony" and "01" all find the same state — and an
// Arabic speaker can type "الشحانية" and land on Al Shahaniya. Algeria's 58
// wilayas make search mandatory rather than a nicety.
// ─────────────────────────────────────────────────────────────────────
export default function RegionPicker({ visible, onClose, country, value, onSelect }) {
  const styles = useStyles(makeStyles);
  const { t, language } = useApp();
  const [query, setQuery] = useState('');

  const regions = useMemo(() => regionsOf(country), [country]);
  const list = useMemo(() => {
    const raw = query.trim();
    const q = raw.toLowerCase();
    if (!q) return regions;
    return regions.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      (r.en || '').toLowerCase().includes(q) ||
      (r.ar || '').includes(raw) ||
      String(r.code) === q
    );
  }, [regions, query]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>
            {t('pickRegionLabel', { label: regionLabel(country, language) })}
          </Text>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchRegion')}
            placeholderTextColor={colors.textTertiary}
          />
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {list.length === 0 ? (
              <Text style={styles.noResults}>{t('noResults')}</Text>
            ) : list.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => { setQuery(''); onSelect(r.id); }}
                android_ripple={{ color: colors.accent + '22' }}
                style={[styles.item, value === r.id && styles.itemActive]}
              >
                <Text style={styles.code}>{String(r.code).padStart(2, '0')}</Text>
                <Text style={[styles.name, value === r.id && styles.nameActive]}>
                  {regionName(r, language)}
                </Text>
                {value === r.id ? <Text style={styles.tick}>✓</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = () => ({
  backdrop: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center', marginTop: 10, marginBottom: 14,
  },
  title: {
    color: colors.textPrimary, fontSize: 18, fontWeight: '800',
    marginBottom: 12, textAlign: 'center',
  },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    color: colors.textPrimary, fontSize: 15, marginBottom: 10,
  },
  list: { maxHeight: 420 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 10, borderRadius: 12,
  },
  itemActive: { backgroundColor: colors.cardElevated },
  code: { color: colors.textTertiary, fontSize: 13, fontWeight: '800', minWidth: 26 },
  name: { color: colors.textSecondary, fontSize: 16, fontWeight: '700', flex: 1 },
  nameActive: { color: colors.accent },
  tick: { color: colors.accent, fontSize: 17, fontWeight: '800' },
  noResults: {
    color: colors.textTertiary, textAlign: 'center',
    paddingVertical: 24, fontSize: 15,
  },
});
