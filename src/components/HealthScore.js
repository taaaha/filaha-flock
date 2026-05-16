import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import { healthTier } from '../utils/farmHealth';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function HealthScore({ score, label, t, size = 88, strokeWidth = 9 }) {
  const styles = useStyles(makeStyles);
  const tier = healthTier(score, colors);
  const value = score == null ? 0 : score;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value / 100,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, progress]);

  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={tier.color + '22'} strokeWidth={strokeWidth} fill="none"
        />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={tier.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        {score != null ? (
          <>
            <Text style={[styles.value, { color: tier.color }]}>{Math.round(score)}</Text>
            <Text style={styles.suffix}>/100</Text>
          </>
        ) : (
          <Text style={styles.empty}>—</Text>
        )}
      </View>
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
  value: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, lineHeight: 28 },
  suffix: { color: colors.textTertiary, fontSize: 10, fontWeight: '700', marginTop: -2 },
  empty: { color: colors.textTertiary, fontSize: 20, fontWeight: '900' },
});
