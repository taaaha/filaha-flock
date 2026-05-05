import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

export default function Pulse({ active = true, color = '#ef4444', children, style, intensity = 0.4 }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      opacity.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: intensity,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [active, opacity, intensity]);

  return (
    <View style={style}>
      {children}
      {active && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: color,
            opacity,
            borderRadius: 16,
          }}
        />
      )}
    </View>
  );
}
