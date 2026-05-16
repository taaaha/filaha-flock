import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { colors } from '../utils/colors';
import { useStyles } from '../utils/useStyles';

/**
 * Subtle pulsing placeholder for loading content.
 * Drop in where you'd otherwise show empty space while data loads.
 */
export default function Skeleton({ width = '100%', height = 16, radius = 8, style }) {
  const styles = useStyles(makeStyles);
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

const makeStyles = () => ({
  skeleton: {
    backgroundColor: colors.cardElevated,
  },
});
