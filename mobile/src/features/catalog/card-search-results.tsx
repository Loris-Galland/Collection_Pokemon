import type { Card, CardSet } from '@collection/shared';
import { router } from 'expo-router';
import { memo, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, PressableScale, Text, colors, radius, spacing } from '@/ui';

import { CardImage } from './card-image';
import { SEARCH_LIMIT } from './tcgdex';

const COLUMNS = 3;
// These sit outside the virtualized list, so only a few rows are drawn at first.
const RESULTS_STEP = 24;

interface CardSearchResultsProps {
  cards: readonly Card[] | undefined;
  /** How many cards match, which can be more than the ones given. */
  total: number | undefined;
  loading: boolean;
  error: boolean;
  /** Used to show the set name under each card. */
  setsById: ReadonlyMap<string, CardSet>;
  /** Badges, meaning the owned quantity of each card and the cards on the wishlist. */
  ownedQuantities: ReadonlyMap<string, number>;
  isWished: (cardId: string) => boolean;
}

/** Card search results, shown as a grid. */
export function CardSearchResults({
  cards,
  total,
  loading,
  error,
  setsById,
  ownedQuantities,
  isWished,
}: CardSearchResultsProps) {
  const [shownCount, setShownCount] = useState(RESULTS_STEP);
  useEffect(() => setShownCount(RESULTS_STEP), [cards]);
  const hasMore = (cards?.length ?? 0) > shownCount;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="title">Cartes</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          cards && (
            <Text variant="caption" tone="muted">
              {total} résultat{total === 1 ? '' : 's'}
            </Text>
          )
        )}
      </View>

      {error ? (
        <Text tone="muted">Recherche indisponible pour le moment.</Text>
      ) : cards && cards.length === 0 && !loading ? (
        <Text tone="muted">Aucune carte ne porte ce nom.</Text>
      ) : (
        <Animated.View entering={FadeIn.duration(250)} style={styles.grid}>
          {(cards ?? []).slice(0, shownCount).map((card) => (
            <SearchCardTile
              key={card.id}
              card={card}
              setName={setsById.get(card.setId)?.name}
              ownedQuantity={ownedQuantities.get(card.id) ?? 0}
              wished={isWished(card.id)}
            />
          ))}
          {hasMore && (
            <View style={styles.narrow}>
              <Button label="Afficher plus" variant="secondary" onPress={() => setShownCount(shownCount + RESULTS_STEP)} />
            </View>
          )}
          {!hasMore && (total ?? 0) > SEARCH_LIMIT && (
            <Text variant="caption" tone="muted" style={styles.narrow}>
              Seuls les {SEARCH_LIMIT} premiers s’affichent. Ajoute l’extension ou le numéro pour affiner, par exemple « Pikachu 151 ».
            </Text>
          )}
        </Animated.View>
      )}
    </View>
  );
}

interface SearchCardTileProps {
  card: Card;
  setName: string | undefined;
  ownedQuantity: number;
  wished: boolean;
}

const SearchCardTile = memo(function SearchCardTile({ card, setName, ownedQuantity, wished }: SearchCardTileProps) {
  return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${card.name}, ${setName ?? card.setId} ${card.localId}`}
        onPress={() => router.push({ pathname: '/card/[cardId]', params: { cardId: card.id } })}
        style={styles.tile}>
        <View>
          <CardImage imageUrl={card.imageUrl} quality="low" label={card.name} />
          {ownedQuantity > 0 && (
            <View style={[styles.badge, styles.ownedBadge]}>
              <Text variant="overline" style={{ color: colors.accentText }}>
                ×{ownedQuantity}
              </Text>
            </View>
          )}
          {wished && (
            <View style={[styles.badge, styles.wishBadge]}>
              <Text variant="caption" style={{ color: colors.text }}>
                ♥
              </Text>
            </View>
          )}
        </View>
        <Text variant="caption" numberOfLines={1}>
          {card.name}
        </Text>
        <Text variant="caption" tone="faint" numberOfLines={1}>
          {setName ?? card.setId} · {card.localId}
        </Text>
      </PressableScale>
  );
});

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
    marginHorizontal: -spacing.xs,
  },
  tile: {
    width: `${100 / COLUMNS}%`,
    paddingHorizontal: spacing.xs,
    gap: 2,
  },
  narrow: {
    width: '100%',
    paddingHorizontal: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  ownedBadge: {
    right: spacing.xs,
    backgroundColor: colors.accent,
  },
  wishBadge: {
    left: spacing.xs,
    backgroundColor: colors.wish,
  },
});
