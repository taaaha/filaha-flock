import React, { useRef, useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Ellipse, Path, Polygon, G } from 'react-native-svg';
import { STATUS } from '../utils/colors';

/**
 * The Filaha chick — a little character that lives across the app and changes
 * its FACE with status. Personality is language-agnostic (nothing to translate
 * for ar/fr/en), which is exactly what a friendly farm app needs.
 *
 *   ok       → happy  (smiling eyes, rosy cheeks)
 *   warn     → worried (dot eyes, slanted brows)
 *   danger   → alarmed (wide eyes, open beak) + a worried wiggle when animated
 *   powerCut → alarmed
 *   offline  → sleepy  (closed eyes)
 *
 * Pass `animated` to give it a gentle idle float (used on the big hero spots:
 * header, briefing, empty state, onboarding). Card mascots stay still so a long
 * list doesn't shimmer.
 *
 * Body colors are fixed warm/cream so the chick always reads clearly on top of
 * any status wash, in both light and dark themes.
 */

const BODY = '#fff7ec';
const BODY_SHADE = '#f4e3c6';
const OUTLINE = '#e6d6ba';
const COMB = '#d9594a';
const BEAK = '#f0a13c';
const LEG = '#e8923a';
const EYE = '#3a2c1a';
const CHEEK = '#f3a896';

function bucketOf(status) {
  if (status === STATUS.OK) return 'happy';
  if (status === STATUS.WARN) return 'worried';
  if (status === STATUS.OFFLINE) return 'sleepy';
  if (status === STATUS.DANGER || status === STATUS.POWER_CUT) return 'alarmed';
  return 'alarmed'; // any other → treat as alarmed
}

export default function CoopMascot({ status = STATUS.OFFLINE, size = 56, animated = false }) {
  const bucket = bucketOf(status);
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return undefined;
    // Alarmed chicks fidget faster; calm ones drift slowly.
    const dur = bucket === 'alarmed' ? 420 : 1400;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, bucket, bob]);

  // Periodic blink — a tiny life signal. Only for animated mascots, and not
  // for the already-closed sleepy face. Closed eyes for ~130ms at random gaps.
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (!animated || bucket === 'sleepy') return undefined;
    let openTimer; let closeTimer; let cancelled = false;
    const schedule = () => {
      openTimer = setTimeout(() => {
        if (cancelled) return;
        setBlink(true);
        closeTimer = setTimeout(() => { if (!cancelled) { setBlink(false); schedule(); } }, 130);
      }, 2200 + Math.random() * 2400);
    };
    schedule();
    return () => { cancelled = true; clearTimeout(openTimer); clearTimeout(closeTimer); };
  }, [animated, bucket]);

  // While blinking, draw the closed (sleepy) eyes regardless of mood.
  const faceBucket = blink ? 'sleepy' : bucket;

  // Alarmed → side-to-side wiggle; otherwise a soft vertical float. Static
  // (non-animated) mascots get no transform so they sit perfectly upright.
  const transform = !animated
    ? []
    : bucket === 'alarmed'
      ? [{ translateX: bob.interpolate({ inputRange: [0, 1], outputRange: [-2, 2] }) },
         { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) }]
      : [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }];

  return (
    <Animated.View style={{ transform }}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        {/* Legs */}
        <Path d="M27 54 L27 60 M24 60 L30 60" stroke={LEG} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <Path d="M37 54 L37 60 M34 60 L40 60" stroke={LEG} strokeWidth="2.4" strokeLinecap="round" fill="none" />

        {/* Tail */}
        <Path d="M52 36 q8 -3 9 4 q-5 1 -9 -1 z" fill={BODY_SHADE} stroke={OUTLINE} strokeWidth="1.5" />

        {/* Comb — three little bumps */}
        <G>
          <Circle cx="25" cy="13" r="5" fill={COMB} />
          <Circle cx="32" cy="9" r="5.5" fill={COMB} />
          <Circle cx="39" cy="13" r="5" fill={COMB} />
        </G>

        {/* Body */}
        <Ellipse cx="32" cy="38" rx="22" ry="20" fill={BODY} stroke={OUTLINE} strokeWidth="2" />
        {/* Belly highlight */}
        <Ellipse cx="32" cy="44" rx="13" ry="11" fill="#ffffff" opacity="0.45" />

        {/* Wing tucks */}
        <Path d="M14 38 q5 5 10 2" fill="none" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
        <Path d="M50 38 q-5 5 -10 2" fill="none" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />

        {/* Beak — open when alarmed */}
        {bucket === 'alarmed'
          ? <Polygon points="28,41 36,41 32,50" fill={BEAK} />
          : <Polygon points="28,41 36,41 32,47" fill={BEAK} />}

        {/* Face per status (faceBucket flips to closed eyes during a blink) */}
        {faceBucket === 'happy' && (
          <G>
            <Circle cx="20" cy="40" r="4" fill={CHEEK} opacity="0.6" />
            <Circle cx="44" cy="40" r="4" fill={CHEEK} opacity="0.6" />
            <Path d="M19 33 Q24 38 29 33" fill="none" stroke={EYE} strokeWidth="2.6" strokeLinecap="round" />
            <Path d="M35 33 Q40 38 45 33" fill="none" stroke={EYE} strokeWidth="2.6" strokeLinecap="round" />
          </G>
        )}

        {faceBucket === 'worried' && (
          <G>
            <Circle cx="24" cy="35" r="2.6" fill={EYE} />
            <Circle cx="40" cy="35" r="2.6" fill={EYE} />
            <Path d="M19 28 L28 31" fill="none" stroke={EYE} strokeWidth="2.4" strokeLinecap="round" />
            <Path d="M45 28 L36 31" fill="none" stroke={EYE} strokeWidth="2.4" strokeLinecap="round" />
          </G>
        )}

        {faceBucket === 'alarmed' && (
          <G>
            <Circle cx="24" cy="34" r="4" fill="#ffffff" stroke={EYE} strokeWidth="1.6" />
            <Circle cx="40" cy="34" r="4" fill="#ffffff" stroke={EYE} strokeWidth="1.6" />
            <Circle cx="24" cy="34" r="2" fill={EYE} />
            <Circle cx="40" cy="34" r="2" fill={EYE} />
            <Path d="M18 27 L27 30" fill="none" stroke={EYE} strokeWidth="2.4" strokeLinecap="round" />
            <Path d="M46 27 L37 30" fill="none" stroke={EYE} strokeWidth="2.4" strokeLinecap="round" />
          </G>
        )}

        {faceBucket === 'sleepy' && (
          <G>
            <Path d="M20 35 L29 35" fill="none" stroke={EYE} strokeWidth="2.6" strokeLinecap="round" />
            <Path d="M35 35 L44 35" fill="none" stroke={EYE} strokeWidth="2.6" strokeLinecap="round" />
          </G>
        )}
      </Svg>
    </Animated.View>
  );
}
