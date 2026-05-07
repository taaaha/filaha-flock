import React, { useEffect, useRef, useState } from 'react';
import { Animated, DeviceEventEmitter, StyleSheet, Text, View } from 'react-native';
import { colors } from '../utils/colors';

const TOAST_EVENT = 'FilahaToast';

export function showToast(message, type = 'success') {
  if (!message) return;
  DeviceEventEmitter.emit(TOAST_EVENT, { message: String(message), type });
}

const PALETTES = {
  success: { bg: colors.ok,     fg: '#fff',     icon: '✓' },
  error:   { bg: colors.danger, fg: '#fff',     icon: '✕' },
  info:    { bg: colors.accent, fg: '#fff',     icon: 'ℹ' },
  warn:    { bg: colors.warn,   fg: '#0a0f1e',  icon: '⚠' },
};

export default function ToastHost() {
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(60)).current;
  const hideTimer = useRef(null);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(TOAST_EVENT, (data) => {
      setToast(data);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 220, useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0, useNativeDriver: true, friction: 7, tension: 80,
      }),
    ]).start();

    hideTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0, duration: 220, useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 60, duration: 220, useNativeDriver: true,
        }),
      ]).start(() => setToast(null));
    }, 2200);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [toast, opacity, translateY]);

  if (!toast) return null;
  const palette = PALETTES[toast.type] || PALETTES.success;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.host, { opacity, transform: [{ translateY }] }]}
    >
      <View style={[styles.toast, { backgroundColor: palette.bg }]}>
        <View style={styles.iconBox}>
          <Text style={[styles.icon, { color: palette.fg }]}>{palette.icon}</Text>
        </View>
        <Text style={[styles.message, { color: palette.fg }]} numberOfLines={2}>
          {toast.message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    bottom: 96,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 16,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 180,
    maxWidth: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
  },
  iconBox: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 15, fontWeight: '900' },
  message: { fontSize: 14, fontWeight: '700', flex: 1 },
});
