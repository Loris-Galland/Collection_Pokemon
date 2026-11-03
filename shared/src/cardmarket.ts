// Reading the Cardmarket prices provided by TCGdex. The app and the daily job must read them the same way.

import type { Card, Price, PriceTrend, Variant } from './catalog.ts';

type CardmarketField = 'avg' | 'low' | 'trend' | 'avg1' | 'avg7' | 'avg30';

/** Cardmarket fields for the base print, and the same fields suffixed with `-holo` for the shiny print. */
export type CardmarketPricing = { updated: string } & Partial<
  Record<CardmarketField | `${CardmarketField}-holo`, number | null>
>;

type PricedCard = Pick<Card, 'id' | 'variants'>;

/**
 * Cardmarket only gives two prices per card, `avg` for the base print and `avg-holo` for the shiny one. A holo card
 * without a normal print has its price in `avg`. Otherwise holo and reverse both use `avg-holo`.
 */
function priceSuffix(variants: readonly Variant[], variant: Variant): '' | '-holo' | undefined {
  switch (variant) {
    case 'normal':
      return '';
    case 'holo':
      return variants.includes('normal') ? '-holo' : '';
    case 'reverse':
      return '-holo';
    default:
      return undefined;
  }
}

/** Whether the holo and reverse prints of a card show the same price, which the UI must explain. */
export function sharesShinyPrice(variants: readonly Variant[]): boolean {
  return (
    variants.includes('holo') &&
    variants.includes('reverse') &&
    priceSuffix(variants, 'holo') === priceSuffix(variants, 'reverse')
  );
}

/** Reads a Cardmarket field for a variant. Both 0 and null mean there is no data. */
function readField(market: CardmarketPricing, card: PricedCard, variant: Variant, field: CardmarketField) {
  const suffix = priceSuffix(card.variants, variant);
  if (suffix === undefined) return undefined;
  return market[`${field}${suffix}`] || undefined;
}

/** Price of each variant of a card that has one. */
export function readCardmarketPrices(card: PricedCard, market: CardmarketPricing | null | undefined): Price[] {
  if (!market) return [];
  return card.variants.flatMap((variant) => {
    const amount = readField(market, card, variant, 'avg');
    return amount ? [{ cardId: card.id, variant, amount, currency: 'EUR' as const, updatedAt: market.updated }] : [];
  });
}

/** Price trend of each variant that has at least one known average. */
export function readCardmarketTrends(card: PricedCard, market: CardmarketPricing | null | undefined): PriceTrend[] {
  if (!market) return [];
  return card.variants.flatMap((variant) => {
    const read = (field: CardmarketField) => readField(market, card, variant, field);
    const trend: PriceTrend = {
      cardId: card.id,
      variant,
      avg30: read('avg30'),
      avg7: read('avg7'),
      avg1: read('avg1'),
      trend: read('trend'),
      low: read('low'),
      updatedAt: market.updated,
    };
    return trend.avg30 || trend.avg7 || trend.avg1 ? [trend] : [];
  });
}
