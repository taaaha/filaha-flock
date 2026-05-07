import React, { useRef } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, View, Animated } from 'react-native';
import { colors, shadows } from '../utils/colors';

const PALETTES = {
  primary: { bg: colors.accent, fg: '#ffffff', glow: colors.accent },
  danger:  { bg: colors.danger, fg: '#ffffff', glow: colors.danger },
  success: { bg: colors.ok,     fg: '#ffffff', glow: colors.ok },
  warn:    { bg: colors.warn,   fg: '#0a0f1e', glow: colors.warn },
  ghost:   { bg: 'transparent', fg: colors.accent, border: colors.accent + '60' },
  subtle:  { bg: colors.card,   fg: colors.textPrimary, border: colors.border },
};

export default function PrimaryButton({
  title, onPress, disabled, loading,
  variant = 'primary', icon, style,
}) {
  const palette = PALETTES[variant] || PALETTES.primary;
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, friction: 7 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();

  const showGlow = palette.glow && !disabled && !palette.border;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, showGlow && shadows.glow(palette.glow), style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        android_ripple={{ color: '#ffffff22' }}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border || palette.bg,
            opacity: disabled ? 0.5 : pressed ? 0.95 : 1,
          },
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  icon: { fontSize: 17 },
  label: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
});
