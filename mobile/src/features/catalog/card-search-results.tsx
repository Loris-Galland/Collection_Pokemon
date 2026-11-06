import type { Card, CardSet } from '@collection/shared';
import { router } from 'expo-router';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useWishPicker, type WishCard } from '@/features/wishlist/wish-picker';
import { Button, HeartButton, PokeballLoader, PressableScale, Text, colors, radius, spacing } from '@/ui';

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
  /** Badges, meaning the owned quantity of each card and the hearts of the wished cards. */
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
  const { t } = useTranslation();
  const { toggle, choose } = useWishPicker();
  const [shownCount, setShownCount] = useState(RESULTS_STEP);
  // New results start again from the first rows. This adjusts state during render, as React recommends.
  const [shownFor, setShownFor] = useState(cards);
  if (cards !== shownFor) {
    setShownFor(cards);
    setShownCount(RESULTS_STEP);
  }
  const hasMore = (cards?.length ?? 0) > shownCount;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="title">{t('search.cards')}</Text>
        {loading ? (
          <PokeballLoader size={24} />
        ) : (
          cards && (
            <Text variant="caption" tone="muted">
              {t('search.results', { count: total ?? 0 })}
            </Text>
          )
        )}
      </View>

      {error ? (
        <Text tone="muted">{t('search.unavailable')}</Text>
      ) : cards && cards.length === 0 && !loading ? (
        <Text tone="muted">{t('search.noCard')}</Text>
      ) : (
        <Animated.View entering={FadeIn.duration(250)} style={styles.grid}>
          {(cards ?? []).slice(0, shownCount).map((card) => (
            <SearchCardTile
              key={card.id}
              card={card}
              setName={setsById.get(card.setId)?.name}
              ownedQuantity={ownedQuantities.get(card.id) ?? 0}
              wished={isWished(card.id)}
              onToggleWish={toggle}
              onChooseWishlist={choose}
            />
          ))}
          {hasMore && (
            <View style={styles.narrow}>
              <Button
                label={t('search.showMore')}
                variant="secondary"
                onPress={() => setShownCount(shownCount + RESULTS_STEP)}
              />
            </View>
          )}
          {!hasMore && (total ?? 0) > SEARCH_LIMIT && (
            <Text variant="caption" tone="muted" style={styles.narrow}>
              {t('search.limit', { limit: SEARCH_LIMIT })}
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
  onToggleWish: (card: WishCard) => void;
  onChooseWishlist: (card: WishCard) => void;
}

const SearchCardTile = memo(function SearchCardTile({
  card,
  setName,
  ownedQuantity,
  wished,
  onToggleWish,
  onChooseWishlist,
}: SearchCardTileProps) {
  const { t } = useTranslation();
  const wishCard = { id: card.id, setId: card.setId, name: card.name };
  // The heart sits on top of the tile, not inside it, because nested buttons confuse screen readers.
  return (
    <View style={styles.tile}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${card.name}, ${setName ?? card.setId} ${card.localId}`}
        onPress={() => router.push({ pathname: '/card/[cardId]', params: { cardId: card.id } })}
        style={styles.tileContent}>
        <View>
          <CardImage imageUrl={card.imageUrl} quality="low" label={card.name} />
          {ownedQuantity > 0 && (
            <View style={styles.ownedBadge}>
              <Text variant="overline" style={{ color: colors.accentText }}>
                ×{ownedQuantity}
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
      {ownedQuantity === 0 && (
        <HeartButton
          filled={wished}
          overlay
          size={30}
          accessibilityLabel={t('wishlist.addLabel', { name: card.name })}
          onPress={() => onToggleWish(wishCard)}
          onLongPress={() => onChooseWishlist(wishCard)}
          style={styles.heart}
        />
      )}
    </View>
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
  },
  tileContent: {
    gap: 2,
  },
  narrow: {
    width: '100%',
    paddingHorizontal: spacing.xs,
  },
  ownedBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  heart: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs + spacing.xs,
  },
});
