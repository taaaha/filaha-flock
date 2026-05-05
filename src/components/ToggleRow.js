import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';

export default function ToggleRow({ label, hint, value, onValueChange, disabled }) {
  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={!!value}
        onValueChange={onValueChange}
        disabled={disabled}
        thumbColor={value ? colors.accent : '#888'}
        trackColor={{ false: '#374151', true: colors.accent + '99' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    minHeight: 56,
  },
  textCol: {
    flex: 1,
    paddingRight: 10,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
  },
});
