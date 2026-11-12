// Reading the Cardmarket prices provided by TCGdex. The app and the daily job must read them the same way.

import type { Card, Price, PriceTrend, Variant } from './catalog.ts';

type CardmarketField = 'avg' | 'low' | 'trend' | 'avg1' | 'avg7' | 'avg30';

/** Cardmarket fields for the base print, and the same fields suffixed with `-holo` for the shiny print. */
export type CardmarketPricing = { updated: string } & Partial<
  Record<CardmarketField | `${CardmarketField}-holo`, number | null>
>;

type PricedCard = Pick<Card, 'id' | 'variants'>;

/**
 * Cardmarket only gives two sets of prices per card, such as `avg7` for the base print and `avg7-holo` for the shiny
 * one. A holo card without a normal print has its prices in the base fields. Otherwise holo and reverse both use the
 * `-holo` fields.
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

/**
 * Fields read for the price, in order. The 7 day average follows a drop within days without jumping at each sale. The
 * long average `avg` keeps the launch prices of a set for months, so it only stands in for a card that rarely sells.
 */
const PRICE_FIELDS = ['avg7', 'avg30', 'avg'] as const satisfies readonly CardmarketField[];

/** Price of each variant of a card that has one. */
export function readCardmarketPrices(card: PricedCard, market: CardmarketPricing | null | undefined): Price[] {
  if (!market) return [];
  return card.variants.flatMap((variant) => {
    const amount = PRICE_FIELDS.map((field) => readField(market, card, variant, field)).find(Boolean);
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
