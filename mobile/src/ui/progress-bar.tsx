import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, radius } from './theme';

/** Horizontal progress bar that fills smoothly up to the ratio, between 0 and 1. */
export function ProgressBar({
  ratio,
  height = 6,
  color = colors.accent,
  trackColor = colors.surfaceRaised,
}: {
  ratio: number;
  height?: number;
  color?: string;
  trackColor?: string;
}) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.set(withTiming(clamped, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [clamped, fill]);

  // Scaling instead of changing the width, so there is no new layout on every frame.
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.get() }] }));

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    borderRadius: radius.pill,
    transformOrigin: 'left',
  },
});
