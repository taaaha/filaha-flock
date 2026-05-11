import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors } from '../utils/colors';
import { useStyles } from '../utils/useStyles';

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export default function ThresholdSlider({
  label,
  warnLabel,
  dangerLabel,
  warnLowLabel,
  dangerLowLabel,
  warn,
  danger,
  warnLow,    // optional: low warning threshold
  dangerLow,  // optional: low danger threshold
  min,
  max,
  step = 1,
  unit,
  onChange,
}) {
  const styles = useStyles(makeStyles);

  const hasLow = warnLow != null && dangerLow != null;

  const setWarn = (v) => onChange({ warn: clamp(v, (warnLow != null ? warnLow + step : min), danger - step), danger, warnLow, dangerLow });
  const setDanger = (v) => onChange({ warn, danger: clamp(v, warn + step, max), warnLow, dangerLow });
  const setWarnLow = (v) => onChange({ warn, danger, warnLow: clamp(v, dangerLow + step, warn - step), dangerLow });
  const setDangerLow = (v) => onChange({ warn, danger, warnLow, dangerLow: clamp(v, min, warnLow - step) });

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{label}</Text>

      {hasLow ? (
        <>
          <Text style={styles.sectionLabel}>↓ {warnLowLabel || 'Below'}</Text>
          <Row
            color={colors.danger} label={dangerLowLabel || 'Danger low'}
            value={dangerLow} unit={unit} step={step}
            onMinus={() => setDangerLow(dangerLow - step)}
            onPlus={() => setDangerLow(dangerLow + step)}
            styles={styles}
          />
          <Row
            color={colors.warn} label={warnLowLabel || 'Warn low'}
            value={warnLow} unit={unit} step={step}
            onMinus={() => setWarnLow(warnLow - step)}
            onPlus={() => setWarnLow(warnLow + step)}
            styles={styles}
          />
          <Text style={styles.sectionLabel}>↑ {warnLabel}</Text>
        </>
      ) : null}

      <Row
        color={colors.warn} label={warnLabel}
        value={warn} unit={unit} step={step}
        onMinus={() => setWarn(warn - step)}
        onPlus={() => setWarn(warn + step)}
        styles={styles}
      />
      <Row
        color={colors.danger} label={dangerLabel}
        value={danger} unit={unit} step={step}
        onMinus={() => setDanger(danger - step)}
        onPlus={() => setDanger(danger + step)}
        styles={styles}
      />
    </View>
  );
}

function Row({ color, label, value, unit, onMinus, onPlus, styles }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.subLabel}>{label}</Text>
      <View style={styles.controls}>
        <Pressable
          onPress={onMinus}
          android_ripple={{ color: '#ffffff22', borderless: true }}
          style={styles.btn}
        ><Text style={styles.btnText}>−</Text></Pressable>
        <Text style={styles.value}>{value}{unit ? ` ${unit}` : ''}</Text>
        <Pressable
          onPress={onPlus}
          android_ripple={{ color: '#ffffff22', borderless: true }}
          style={styles.btn}
        ><Text style={styles.btnText}>+</Text></Pressable>
      </View>
    </View>
  );
}

const makeStyles = () => ({
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
    fontWeight: '800',
    marginBottom: 10,
  },
  sectionLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
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
    fontWeight: '600',
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
    fontWeight: '800',
    minWidth: 92,
    textAlign: 'center',
  },
});
