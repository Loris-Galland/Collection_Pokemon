import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { useRequireAccount } from '@/features/account/use-account';
import { PressableScale, Text, colors, radius, spacing } from '@/ui';

import { useWishlist, useWishlistActions } from './wishlist-provider';

/** Adds a card to the wishlist or removes it. The heart bounces when a card is added. */
export function WishButton({ cardId, setId }: { cardId: string; setId: string }) {
  const { isWished } = useWishlist();
  const { toggle } = useWishlistActions();
  const requireAccount = useRequireAccount();
  const wished = isWished(cardId);
  const pop = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: wished }}
      onPress={() => {
        if (wished) {
          toggle(cardId, setId);
          return;
        }
        requireAccount(() => {
          pop.set(withSequence(withSpring(1.45, { duration: 160 }), withSpring(1, { damping: 8 })));
          toggle(cardId, setId);
        });
      }}
      style={[styles.button, wished && styles.wished]}>
      <Animated.View style={heartStyle}>
        <Text variant="heading" style={{ color: wished ? colors.wish : colors.textMuted }}>
          {wished ? '♥' : '♡'}
        </Text>
      </Animated.View>
      <Text variant="caption" style={{ color: wished ? colors.text : colors.textMuted }}>
        {wished ? 'Dans mes envies' : 'Ajouter à mes envies'}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  wished: {
    borderColor: 'rgba(255, 107, 157, 0.45)',
    backgroundColor: 'rgba(255, 107, 157, 0.12)',
  },
});
