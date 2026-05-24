import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors } from '../utils/colors';
import { useStyles } from '../utils/useStyles';

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * A threshold control card.
 *
 * Single-direction sensor (CO2 / NH3): pass only warn + danger. The card
 * renders one block — "↑ if above" — with two rows.
 *
 * Bi-directional sensor (temp / hum): pass warn + danger AND warnLow +
 * dangerLow. The card renders two blocks — "↓ if below" then "↑ if above".
 *
 * Both shapes share the same visual rhythm, so every sensor card looks
 * finished and the trigger direction is obvious at a glance.
 */
export default function ThresholdSlider({
  label,
  warnLabel,
  dangerLabel,
  warnLowLabel,
  dangerLowLabel,
  whenAboveLabel,
  whenBelowLabel,
  warn,
  danger,
  warnLow,    // optional
  dangerLow,  // optional
  min,
  max,
  step = 1,
  unit,
  onChange,
}) {
  const styles = useStyles(makeStyles);
  const hasLow = warnLow != null && dangerLow != null;

  // Always include only the fields that actually exist for this sensor — no
  // undefined keys leaking into AppContext / Storage / state.
  const fireChange = (patch) => {
    const base = hasLow
      ? { warn, danger, warnLow, dangerLow }
      : { warn, danger };
    onChange({ ...base, ...patch });
  };

  const setWarn      = (v) => fireChange({ warn:      clamp(v, hasLow ? warnLow + step : min, danger - step) });
  const setDanger    = (v) => fireChange({ danger:    clamp(v, warn + step, max) });
  const setWarnLow   = (v) => fireChange({ warnLow:   clamp(v, dangerLow + step, warn - step) });
  const setDangerLow = (v) => fireChange({ dangerLow: clamp(v, min, warnLow - step) });

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{label}</Text>

      {hasLow ? (
        <View style={styles.block}>
          <Text style={styles.sectionLabel}>↓ {whenBelowLabel || 'If below'}</Text>
          <Row
            color={colors.warn} label={warnLowLabel || 'Warn low'}
            value={warnLow} unit={unit}
            onMinus={() => setWarnLow(warnLow - step)}
            onPlus={() => setWarnLow(warnLow + step)}
            styles={styles}
          />
          <Row
            color={colors.danger} label={dangerLowLabel || 'Danger low'}
            value={dangerLow} unit={unit}
            onMinus={() => setDangerLow(dangerLow - step)}
            onPlus={() => setDangerLow(dangerLow + step)}
            styles={styles}
          />
        </View>
      ) : null}

      <View style={[styles.block, hasLow && styles.blockGap]}>
        <Text style={styles.sectionLabel}>↑ {whenAboveLabel || 'If above'}</Text>
        <Row
          color={colors.warn} label={warnLabel}
          value={warn} unit={unit}
          onMinus={() => setWarn(warn - step)}
          onPlus={() => setWarn(warn + step)}
          styles={styles}
        />
        <Row
          color={colors.danger} label={dangerLabel}
          value={danger} unit={unit}
          onMinus={() => setDanger(danger - step)}
          onPlus={() => setDanger(danger + step)}
          styles={styles}
        />
      </View>
    </View>
  );
}

function Row({ color, label, value, unit, onMinus, onPlus, styles }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.subLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.controls}>
        <Pressable
          onPress={onMinus}
          android_ripple={{ color: '#ffffff22', borderless: true }}
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel={`${label} −`}
        ><Text style={styles.btnText}>−</Text></Pressable>
        <Text style={styles.value}>{value}{unit ? ` ${unit}` : ''}</Text>
        <Pressable
          onPress={onPlus}
          android_ripple={{ color: '#ffffff22', borderless: true }}
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel={`${label} +`}
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
  block: {
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  blockGap: { marginTop: 10 },
  sectionLabel: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '700',
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
    marginEnd: 10,
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
    backgroundColor: colors.card,
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
