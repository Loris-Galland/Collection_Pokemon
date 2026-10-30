import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING = { damping: 18, stiffness: 320, mass: 0.6 };

/** Pressable area that sinks slightly when touched, then springs back. */
export function PressableScale({
  pressedScale = 0.97,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: PressableProps & { pressedScale?: number }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <AnimatedPressable
      onPressIn={(event) => {
        scale.set(withSpring(pressedScale, SPRING));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withSpring(1, SPRING));
        onPressOut?.(event);
      }}
      style={[style as object, animatedStyle]}
      {...rest}
    />
  );
}
