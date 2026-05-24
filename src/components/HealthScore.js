import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import Icon from './Icon';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Farmer-friendly status ring.
 *
 * Drops the abstract "0–100 health score" entirely — a farmer thinks
 * "how many of my coops need me right now?", not "what's my farm score."
 *
 * Visual:
 *   • Ring colour    → worst current status (red / amber / green / muted)
 *   • Ring fill      → fraction of coops that are OK
 *   • Center content → BIG number of coops needing attention
 *                      or ✓ when all fine
 *                      or feather icon when there are no coops yet
 *
 * Props:
 *   counts   { total, ok, attention, danger }   ← required
 *   size, strokeWidth                           ← visual
 */
export default function HealthScore({
  counts = { total: 0, ok: 0, attention: 0, danger: 0 },
  size = 88,
  strokeWidth = 8,
}) {
  const styles = useStyles(makeStyles);

  const total     = Math.max(0, counts.total | 0);
  const ok        = Math.max(0, counts.ok | 0);
  const attention = Math.max(0, counts.attention | 0);
  const danger    = Math.max(0, counts.danger | 0);
  const problems  = attention + danger;
  const fraction  = total > 0 ? Math.min(1, ok / total) : 0;

  // Worst status → ring colour.
  const tint =
      total === 0 ? colors.textTertiary
    : danger > 0  ? colors.danger
    : attention > 0 ? colors.warn
    : colors.ok;

  const radius        = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: fraction,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [fraction, progress]);

  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  // Center number scales with the ring so it never crowds the stroke.
  const numSize = Math.round(size * 0.40);

  let center;
  if (total === 0) {
    center = (
      <Icon name="feather" size={Math.round(size * 0.4)} color={tint} strokeWidth={2.2} />
    );
  } else if (problems === 0) {
    center = (
      <Text style={[styles.check, { color: tint, fontSize: Math.round(size * 0.5) }]}>
        ✓
      </Text>
    );
  } else {
    center = (
      <Text
        style={[styles.number, { color: tint, fontSize: numSize, lineHeight: numSize + 2 }]}
      >
        {problems}
      </Text>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={colors.border} strokeWidth={strokeWidth} fill="none"
        />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={tint}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>{center}</View>
    </View>
  );
}

const makeStyles = () => ({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { fontWeight: '900' },
  check:  { fontWeight: '900', lineHeight: undefined },
});
