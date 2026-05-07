import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

export default function Pulse({
  active = true,
  color = '#ef4444',
  children,
  style,
  intensity = 0.45,
  borderRadius = 18,
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      opacity.setValue(0);
      scale.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: intensity,
            duration: 850,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 850,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.015,
            duration: 850,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 850,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [active, opacity, scale, intensity]);

  return (
    <Animated.View style={[style, active ? { transform: [{ scale }] } : null]}>
      {children}
      {active && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -2,
            right: -2,
            top: -2,
            bottom: -2,
            borderRadius: borderRadius + 2,
            borderWidth: 2,
            borderColor: color,
            opacity,
          }}
        />
      )}
    </Animated.View>
  );
}
