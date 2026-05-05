import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Circle, Path } from 'react-native-svg';
import { colors } from '../utils/colors';

const SCREEN_W = Dimensions.get('window').width;

export default function TrendChart({
  values,
  color = colors.accent,
  height = 160,
  unit,
  emptyLabel,
}) {
  const data = useMemo(() => (values || []).filter(
    (v) => v !== null && v !== undefined && !isNaN(v)
  ), [values]);

  const width = SCREEN_W - 64;

  if (data.length < 2) {
    return (
      <View style={[styles.wrap, { height }]}>
        <Text style={styles.empty}>{emptyLabel || 'No data'}</Text>
      </View>
    );
  }

  const padding = 16;
  const w = width;
  const h = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = (w - padding * 2) / (data.length - 1);

  const points = data.map((v, i) => {
    const x = padding + i * stepX;
    const norm = (v - min) / range;
    const y = padding + (1 - norm) * (h - padding * 2);
    return { x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Area path for fill effect
  const areaPath = [
    `M ${points[0].x} ${h - padding}`,
    ...points.map((p) => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${h - padding}`,
    'Z',
  ].join(' ');

  const last = points[points.length - 1];
  const lastValue = data[data.length - 1];

  return (
    <View style={[styles.wrap, { height }]}>
      <Svg width={w} height={h}>
        {[0, 0.5, 1].map((p, i) => (
          <Line
            key={i}
            x1={padding}
            y1={padding + p * (h - padding * 2)}
            x2={w - padding}
            y2={padding + p * (h - padding * 2)}
            stroke={colors.border}
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        ))}
        <Path d={areaPath} fill={color} fillOpacity={0.15} />
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Circle cx={last.x} cy={last.y} r={4.5} fill={color} stroke={colors.bg} strokeWidth={2} />
      </Svg>
      <View style={styles.legend}>
        <Text style={styles.legendMin}>{Number(min).toFixed(1)}{unit ? ` ${unit}` : ''}</Text>
        <Text style={[styles.legendCurrent, { color }]}>
          {Number(lastValue).toFixed(1)}{unit ? ` ${unit}` : ''}
        </Text>
        <Text style={styles.legendMax}>{Number(max).toFixed(1)}{unit ? ` ${unit}` : ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    overflow: 'hidden',
  },
  empty: {
    color: colors.textTertiary,
    textAlign: 'center',
    fontSize: 13,
    paddingTop: 50,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  legendMin: { color: colors.textTertiary, fontSize: 11 },
  legendMax: { color: colors.textTertiary, fontSize: 11 },
  legendCurrent: { fontWeight: '800', fontSize: 12 },
});
