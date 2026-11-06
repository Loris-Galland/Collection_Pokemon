import { cheapestPrice, type Wish } from '@collection/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { CardImage } from '@/features/catalog/card-image';
import type { CardDetail } from '@/features/catalog/tcgdex';
import { formatEuros } from '@/lib/format';
import { HeartButton, PressableScale, Text, colors, spacing } from '@/ui';

import { useWishPicker } from './wish-picker';

/** A wish with its preview, name, set and price. Its heart removes it, and a long touch moves it to another list. */
export function WishTile({ wish, detail }: { wish: Wish; detail: CardDetail | undefined }) {
  const { t } = useTranslation();
  const { toggle, choose } = useWishPicker();
  const price = cheapestPrice(detail?.prices ?? [])?.amount;
  const name = detail?.card.name ?? '…';
  const wishCard = { id: wish.cardId, setId: wish.setId, name };

  // The heart sits on top of the tile, not inside it. Nested buttons are invalid HTML and confusing for screen readers.
  return (
    <View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={name}
        onPress={() => router.push({ pathname: '/card/[cardId]', params: { cardId: wish.cardId } })}
        onLongPress={() => choose(wishCard)}
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
            {price ? formatEuros(price) : detail ? t('common.noPrice') : ' '}
          </Text>
        </View>
      </PressableScale>
      <HeartButton
        filled
        overlay
        size={32}
        accessibilityLabel={t('wishlist.removeCard', { name })}
        onPress={() => toggle(wishCard)}
        style={styles.heart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    gap: spacing.sm,
  },
  heart: {
    position: 'absolute',
    top: spacing.xs + 2,
    right: spacing.xs + 2,
  },
  meta: {
    gap: 1,
  },
  name: {
    color: colors.text,
    fontWeight: '600',
  },
});
