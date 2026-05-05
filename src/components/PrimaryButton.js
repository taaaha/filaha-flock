import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../utils/colors';

export default function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  icon,
  style,
}) {
  const palette = {
    primary: { bg: colors.accent, fg: '#ffffff' },
    danger: { bg: colors.danger, fg: '#ffffff' },
    success: { bg: colors.ok, fg: '#ffffff' },
    warn: { bg: colors.warn, fg: '#0a0f1e' },
    ghost: { bg: 'transparent', fg: colors.accent, border: colors.accent },
    subtle: { bg: colors.card, fg: colors.textPrimary, border: colors.border },
  }[variant] || { bg: colors.accent, fg: '#ffffff' };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      android_ripple={{ color: '#ffffff22' }}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border || palette.bg,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Text style={[styles.icon, { color: palette.fg }]}>{icon}</Text> : null}
          <Text style={[styles.label, { color: palette.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
