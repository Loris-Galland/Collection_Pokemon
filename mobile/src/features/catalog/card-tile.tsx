import type { Card } from '@collection/shared';
import { router } from 'expo-router';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { WishCard } from '@/features/wishlist/wish-picker';
import { HeartButton, Text, colors, radius, spacing } from '@/ui';

import { CardImage } from './card-image';

interface CardTileProps {
  card: Card;
  ownedQuantity: number;
  /** While cards are being selected, a touch selects the card instead of opening it. */
  selecting?: boolean;
  selected?: boolean;
  onToggleSelected?: (cardId: string) => void;
  /** A long touch starts selecting from this card. */
  onStartSelecting?: (cardId: string) => void;
  /** A missing card shows a heart, to add it to the wishes. */
  wished?: boolean;
  onToggleWish?: (card: WishCard) => void;
  onChooseWishlist?: (card: WishCard) => void;
}

/** Card on a set screen, greyed out until it is owned. A missing card has a heart to wish for it. */
export const CardTile = memo(function CardTile({
  card,
  ownedQuantity,
  selecting = false,
  selected = false,
  onToggleSelected,
  onStartSelecting,
  wished = false,
  onToggleWish,
  onChooseWishlist,
}: CardTileProps) {
  const { t } = useTranslation();
  const owned = ownedQuantity > 0;
  const wishCard = { id: card.id, setId: card.setId, name: card.name };

  // The heart sits on top of the tile, not inside it. Nested buttons are invalid HTML and confusing for screen readers.
  return (
    <View style={styles.tile}>
      <Pressable
        accessibilityLabel={
          owned ? t('set.cardOwned', { name: card.name, count: ownedQuantity }) : t('set.cardMissing', { name: card.name })
        }
        accessibilityState={selecting ? { selected } : undefined}
        onPress={() =>
          selecting
            ? onToggleSelected?.(card.id)
            : router.push({ pathname: '/card/[cardId]', params: { cardId: card.id } })
        }
        onLongPress={() => !selecting && onStartSelecting?.(card.id)}
        style={({ pressed }) => [styles.tile, pressed && { transform: [{ scale: 0.97 }] }]}>
        <CardImage imageUrl={card.imageUrl} quality="low" label={card.name} dimmed={!owned && !selected} />
        {selected && <View pointerEvents="none" style={styles.selectedFrame} />}
        {selecting && (
          <View style={[styles.checkbox, selected && styles.checked]}>
            {selected && (
              <Text variant="caption" style={{ color: colors.accentText }}>
                ✓
              </Text>
            )}
          </View>
        )}
        {owned && (
          <View style={styles.badge}>
            <Text variant="overline" style={{ color: colors.accentText }}>
              ×{ownedQuantity}
            </Text>
          </View>
        )}
        <Text variant="caption" tone={owned ? 'muted' : 'faint'} style={styles.number}>
          {card.localId}
        </Text>
      </Pressable>
      {!owned && !selecting && onToggleWish && (
        <HeartButton
          filled={wished}
          overlay
          size={30}
          accessibilityLabel={t('wishlist.addLabel', { name: card.name })}
          onPress={() => onToggleWish(wishCard)}
          onLongPress={() => onChooseWishlist?.(wishCard)}
          style={styles.heart}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    gap: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  heart: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  number: {
    textAlign: 'center',
  },
  selectedFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 18 + spacing.xs,
    borderWidth: 2,
    borderRadius: radius.md,
    borderColor: colors.accent,
  },
  checkbox: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.text,
    backgroundColor: colors.overlay,
  },
  checked: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
});
