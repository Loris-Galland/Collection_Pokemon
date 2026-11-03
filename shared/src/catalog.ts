// The catalog, meaning what exists regardless of who owns it.

export type Language = 'fr' | 'en';

export const LANGUAGES: readonly Language[] = ['fr', 'en'];

export const LANGUAGE_LABELS: Record<Language, string> = { fr: 'Français', en: 'Anglais' };

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language);
}

export type Variant = 'normal' | 'holo' | 'reverse' | 'first-edition';

export const VARIANT_LABELS: Record<Variant, string> = {
  normal: 'Normale',
  holo: 'Holo',
  reverse: 'Reverse holo',
  'first-edition': '1re édition',
};

/** The variant to add when several cards are added at once, the first one the card has when it lacks the wanted one. */
export function pickVariant(available: readonly Variant[], preferred: Variant): Variant {
  return available.includes(preferred) ? preferred : (available[0] ?? 'normal');
}

export function isVariant(value: unknown): value is Variant {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(VARIANT_LABELS, value);
}

/** TCG Pocket is a phone game, so its cards cannot be part of a physical collection. Its set ids look like A1a or P-A. */
export function isPocketSet(setId: string): boolean {
  return /^([A-Z]\d+[a-z]?|P-[A-Z])$/.test(setId);
}

/** Set. Named `CardSet` so it does not shadow the native JavaScript `Set`. */
export interface CardSet {
  id: string;
  name: string;
  logoUrl?: string;
  symbolUrl?: string;
  releaseDate?: string;
  cardCount: {
    /** Number printed on the cards, the "165" in 006/165. */
    official: number;
    /** Every card, secret ones included. This is the total used for progress. */
    total: number;
  };
}

/** Card. An entry of the catalog, never an owned object. */
export interface Card {
  id: string;
  setId: string;
  /** Number within the set, as printed, for example "006". */
  localId: string;
  name: string;
  imageUrl?: string;
  rarity?: string;
  variants: Variant[];
}

/** Average Cardmarket price, indicative only, for a card in a given variant. */
export interface Price {
  cardId: string;
  variant: Variant;
  amount: number;
  currency: 'EUR';
  updatedAt: string;
}

/**
 * Price trend, meaning the recent Cardmarket averages of a card in a given variant. It is not a day by day history,
 * which will come from the daily snapshots recorded by the server.
 */
export interface PriceTrend {
  cardId: string;
  variant: Variant;
  /** Average sale prices over 30, 7 and 1 day. */
  avg30?: number;
  avg7?: number;
  avg1?: number;
  /** Trend price computed by Cardmarket. */
  trend?: number;
  /** Lowest price currently offered. */
  low?: number;
  updatedAt: string;
}

/** Price of the cheapest variant, which is the minimum cost of getting the card. */
export function cheapestPrice(prices: readonly Price[]): Price | undefined {
  let cheapest: Price | undefined;
  for (const price of prices) if (!cheapest || price.amount < cheapest.amount) cheapest = price;
  return cheapest;
}

/** Unique key of a price, used to find it in a Map. */
export function priceKey(cardId: string, variant: Variant): string {
  return `${cardId}:${variant}`;
}
