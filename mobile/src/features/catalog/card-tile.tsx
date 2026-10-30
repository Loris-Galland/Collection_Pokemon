import type { Card } from '@collection/shared';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text, colors, radius, spacing } from '@/ui';

import { CardImage } from './card-image';

/** Card on a set screen, greyed out until it is owned. */
export function CardTile({ card, ownedQuantity }: { card: Card; ownedQuantity: number }) {
  const owned = ownedQuantity > 0;
  return (
    <Link href={{ pathname: '/card/[cardId]', params: { cardId: card.id } }} asChild>
      <Pressable
        accessibilityLabel={`${card.name}, ${owned ? `possédée ×${ownedQuantity}` : 'manquante'}`}
        style={({ pressed }) => [styles.tile, pressed && { transform: [{ scale: 0.97 }] }]}>
        <CardImage imageUrl={card.imageUrl} quality="low" label={card.name} dimmed={!owned} />
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
    </Link>
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
});
