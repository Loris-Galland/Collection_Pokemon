import {
  computeCollectionValue,
  computeValueTrend,
  priceKey,
  type CollectionValue,
  type Price,
  type PriceTrend,
  type ValueTrend,
} from '@collection/shared';
import { useMemo } from 'react';

import { useCards } from '@/features/catalog/hooks';
import type { CardDetail } from '@/features/catalog/tcgdex';

import { useCopies } from './collection-provider';

/**
 * Prototype only. Prices come from the details of each card on TCGdex, which are cached, so adding a card only loads
 * that card. Later the server will fetch them once a day.
 */
export function useCollectionValue(): {
  value: CollectionValue;
  valueTrend: ValueTrend | undefined;
  /** Details of each owned card, by card id. */
  cards: ReadonlyMap<string, CardDetail>;
  /** Price of each owned card and variant, by `priceKey`. */
  prices: ReadonlyMap<string, Price>;
  loading: boolean;
} {
  const copies = useCopies();
  const cardIds = useMemo(() => [...new Set(copies.map((copy) => copy.cardId))], [copies]);
  const { cards, loading } = useCards(cardIds);

  const prices = useMemo(() => {
    const byKey = new Map<string, Price>();
    for (const detail of cards.values()) {
      for (const price of detail.prices) byKey.set(priceKey(price.cardId, price.variant), price);
    }
    return byKey;
  }, [cards]);

  const value = useMemo(() => computeCollectionValue(copies, prices), [copies, prices]);

  const valueTrend = useMemo(() => {
    const trends = new Map<string, PriceTrend>();
    for (const detail of cards.values()) {
      for (const trend of detail.trends) trends.set(priceKey(trend.cardId, trend.variant), trend);
    }
    return computeValueTrend(copies, trends);
  }, [copies, cards]);

  return { value, valueTrend, cards, prices, loading: cardIds.length > 0 && loading };
}
