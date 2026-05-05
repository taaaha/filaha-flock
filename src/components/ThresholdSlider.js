import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export default function ThresholdSlider({
  label,
  warnLabel,
  dangerLabel,
  warn,
  danger,
  min,
  max,
  step = 1,
  unit,
  onChange,
}) {
  const setWarn = (v) => onChange({ warn: clamp(v, min, danger - step), danger });
  const setDanger = (v) => onChange({ warn, danger: clamp(v, warn + step, max) });

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{label}</Text>

      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: colors.warn }]} />
        <Text style={styles.subLabel}>{warnLabel}</Text>
        <View style={styles.controls}>
          <Pressable
            onPress={() => setWarn(warn - step)}
            android_ripple={{ color: '#ffffff22', borderless: true }}
            style={styles.btn}
          ><Text style={styles.btnText}>−</Text></Pressable>
          <Text style={styles.value}>{warn}{unit ? ` ${unit}` : ''}</Text>
          <Pressable
            onPress={() => setWarn(warn + step)}
            android_ripple={{ color: '#ffffff22', borderless: true }}
            style={styles.btn}
          ><Text style={styles.btnText}>+</Text></Pressable>
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: colors.danger }]} />
        <Text style={styles.subLabel}>{dangerLabel}</Text>
        <View style={styles.controls}>
          <Pressable
            onPress={() => setDanger(danger - step)}
            android_ripple={{ color: '#ffffff22', borderless: true }}
            style={styles.btn}
          ><Text style={styles.btnText}>−</Text></Pressable>
          <Text style={styles.value}>{danger}{unit ? ` ${unit}` : ''}</Text>
          <Pressable
            onPress={() => setDanger(danger + step)}
            android_ripple={{ color: '#ffffff22', borderless: true }}
            style={styles.btn}
          ><Text style={styles.btnText}>+</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  subLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  value: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    minWidth: 90,
    textAlign: 'center',
  },
});
