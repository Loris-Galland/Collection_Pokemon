import { computeWishlistCost, type Price, type Wish, type WishlistCost } from '@collection/shared';
import { useCallback, useMemo } from 'react';

import { useCards } from '@/features/catalog/hooks';
import type { CardDetail } from '@/features/catalog/tcgdex';

/** Loads the cards of some wishes and tells what any part of them would cost. */
export function useWishCards(wishes: readonly Wish[]): {
  cards: ReadonlyMap<string, CardDetail>;
  loading: boolean;
  costOf: (someWishes: readonly Wish[]) => WishlistCost;
} {
  const cardIds = useMemo(() => wishes.map((wish) => wish.cardId), [wishes]);
  const { cards, loading } = useCards(cardIds);

  const pricesByCard = useMemo(
    () => new Map<string, readonly Price[]>([...cards].map(([cardId, detail]) => [cardId, detail.prices])),
    [cards],
  );
  const costOf = useCallback(
    (someWishes: readonly Wish[]) => computeWishlistCost(someWishes, pricesByCard),
    [pricesByCard],
  );

  return { cards, loading, costOf };
}
