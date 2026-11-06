import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

const RED = '#E3350D';
const WHITE = '#F4F4F8';
const BLACK = '#0B0B10';

/** The line height of a large amount, so a loader in its place does not move the layout when the amount arrives. */
export const AMOUNT_LINE_HEIGHT = 38;

/** One full turn, eased so the ball speeds up and slows down like a throw. */
const TURN_MS = 1100;

function Pokeball({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M4 50a46 46 0 0 1 92 0z" fill={RED} />
      <Path d="M96 50a46 46 0 0 1-92 0z" fill={WHITE} />
      {/* A light shine on the red half, so the ball reads as round. */}
      <Path d="M18 34a34 34 0 0 1 22-20" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Circle cx={50} cy={50} r={46} stroke={BLACK} strokeWidth={6} fill="none" />
      <Path d="M4 50h92" stroke={BLACK} strokeWidth={8} />
      <Circle cx={50} cy={50} r={15} fill={BLACK} />
      <Circle cx={50} cy={50} r={9} fill={WHITE} />
    </Svg>
  );
}

/**
 * Spinning Poké Ball shown while something loads. With reduced motion turned on in the phone settings, it breathes
 * gently instead of spinning.
 */
export function PokeballLoader({ size = 44 }: { size?: number }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = reduceMotion
      ? withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })), -1)
      : withRepeat(
          withTiming(1, { duration: TURN_MS, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.Never }),
          -1,
        );
    return () => cancelAnimation(progress);
  }, [progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 0.55 + progress.value * 0.45 }
      : { transform: [{ rotate: `${progress.value * 360}deg` }] },
  );

  return (
    <View
      style={[styles.box, { width: size, height: size }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('common.loading')}
    >
      <Animated.View style={animatedStyle}>
        <Pokeball size={size} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
