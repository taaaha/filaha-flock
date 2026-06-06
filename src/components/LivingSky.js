import React, { useRef, useEffect } from 'react';
import { View, Animated, Easing, Dimensions, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path, Line, Ellipse } from 'react-native-svg';
import CoopMascot from './CoopMascot';

/**
 * The living farm header — an illustrated sky + hills scene that reflects BOTH
 * the real time of day (dawn / day / dusk / night) and the farm's overall mood
 * (clear = all good, clouds = warnings, storm = danger, fog = offline). The
 * chick stands on the hill, animated. Clouds drift. It makes the app feel alive.
 *
 * Artwork was prototyped in the browser and tuned before porting here.
 *
 * Props: statusKey ('ok'|'warn'|'danger'|'offline'), hour (0–23), height.
 */

const { width: SCREEN_W } = Dimensions.get('window');

const SKY = {
  dawn:  { top: '#f5b487', mid: '#f7cf9f', bottom: '#f8e7cd' },
  day:   { top: '#9fd2e6', mid: '#c7e6e6', bottom: '#eef3e2' },
  dusk:  { top: '#c97d86', mid: '#e8996f', bottom: '#f4d3a6' },
  night: { top: '#222a4d', mid: '#34406a', bottom: '#54557a' },
};
const HILL = {
  dawn:  { back: '#cdd79a', front: '#a7c07b' },
  day:   { back: '#bcd58f', front: '#8cbb66' },
  dusk:  { back: '#9fa777', front: '#7c8a59' },
  night: { back: '#33503c', front: '#264231' },
};

function bucketOf(hour) {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

const STAR_PTS = [
  [0.10, 0.19], [0.23, 0.13], [0.36, 0.29], [0.16, 0.43], [0.77, 0.18],
  [0.67, 0.33], [0.53, 0.14], [0.85, 0.39], [0.30, 0.19],
];

// ── A single soft, fluffy cloud built from rounded views (so it can drift on
// the native thread) ──────────────────────────────────────────────────────
function CloudShape({ color, scale }) {
  return (
    <View style={{ width: 70 * scale, height: 36 * scale }}>
      <View style={{ position: 'absolute', left: 0,  bottom: 0,  width: 60 * scale, height: 18 * scale, borderRadius: 9 * scale,  backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 4 * scale,  bottom: 5 * scale,  width: 28 * scale, height: 28 * scale, borderRadius: 14 * scale, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 20 * scale, bottom: 7 * scale,  width: 36 * scale, height: 36 * scale, borderRadius: 18 * scale, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 40 * scale, bottom: 5 * scale,  width: 26 * scale, height: 26 * scale, borderRadius: 13 * scale, backgroundColor: color }} />
    </View>
  );
}

function DriftCloud({ W, top, scale, color, opacity, duration, delay }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let active = true;
    const run = () => {
      x.setValue(0);
      Animated.timing(x, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
        .start(({ finished }) => { if (finished && active) run(); });
    };
    const id = setTimeout(run, delay);
    return () => { active = false; clearTimeout(id); };
  }, [x, duration, delay]);
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [-90 * scale, W + 40] });
  return (
    <Animated.View style={{ position: 'absolute', top, opacity, transform: [{ translateX }] }}>
      <CloudShape color={color} scale={scale} />
    </Animated.View>
  );
}

function cloudsFor(statusKey, night) {
  if (statusKey === 'danger') return [
    { top: 0.14, scale: 1.05, color: '#5c6168', opacity: 0.95, duration: 60000, delay: 0 },
    { top: 0.24, scale: 0.9,  color: '#494e55', opacity: 0.96, duration: 48000, delay: 1200 },
    { top: 0.12, scale: 0.7,  color: '#5c6168', opacity: 0.9,  duration: 72000, delay: 600 },
  ];
  if (statusKey === 'offline') return [
    { top: 0.22, scale: 1.0, color: '#e7e6dd', opacity: 0.8,  duration: 80000, delay: 0 },
    { top: 0.34, scale: 0.8, color: '#dedcd0', opacity: 0.75, duration: 100000, delay: 1500 },
  ];
  if (statusKey === 'warn') {
    const c = night ? '#6a7398' : '#f3eee4', c2 = night ? '#5a648c' : '#e9e2d4', op = night ? 0.5 : 0.95;
    return [
      { top: 0.18, scale: 0.85, color: c,  opacity: op, duration: 66000, delay: 0 },
      { top: 0.32, scale: 0.7,  color: c2, opacity: op, duration: 84000, delay: 1800 },
    ];
  }
  // ok
  return night
    ? [{ top: 0.24, scale: 0.75, color: '#5a648c', opacity: 0.45, duration: 85000, delay: 0 }]
    : [{ top: 0.24, scale: 0.8,  color: '#ffffff', opacity: 0.92, duration: 78000, delay: 0 }];
}

