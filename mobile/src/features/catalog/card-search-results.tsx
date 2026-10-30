import type { Card, CardSet } from '@collection/shared';
import { router } from 'expo-router';
import { memo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';

import { PressableScale, Text, colors, radius, spacing } from '@/ui';

import { CardImage } from './card-image';
import { SEARCH_LIMIT } from './tcgdex';

const TILE_WIDTH = 116;

interface CardSearchResultsProps {
  cards: readonly Card[] | undefined;
  loading: boolean;
  error: boolean;
  /** Used to show the set name under each card. */
  setsById: ReadonlyMap<string, CardSet>;
  /** Badges, meaning the owned quantity of each card and the cards on the wishlist. */
  ownedQuantities: ReadonlyMap<string, number>;
  isWished: (cardId: string) => boolean;
}

/** Card search results, shown as a horizontally scrolling row. */
export function CardSearchResults({
  cards,
  loading,
  error,
  setsById,
  ownedQuantities,
  isWished,
}: CardSearchResultsProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="title">Cartes</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          cards && (
            <Text variant="caption" tone="muted">
              {cards.length === SEARCH_LIMIT
                ? `${SEARCH_LIMIT}+ résultats`
                : `${cards.length} résultat${cards.length > 1 ? 's' : ''}`}
            </Text>
          )
        )}
      </View>

      {error ? (
        <Text tone="muted">Recherche indisponible pour le moment.</Text>
      ) : cards && cards.length === 0 && !loading ? (
        <Text tone="muted">Aucune carte ne porte ce nom.</Text>
      ) : (
        <Animated.View entering={FadeIn.duration(250)}>
          <FlatList
            horizontal
            data={cards}
            keyExtractor={(card) => card.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
            initialNumToRender={6}
            windowSize={5}
            renderItem={({ item, index }) => (
              <SearchCardTile
                card={item}
                index={index}
                setName={setsById.get(item.setId)?.name}
                ownedQuantity={ownedQuantities.get(item.id) ?? 0}
                wished={isWished(item.id)}
              />
            )}
          />
        </Animated.View>
      )}
    </View>
  );
}

interface SearchCardTileProps {
  card: Card;
  index: number;
  setName: string | undefined;
  ownedQuantity: number;
  wished: boolean;
}

const SearchCardTile = memo(function SearchCardTile({
  card,
  index,
  setName,
  ownedQuantity,
  wished,
}: SearchCardTileProps) {
  return (
    <Animated.View
      entering={
        index < 6
          ? FadeInRight.delay(index * 50)
              .springify()
              .damping(18)
          : undefined
      }>
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
    </Animated.View>
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
  row: {
    gap: spacing.md,
  },
  tile: {
    width: TILE_WIDTH,
    gap: 2,
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
