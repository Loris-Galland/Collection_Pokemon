import type { Wishlist } from '@collection/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { CardImage } from '@/features/catalog/card-image';
import { formatEuros } from '@/lib/format';
import {
  CARD_ASPECT_RATIO,
  HeartIcon,
  PlusIcon,
  PressableScale,
  Text,
  colors,
  gradientStyle,
  radius,
  spacing,
} from '@/ui';

const COVER_GRADIENT = gradientStyle('linear-gradient(145deg, rgba(255, 107, 157, 0.22) 0%, rgba(21, 21, 29, 1) 75%)');

const COVER_CARDS = 4;

interface WishlistTileProps {
  wishlist: Wishlist;
  /** Pictures of the newest cards of the list. */
  imageUrls: readonly (string | undefined)[];
  count: number;
  /** What the list would cost, undefined while prices load. */
  cost: number | undefined;
}

/** A list of wishes, with a cover made of its four newest cards, its name, its size and its cost. */
export function WishlistTile({ wishlist, imageUrls, count, cost }: WishlistTileProps) {
  const { t } = useTranslation();
  const cover = imageUrls.slice(0, COVER_CARDS);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t('wishlist.listLabel', { name: wishlist.name, count })}
      onPress={() => router.push({ pathname: '/wishlists/[wishlistId]', params: { wishlistId: wishlist.id } })}
      style={styles.tile}>
      <View style={[styles.cover, COVER_GRADIENT]}>
        {cover.length === 0 ? (
          <View style={styles.emptyCover}>
            <HeartIcon color={colors.wish} size={28} />
          </View>
        ) : (
          <View style={styles.mosaic}>
            {Array.from({ length: COVER_CARDS }, (_, index) => (
              <View key={index} style={styles.slot}>
                {index < cover.length ? (
                  <CardImage imageUrl={cover[index]} quality="low" label="" />
                ) : (
                  <View style={styles.emptySlot} />
                )}
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={styles.meta}>
        <Text variant="heading" numberOfLines={1}>
          {wishlist.name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {t('common.cards', { count })}
          {cost !== undefined && count > 0 ? ` · ${formatEuros(cost)}` : ''}
        </Text>
      </View>
    </PressableScale>
  );
}

/** The tile that creates a list, at the end of the lists. */
export function NewWishlistTile({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={styles.tile}>
      <View style={[styles.cover, styles.newCover]}>
        <View style={styles.plus}>
          <PlusIcon color={colors.wish} size={22} />
        </View>
      </View>
      <View style={styles.meta}>
        <Text variant="heading" style={{ color: colors.wish }}>
          {t('wishlist.newList')}
        </Text>
        <Text variant="caption" tone="muted">
          {' '}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    gap: spacing.sm,
  },
  cover: {
    aspectRatio: 1,
    overflow: 'hidden',
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 107, 157, 0.3)',
    backgroundColor: colors.surface,
  },
  mosaic: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
  },
  slot: {
    // Two cards side by side, two rows, with the card ratio, fitting the square cover.
    width: '42%',
    aspectRatio: CARD_ASPECT_RATIO,
  },
  emptySlot: {
    flex: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  emptyCover: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCover: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 107, 157, 0.45)',
    backgroundColor: 'transparent',
  },
  plus: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(255, 107, 157, 0.12)',
  },
  meta: {
    gap: 1,
  },
});
