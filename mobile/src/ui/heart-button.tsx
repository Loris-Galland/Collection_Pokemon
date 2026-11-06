import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { HeartIcon } from './icons';
import { colors } from './theme';

const PARTICLES = 6;
const BURST_DURATION_MS = 520;

interface HeartButtonProps {
  filled: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
  /** Size of the round button. The heart takes about half of it. */
  size?: number;
  /** Round dark background, for a heart laid over a card picture. */
  overlay?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Heart that fills in pink with a small burst when it becomes filled, and empties when it does not. It animates on
 * every change of `filled`, not on the touch itself, so a heart filled from another screen animates the same way.
 */
export function HeartButton({
  filled,
  onPress,
  onLongPress,
  accessibilityLabel,
  size = 32,
  overlay = false,
  style,
}: HeartButtonProps) {
  const fill = useSharedValue(filled ? 1 : 0);
  const burst = useSharedValue(0);
  const press = useSharedValue(1);
  const wasFilled = useRef(filled);

  useEffect(() => {
    if (filled === wasFilled.current) return;
    wasFilled.current = filled;
    if (filled) {
      fill.set(withSequence(withTiming(0, { duration: 0 }), withSpring(1, { damping: 9, stiffness: 260, mass: 0.7 })));
      burst.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: BURST_DURATION_MS, easing: Easing.out(Easing.cubic) })));
    } else {
      fill.set(withTiming(0, { duration: 160 }));
    }
  }, [filled, fill, burst]);

  const iconSize = Math.round(size * 0.56);

  const filledStyle = useAnimatedStyle(() => ({
    opacity: fill.get() > 0.01 ? 1 : 0,
    transform: [{ scale: fill.get() }],
  }));
  const outlineStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.min(fill.get(), 1) }));
  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.get() }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(burst.get(), [0, 0.15, 1], [0, 0.7, 0]),
    transform: [{ scale: interpolate(burst.get(), [0, 1], [0.4, 1.5]) }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: filled }}
      hitSlop={8}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => press.set(withSpring(0.86, { damping: 15, stiffness: 400 }))}
      onPressOut={() => press.set(withSpring(1, { damping: 12, stiffness: 300 }))}
      style={style}>
      <Animated.View
        style={[
          styles.button,
          { width: size, height: size, borderRadius: size / 2 },
          overlay && styles.overlay,
          buttonStyle,
        ]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, ringStyle]}
        />
        {Array.from({ length: PARTICLES }, (_, index) => (
          <Particle key={index} index={index} burst={burst} distance={size * 0.62} />
        ))}
        <Animated.View style={[styles.layer, outlineStyle]}>
          <HeartIcon color={overlay ? colors.text : colors.textMuted} size={iconSize} />
        </Animated.View>
        <Animated.View style={[styles.layer, filledStyle]}>
          <HeartIcon color={colors.wish} size={iconSize} filled />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function Particle({
  index,
  burst,
  distance,
}: {
  index: number;
  burst: SharedValue<number>;
  distance: number;
}) {
  const angle = (index / PARTICLES) * Math.PI * 2 - Math.PI / 2;
  const style = useAnimatedStyle(() => {
    const progress = burst.get();
    return {
      opacity: interpolate(progress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: Math.cos(angle) * distance * progress },
        { translateY: Math.sin(angle) * distance * progress },
        { scale: interpolate(progress, [0, 0.3, 1], [0.2, 1, 0.4]) },
      ],
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.particle, index % 2 === 1 && styles.particleSoft, style]} />;
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    backgroundColor: colors.overlay,
  },
  layer: {
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.wish,
  },
  particle: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.wish,
  },
  particleSoft: {
    backgroundColor: colors.accent,
  },
});

