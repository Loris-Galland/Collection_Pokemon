import { computeCollectionValue, priceKey, type CollectionValue, type Price } from '@collection/shared';
import { useMemo } from 'react';

import { useCards } from '@/features/catalog/hooks';

import { useCopies } from './collection-provider';

/**
 * Prototype only. Prices come from the details of each card on TCGdex, which are cached, so adding a card only loads
 * that card. Later the server will fetch them once a day.
 */
export function useCollectionValue(): { value: CollectionValue; loading: boolean } {
  const copies = useCopies();
  const cardIds = useMemo(() => [...new Set(copies.map((copy) => copy.cardId))], [copies]);
  const { cards, loading } = useCards(cardIds);

  const value = useMemo(() => {
    const prices = new Map<string, Price>();
    for (const detail of cards.values()) {
      for (const price of detail.prices) prices.set(priceKey(price.cardId, price.variant), price);
    }
    return computeCollectionValue(copies, prices);
  }, [copies, cards]);

  return { value, loading: cardIds.length > 0 && loading };
}
