import type { Card } from '@collection/shared';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  SensorType,
  interpolate,
  useAnimatedSensor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  Extrapolation,
} from 'react-native-reanimated';

import { gradientStyle, radius } from '@/ui';

/** Whether a card shines. Holo prints do, and so do rare cards. Almost every card has a reverse print, which is left out. */
export function isShiny(card: Pick<Card, 'variants' | 'rarity'>): boolean {
  return card.variants.includes('holo') || /holo|rare|secr|ultra|illustration|hyper|shiny/i.test(card.rarity ?? '');
}

// How far the phone is tilted, in radians, for the reflection to cross the whole card.
const TILT = 0.6;

/** A reflection that follows the tilt of the phone, laid over the picture of a shiny card. */
function TiltShine() {
  const rotation = useAnimatedSensor(SensorType.ROTATION, { interval: 16 });
  const size = useSharedValue({ width: 0, height: 0 });
  const shine = useAnimatedStyle(() => {
    const { pitch, roll } = rotation.sensor.get();
    const { width, height } = size.get();
    const x = interpolate(roll, [-TILT, TILT], [-0.6, 0.6], Extrapolation.CLAMP) * width;
    const y = interpolate(pitch, [-TILT, TILT], [-0.6, 0.6], Extrapolation.CLAMP) * height;
    return {
      opacity: interpolate(Math.abs(roll) + Math.abs(pitch), [0, TILT], [0.35, 0.75], Extrapolation.CLAMP),
      transform: [{ translateX: x }, { translateY: y }, { rotate: '25deg' }],
    };
  });
  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={({ nativeEvent }) => size.set({ width: nativeEvent.layout.width, height: nativeEvent.layout.height })}>
      <Animated.View style={[styles.band, RAINBOW, shine]} />
    </View>
  );
}

const RAINBOW = gradientStyle(
  'linear-gradient(110deg, rgba(255,255,255,0) 30%, rgba(255,120,200,0.35) 40%, rgba(120,220,255,0.45) 47%, rgba(255,255,255,0.7) 50%, rgba(160,255,170,0.45) 53%, rgba(255,230,120,0.35) 60%, rgba(255,255,255,0) 70%)',
);

/** Lays a moving reflection over the picture of a shiny card. On the web and with reduced motion it stays still. */
export function HoloShine({ card, children }: { card: Pick<Card, 'variants' | 'rarity'>; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const moving = isShiny(card) && !reduceMotion && Platform.OS !== 'web';
  return (
    <View>
      {children}
      {moving && (
        <View pointerEvents="none" style={styles.clip}>
          <TiltShine />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    mixBlendMode: 'screen',
  },
});
