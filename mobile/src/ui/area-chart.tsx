import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { Text } from './text';
import { colors, spacing } from './theme';

export interface ChartPoint {
  /** Label under the axis, for example "30 j". */
  label: string;
  value: number;
}

interface AreaChartProps {
  points: readonly ChartPoint[];
  color: string;
  height?: number;
  /** Formats the value shown above each point. */
  formatValue: (value: number) => string;
}

const PADDING_X = 28;
const PADDING_TOP = 28;
const PADDING_BOTTOM = 8;

/** Smooth curve with a gradient underneath, drawn from left to right. Points are evenly spaced. */
export function AreaChart({ points, color, height = 160, formatValue }: AreaChartProps) {
  const [width, setWidth] = useState(0);
  const reveal = useSharedValue(0);

  useEffect(() => {
    reveal.set(0);
    reveal.set(withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [points, reveal]);

  const revealStyle = useAnimatedStyle(() => ({ width: `${reveal.get() * 100}%` }));

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat curve stays in the middle instead of sticking to the bottom.
  const range = max - min || max || 1;
  const plotHeight = height - PADDING_TOP - PADDING_BOTTOM;
  const step = points.length > 1 ? (width - 2 * PADDING_X) / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    x: points.length > 1 ? PADDING_X + index * step : width / 2,
    y: max === min ? PADDING_TOP + plotHeight / 2 : PADDING_TOP + (1 - (point.value - min) / range) * plotHeight,
  }));

  const line = smoothPath(coords);
  const last = coords.at(-1);
  const first = coords[0];
  const area = last && first ? `${line} L ${last.x} ${height} L ${first.x} ${height} Z` : '';

  return (
    <View>
      <View style={{ height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 && (
          <Animated.View style={[styles.reveal, revealStyle]}>
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={color} stopOpacity={0.35} />
                  <Stop offset="1" stopColor={color} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {coords.map((point, index) => (
                <Line
                  key={`grid-${index}`}
                  x1={point.x}
                  x2={point.x}
                  y1={PADDING_TOP / 2}
                  y2={height}
                  stroke={colors.border}
                  strokeDasharray="3 5"
                />
              ))}
              <Path d={area} fill="url(#area)" />
              <Path d={line} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
              {coords.map((point, index) => (
                <Circle
                  key={`dot-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={index === coords.length - 1 ? 6 : 4}
                  fill={colors.background}
                  stroke={color}
                  strokeWidth={3}
                />
              ))}
            </Svg>
            {coords.map((point, index) => (
              <Text
                key={`value-${index}`}
                variant="caption"
                style={[styles.value, { left: point.x - 40, top: point.y - 26 }]}>
                {formatValue(points[index]!.value)}
              </Text>
            ))}
          </Animated.View>
        )}
      </View>
      <View style={[styles.labels, { paddingHorizontal: PADDING_X - 20 }]}>
        {points.map((point) => (
          <Text key={point.label} variant="caption" tone="muted" style={styles.label}>
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Curve through every point with horizontal tangents, so it never overshoots. */
function smoothPath(coords: readonly { x: number; y: number }[]): string {
  return coords
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const previous = coords[index - 1]!;
      const midX = (previous.x + point.x) / 2;
      return `C ${midX} ${previous.y} ${midX} ${point.y} ${point.x} ${point.y}`;
    })
    .join(' ');
}

const styles = StyleSheet.create({
  reveal: {
    height: '100%',
    overflow: 'hidden',
  },
  value: {
    position: 'absolute',
    width: 80,
    textAlign: 'center',
    color: colors.text,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  label: {
    width: 40,
    textAlign: 'center',
  },
});
