import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CARD_ASPECT_RATIO, Text, gradientStyle, radius } from '@/ui';

interface CardStowProps {
  children: ReactNode;
  /** Goes up by one each time a copy is added, which plays the animation once. */
  stowCount: number;
}

const FLIP_MS = 420;
const STOW_MS = 380;

/**
 * The picture of a card that turns over and slides down into the collection when a copy is added, then comes back.
 * With reduced motion it only pulses.
 */
export function CardStow({ children, stowCount }: CardStowProps) {
  const reduceMotion = useReducedMotion();
  // 0 is the face, 1 the back. Stowing goes from 0 to 1, and back to 0 for the return.
  const flip = useSharedValue(0);
  const stow = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (stowCount === 0) return;
    if (reduceMotion) {
      scale.set(withSequence(withTiming(0.94, { duration: 120 }), withSpring(1)));
      return;
    }
    flip.set(
      withSequence(
        withTiming(1, { duration: FLIP_MS, easing: Easing.inOut(Easing.cubic) }),
        withDelay(STOW_MS, withTiming(0, { duration: 0 })),
      ),
    );
    stow.set(
      withSequence(
        withDelay(FLIP_MS - 80, withTiming(1, { duration: STOW_MS, easing: Easing.in(Easing.cubic) })),
        withTiming(0, { duration: 0 }),
      ),
    );
    scale.set(
      withSequence(
        withDelay(FLIP_MS + STOW_MS, withTiming(0.6, { duration: 0 })),
        withSpring(1, { damping: 14, stiffness: 160 }),
      ),
    );
  }, [stowCount, reduceMotion, flip, stow, scale]);

  const moving = useAnimatedStyle(() => ({
    opacity: interpolate(stow.get(), [0, 0.7, 1], [1, 1, 0]),
    transform: [
      { translateY: interpolate(stow.get(), [0, 1], [0, 420]) },
      { scale: scale.get() * interpolate(stow.get(), [0, 1], [1, 0.22]) },
    ],
  }));
  const face = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(flip.get(), [0, 1], [0, 180])}deg` }],
  }));
  const back = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(flip.get(), [0, 1], [180, 360])}deg` }],
  }));

  return (
    <Animated.View style={moving}>
      <Animated.View style={[styles.side, face]}>{children}</Animated.View>
      <Animated.View pointerEvents="none" style={[styles.side, styles.back, back]}>
        <CardBack />
      </Animated.View>
    </Animated.View>
  );
}

/** The back of a card, drawn for the app and not copied from the real one. */
function CardBack() {
  return (
    <View style={[styles.backFace, gradientStyle('linear-gradient(145deg, #2B2350 0%, #12101F 55%, #3A1F45 100%)')]}>
      <View style={styles.ring}>
        <Text variant="title" style={styles.wordmark}>
          Holo
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  side: {
    backfaceVisibility: 'hidden',
  },
  back: {
    ...StyleSheet.absoluteFill,
  },
  backFace: {
    width: '100%',
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: radius.md,
    borderWidth: 6,
    borderColor: '#1C1832',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: '62%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 4,
  },
});
