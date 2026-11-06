import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChevronIcon, HeartButton, Text, colors, radius, spacing } from '@/ui';

import { useWishPicker, type WishCard } from './wish-picker';
import { useWishlist } from './wishlist-provider';

/**
 * Heart of the card screen, with the list the card is in. The heart adds or removes the card, and the label opens the
 * lists to move it.
 */
export function WishButton({ card }: { card: WishCard }) {
  const { t } = useTranslation();
  const { wishOf, wishlists } = useWishlist();
  const { toggle, choose } = useWishPicker();
  const wish = wishOf(card.id);
  const list = wish && wishlists.find((entry) => entry.id === wish.wishlistId);

  return (
    <View style={[styles.pill, wish && styles.wished]}>
      <HeartButton
        filled={wish !== undefined}
        size={36}
        accessibilityLabel={
          list ? t('wishlist.wishedLabel', { name: card.name, list: list.name }) : t('wishlist.addLabel', { name: card.name })
        }
        onPress={() => toggle(card)}
        onLongPress={() => choose(card)}
      />
      <Pressable
        accessibilityRole="button"
        hitSlop={6}
        onPress={() => (wish ? choose(card) : toggle(card))}
        style={({ pressed }) => [styles.label, pressed && styles.pressed]}>
        <Text variant="caption" numberOfLines={1} style={{ color: wish ? colors.text : colors.textMuted }}>
          {list ? t('wishlist.inList', { name: list.name }) : t('wishlist.save')}
        </Text>
        {wish && <ChevronIcon color={colors.textMuted} size={14} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingLeft: spacing.xs,
    paddingRight: spacing.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  wished: {
    borderColor: 'rgba(255, 107, 157, 0.45)',
    backgroundColor: 'rgba(255, 107, 157, 0.12)',
  },
  label: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
