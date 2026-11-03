import type { Card } from '@collection/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text, colors, radius, spacing } from '@/ui';

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
}

/** Card on a set screen, greyed out until it is owned. */
export function CardTile({
  card,
  ownedQuantity,
  selecting = false,
  selected = false,
  onToggleSelected,
  onStartSelecting,
}: CardTileProps) {
  const owned = ownedQuantity > 0;
  return (
    <Pressable
      accessibilityLabel={`${card.name}, ${owned ? `possédée ×${ownedQuantity}` : 'manquante'}`}
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
  );
}

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
