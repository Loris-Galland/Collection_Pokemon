// The catalog, meaning what exists regardless of who owns it.

/** Print language of a copy. Every language TCGdex knows, so any copy can be described. */
export type Language =
  | 'fr'
  | 'en'
  | 'de'
  | 'es'
  | 'it'
  | 'pt'
  | 'nl'
  | 'pl'
  | 'ru'
  | 'ja'
  | 'ko'
  | 'zh-tw'
  | 'zh-cn'
  | 'th'
  | 'id';

export const LANGUAGES: readonly Language[] = [
  'fr',
  'en',
  'de',
  'es',
  'it',
  'pt',
  'nl',
  'pl',
  'ru',
  'ja',
  'ko',
  'zh-tw',
  'zh-cn',
  'th',
  'id',
];

/** Name of each language written in that language, shown next to the translated name. */
export const LANGUAGE_NATIVE_NAMES: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  pl: 'Polski',
  ru: 'Русский',
  ja: '日本語',
  ko: '한국어',
  'zh-tw': '繁體中文',
  'zh-cn': '简体中文',
  th: 'ไทย',
  id: 'Bahasa Indonesia',
};

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language);
}

/**
 * Languages of the international catalog, where a card keeps the same id and number in every language. Asian cards
 * belong to other sets, so their catalog is a separate one.
 */
export type CatalogLanguage = 'fr' | 'en' | 'de' | 'es' | 'it' | 'pt';

export const CATALOG_LANGUAGES: readonly CatalogLanguage[] = ['fr', 'en', 'de', 'es', 'it', 'pt'];

export function isCatalogLanguage(value: unknown): value is CatalogLanguage {
  return CATALOG_LANGUAGES.includes(value as CatalogLanguage);
}

export type Variant = 'normal' | 'holo' | 'reverse' | 'first-edition';

/** Every variant. Their names are translated by the app. */
export const VARIANTS: readonly Variant[] = ['normal', 'holo', 'reverse', 'first-edition'];

/** The variant to add when several cards are added at once, the first one the card has when it lacks the wanted one. */
export function pickVariant(available: readonly Variant[], preferred: Variant): Variant {
  return available.includes(preferred) ? preferred : (available[0] ?? 'normal');
}

export function isVariant(value: unknown): value is Variant {
  return VARIANTS.includes(value as Variant);
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
