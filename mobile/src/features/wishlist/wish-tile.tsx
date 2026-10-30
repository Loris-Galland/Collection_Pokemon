import { cheapestPrice, type Wish } from '@collection/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CardImage } from '@/features/catalog/card-image';
import type { CardDetail } from '@/features/catalog/tcgdex';
import { formatEuros } from '@/lib/format';
import { PressableScale, Text, colors, spacing } from '@/ui';

import { useWishlistActions } from './wishlist-provider';

/** A wish with its preview, name, set, price and a button to remove it. */
export function WishTile({ wish, detail }: { wish: Wish; detail: CardDetail | undefined }) {
  const { toggle } = useWishlistActions();
  const price = cheapestPrice(detail?.prices ?? [])?.amount;
  const name = detail?.card.name ?? '…';

  // The remove button sits on top of the tile, not inside it. Nested buttons are invalid HTML and confusing for screen
  // readers.
  return (
    <View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={name}
        onPress={() => router.push({ pathname: '/card/[cardId]', params: { cardId: wish.cardId } })}
        style={styles.tile}>
        <CardImage imageUrl={detail?.card.imageUrl} quality="low" label={name} />
        <View style={styles.meta}>
          <Text variant="caption" numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          <Text variant="caption" tone="faint" numberOfLines={1}>
            {detail ? `${detail.set.name} · ${detail.card.localId}` : ' '}
          </Text>
          <Text variant="heading" tone={price ? 'accent' : 'faint'}>
            {price ? formatEuros(price) : detail ? 'Sans prix' : ' '}
          </Text>
        </View>
      </PressableScale>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Retirer ${name} de mes envies`}
        hitSlop={8}
        onPress={() => toggle(wish.cardId, wish.setId)}
        style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}>
        <Text variant="caption" style={{ color: colors.wish }}>
          ♥
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    gap: spacing.sm,
  },
  remove: {
    position: 'absolute',
    top: spacing.xs + 2,
    right: spacing.xs + 2,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(11, 11, 16, 0.78)',
  },
  removePressed: {
    transform: [{ scale: 0.9 }],
  },
  meta: {
    gap: 1,
  },
  name: {
    color: colors.text,
    fontWeight: '600',
  },
});