export default function LivingSky({ statusKey = 'ok', hour = 12, height = 200 }) {
  const W = SCREEN_W;
  const H = height;
  const bucket = bucketOf(hour);
  const storm = statusKey === 'danger';
  const fog = statusKey === 'offline';
  const night = bucket === 'night' && !storm && !fog;

  const sky = storm ? { top: '#54606b', mid: '#74808b', bottom: '#9aa29f' }
            : fog   ? { top: '#b1b7b1', mid: '#c7c8bf', bottom: '#dcd9ce' }
            : SKY[bucket];
  const hill = storm ? { back: '#586f52', front: '#3f5a39' }
             : fog   ? { back: '#a6ba98', front: '#8aa37c' }
             : HILL[bucket];
  const showSun = !storm && !fog;

  const sunPos = bucket === 'dawn' ? [W * 0.24, H * 0.4]
               : bucket === 'dusk' ? [W * 0.8, H * 0.44]
               : [W * 0.78, H * 0.27];
  const sunCore = bucket === 'day' ? '#ffdf74' : bucket === 'dawn' ? '#ffc777' : '#ff8f48';
  const sunGlow = bucket === 'day' ? '#ffe9a8' : bucket === 'dawn' ? '#ffd9a0' : '#ff7e3c';

  const backHill = `M0 ${H * 0.74} Q ${W * 0.28} ${H * 0.6} ${W * 0.55} ${H * 0.72} T ${W} ${H * 0.68} L ${W} ${H} L 0 ${H} Z`;
  const frontHill = `M0 ${H * 0.9} Q ${W * 0.45} ${H * 0.72} ${W} ${H * 0.86} L ${W} ${H} L 0 ${H} Z`;

  const clouds = cloudsFor(statusKey, night);
  const chickSize = Math.round(H * 0.56);

  const gid = `sky_${bucket}_${statusKey}`;

  return (
    <View style={{ width: W, height: H, overflow: 'hidden' }}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky.top} />
            <Stop offset="0.55" stopColor={sky.mid} />
            <Stop offset="1" stopColor={sky.bottom} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={H} fill={`url(#${gid})`} />

        {/* Sun or moon + stars */}
        {showSun && !night && (
          <>
            <Circle cx={sunPos[0]} cy={sunPos[1]} r="50" fill={sunGlow} opacity="0.4" />
            <Circle cx={sunPos[0]} cy={sunPos[1]} r="36" fill={sunGlow} opacity="0.35" />
            <Circle cx={sunPos[0]} cy={sunPos[1]} r="23" fill={sunCore} />
          </>
        )}
        {night && (
          <>
            {STAR_PTS.map((p, i) => (
              <Circle key={i} cx={W * p[0]} cy={H * p[1]} r={1.4 + (i % 3) * 0.5} fill="#fdf6e3" opacity="0.9" />
            ))}
            <Circle cx={W * 0.8} cy={H * 0.25} r="20" fill="#eef0fb" />
            <Circle cx={W * 0.745} cy={H * 0.21} r="18" fill={sky.top} />
          </>
        )}

        {/* Rain for the storm */}
        {storm && Array.from({ length: 16 }).map((_, i) => {
          const rx = W * (0.06 + i * 0.058);
          const ry = H * 0.42 + (i % 3) * 6;
          return <Line key={i} x1={rx} y1={ry} x2={rx - 5} y2={ry + 13} stroke="#cde0ec" strokeWidth="2" strokeLinecap="round" opacity="0.55" />;
        })}

        {/* Hills */}
        <Path d={backHill} fill={hill.back} />
        <Path d={frontHill} fill={hill.front} />

        {/* Ground shadow so the chick sits on the hill */}
        <Ellipse cx={W * 0.5} cy={H * 0.84} rx="34" ry="7" fill="#000000" opacity="0.12" />
      </Svg>

      {/* Drifting clouds (native-thread animation) */}
      {clouds.map((c, i) => (
        <DriftCloud key={i} W={W} top={H * c.top} scale={c.scale} color={c.color} opacity={c.opacity} duration={c.duration} delay={c.delay} />
      ))}

      {/* The chick, standing on the hill */}
      <View style={{ position: 'absolute', left: (W - chickSize) / 2, top: Math.round(H * 0.30) }}>
        <CoopMascot animated status={statusKey} size={chickSize} />
      </View>
    </View>
  );
}
