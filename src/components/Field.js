import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';
import { useStyles } from '../utils/useStyles';

export default function Field({
  label, value, onChangeText, placeholder, hint,
  keyboardType, maxLength, autoCapitalize,
}) {
  const styles = useStyles(makeStyles);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, focused && { color: colors.accent }]}>
          {label}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize || 'sentences'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          focused && styles.inputFocused,
        ]}
        underlineColorAndroid="transparent"
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const makeStyles = () => ({
  wrap: { marginBottom: 14 },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 12,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
    minHeight: 52,
  },
  inputFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.cardElevated,
  },
  hint: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
});
