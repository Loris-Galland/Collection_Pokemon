// TCGdex client. Turns API responses into domain types.
// Docs at https://tcgdex.dev

import {
  createSearchIndex,
  isPocketSet,
  readCardmarketPrices,
  searchIndex,
  readCardmarketTrends,
  type Card,
  type CardSet,
  type CardmarketPricing,
  type Language,
  type Price,
  type PriceTrend,
  type SearchEntry,
  type Variant,
} from '@collection/shared';

import { POKEMON_TCG_IMAGES } from './pokemon-tcg-images.ts';

const API_URL = 'https://api.tcgdex.net/v2';

/** The only image host we accept, so a tampered response cannot make the app load an image from elsewhere. */
const ASSETS_ORIGIN = 'https://assets.tcgdex.net/';

function assetUrl(url: string | undefined): string | undefined {
  return url?.startsWith(ASSETS_ORIGIN) ? url : undefined;
}

// A card id is made of the set id and the card number, joined by a hyphen.
const setIdOf = (cardId: string) => cardId.slice(0, cardId.lastIndexOf('-'));

/** The picture of a card that TCGdex lacks in every language or announces without having. */
function pokemonTcgImage(cardId: string): string | undefined {
  return POKEMON_TCG_IMAGES[setIdOf(cardId)]?.images[cardId];
}

interface ApiCardCount {
  official: number;
  total: number;
}

interface ApiSetSummary {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount: ApiCardCount;
}

interface ApiCardSummary {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

interface ApiSet extends ApiSetSummary {
  releaseDate?: string;
  cards: ApiCardSummary[];
}

interface ApiCard extends ApiCardSummary {
  rarity?: string;
  set: ApiSetSummary;
  variants?: Partial<Record<'normal' | 'reverse' | 'holo' | 'firstEdition', boolean>>;
  pricing?: {
    cardmarket?: CardmarketPricing | null;
  };
}

export interface SetWithCards {
  set: CardSet;
  cards: Card[];
}

export interface CardDetail {
  card: Card;
  set: CardSet;
  prices: Price[];
  trends: PriceTrend[];
}

export type ImageQuality = 'low' | 'high';

/** Calls the TCGdex API in the requested language and returns the JSON. */
async function get<T>(language: Language, path: string): Promise<T> {
  const response = await fetch(`${API_URL}/${language}${path}`);
  if (!response.ok) throw new Error(`TCGdex returned ${response.status} for ${path}`);
  return (await response.json()) as T;
}

/** TCGdex lacks many pictures in one language that it has in the other, and a card looks the same in both. */
function otherLanguage(language: Language): Language {
  return language === 'fr' ? 'en' : 'fr';
}

const fallbackSets = new Map<string, Promise<ApiSet | undefined>>();

/** A set in the other language, to fill in its missing pictures. Without it the screen just shows fewer of them. */
function fallbackSet(language: Language, setId: string): Promise<ApiSet | undefined> {
  const key = `${language}/${setId}`;
  let set = fallbackSets.get(key);
  if (!set) {
    set = get<ApiSet>(otherLanguage(language), `/sets/${encodeURIComponent(setId)}`).catch(() => {
      fallbackSets.delete(key);
      return undefined;
    });
    fallbackSets.set(key, set);
  }
  return set;
}

/** The pictures of some sets, by card id. */
function imagesByCard(sets: (ApiSet | undefined)[]): Map<string, string | undefined> {
  return new Map(sets.flatMap((set) => set?.cards.map((card) => [card.id, card.image] as const) ?? []));
}

/**
 * TCGdex returns a base URL, to which we add the quality and the format. A picture from the table is already the small
 * one, and its large one sits at a known address.
 */
export function cardImageUrl(baseUrl: string | undefined, quality: ImageQuality): string | undefined {
  if (!baseUrl) return undefined;
  if (baseUrl.startsWith(ASSETS_ORIGIN)) return `${baseUrl}/${quality}.webp`;
  if (quality === 'low') return baseUrl;
  return baseUrl.replace(/\/small$/, '/large').replace(/\.png$/, '_hires.png');
}

/** Converts a TCGdex set into a domain `CardSet`. */
function toCardSet(api: ApiSetSummary & { releaseDate?: string }): CardSet {
  return {
    id: api.id,
    name: api.name,
    logoUrl: POKEMON_TCG_IMAGES[api.id]?.logo ?? assetUrl(api.logo && `${api.logo}.webp`),
    symbolUrl: assetUrl(api.symbol && `${api.symbol}.webp`),
    releaseDate: api.releaseDate,
    cardCount: { official: api.cardCount.official, total: api.cardCount.total },
  };
}

/** Lists the variants that exist for a card, normal by default. */
function toVariants(api: ApiCard['variants']): Variant[] {
  const variants: Variant[] = [];
  if (api?.normal) variants.push('normal');
  if (api?.holo) variants.push('holo');
  if (api?.reverse) variants.push('reverse');
  if (api?.firstEdition) variants.push('first-edition');
  return variants.length > 0 ? variants : ['normal'];
}

/** Sets, from newest to oldest. */
export async function fetchSets(language: Language): Promise<CardSet[]> {
  const [sets, fallbacks] = await Promise.all([
    get<ApiSetSummary[]>(language, '/sets'),
    get<ApiSetSummary[]>(otherLanguage(language), '/sets').catch(() => []),
  ]);
  const fallbackById = new Map(fallbacks.map((set) => [set.id, set]));
  return sets
    .filter((set) => set.cardCount.total > 0 && !isPocketSet(set.id))
    .map((set) => {
      const fallback = fallbackById.get(set.id);
      return toCardSet({ ...set, logo: set.logo ?? fallback?.logo, symbol: set.symbol ?? fallback?.symbol });
    })
    .reverse();
}

/** Loads a set and the list of its cards. */
export async function fetchSet(language: Language, setId: string): Promise<SetWithCards> {
  const api = await get<ApiSet>(language, `/sets/${encodeURIComponent(setId)}`);
  const complete = api.logo && api.symbol && api.cards.every((card) => card.image);
  const fallback = complete ? undefined : await fallbackSet(language, setId);
  const fallbackImages = imagesByCard([fallback]);
  return {
    set: toCardSet({ ...api, logo: api.logo ?? fallback?.logo, symbol: api.symbol ?? fallback?.symbol }),
    cards: api.cards.map((card) => ({
      id: card.id,
      setId: api.id,
      localId: card.localId,
      name: card.name,
      imageUrl: pokemonTcgImage(card.id) ?? assetUrl(card.image ?? fallbackImages.get(card.id)),
      // Variant details are only known once the card itself is loaded.
      variants: [],
    })),
  };
}

/** Loads the details of a card, meaning its variants, set and prices. */
export async function fetchCard(language: Language, cardId: string): Promise<CardDetail> {
  const api = await get<ApiCard>(language, `/cards/${encodeURIComponent(cardId)}`);
  const fallback = api.image
    ? undefined
    : await get<ApiCardSummary>(otherLanguage(language), `/cards/${encodeURIComponent(cardId)}`).catch(() => undefined);
  const card: Card = {
    id: api.id,
    setId: api.set.id,
    localId: api.localId,
    name: api.name,
    imageUrl: pokemonTcgImage(api.id) ?? assetUrl(api.image ?? fallback?.image),
    rarity: api.rarity,
    variants: toVariants(api.variants),
  };
  const market = api.pricing?.cardmarket;
  return {
    card,
    set: toCardSet(api.set),
    prices: readCardmarketPrices(card, market),
    trends: readCardmarketTrends(card, market),
  };
}

/** Maximum number of cards shown by a search. Past that, a few more words narrow it better than scrolling. */
export const SEARCH_LIMIT = 60;

export interface CardSearchResult {
  cards: Card[];
  /** How many cards match, which can be more than the ones returned. */
  total: number;
}

const INDEX_SLICE_SIZE = 1500;

const searchIndexes = new Map<Language, Promise<SearchEntry<ApiCardSummary>[]>>();

interface CardToIndex {
  card: ApiCardSummary;
  setName: string;
}

/** Thousands of names take a moment to prepare, so the phone gets to draw between slices and typing stays smooth. */
async function buildIndexInSlices(cards: readonly CardToIndex[]): Promise<SearchEntry<ApiCardSummary>[]> {
  const index: SearchEntry<ApiCardSummary>[] = [];
  for (let start = 0; start < cards.length; start += INDEX_SLICE_SIZE) {
    const slice = createSearchIndex(cards.slice(start, start + INDEX_SLICE_SIZE), ({ card, setName }) => ({
      name: card.name,
      localId: card.localId,
      setName,
    }));
    for (const entry of slice) index.push({ ...entry, item: entry.item.card });
    await new Promise((resolve) => setTimeout(resolve));
  }
  return index;
}

/** Every card of a language, newest sets first. It is a few megabytes, so it loads once, on the first search. */
function loadSearchIndex(language: Language): Promise<SearchEntry<ApiCardSummary>[]> {
  let index = searchIndexes.get(language);
  if (!index) {
    index = Promise.all([
      get<ApiCardSummary[]>(language, '/cards'),
      get<ApiSetSummary[]>(language, '/sets'),
    ]).then(([cards, sets]) => {
      const setPosition = new Map(sets.map((set, position) => [set.id, { name: set.name, position }]));
      const newestFirst = cards
        .filter((card) => !isPocketSet(setIdOf(card.id)))
        .map((card) => {
          const set = setPosition.get(setIdOf(card.id));
          return { card, setName: set?.name ?? '', position: set?.position ?? -1 };
        })
        .sort((a, b) => b.position - a.position);
      return buildIndexInSlices(newestFirst);
    });
    index.catch(() => searchIndexes.delete(language));
    searchIndexes.set(language, index);
  }
  return index;
}

/** Starts loading the list of cards ahead of a search. A failure only means the search itself tries again. */
export function prepareCardSearch(language: Language): void {
  loadSearchIndex(language).catch(() => undefined);
}

/** Cards in the catalog language matching the query, also by their name in the other language when nothing else does. */
async function matchingCards(language: Language, query: string): Promise<ApiCardSummary[]> {
  const index = await loadSearchIndex(language);
  const matches = searchIndex(index, query);
  if (matches.length > 0) return matches;
  const foreign = await loadSearchIndex(otherLanguage(language)).catch(() => []);
  const byId = new Map(index.map((entry) => [entry.item.id, entry.item]));
  return searchIndex(foreign, query).flatMap((card) => byId.get(card.id) ?? []);
}

/** Searches cards by name, set or number across every set. */
export async function searchCards(language: Language, query: string): Promise<CardSearchResult> {
  const matches = await matchingCards(language, query);
  const shown = matches.slice(0, SEARCH_LIMIT);
  const setsToFill = new Set(shown.filter((card) => !card.image).map((card) => setIdOf(card.id)));
  const fallbackImages = imagesByCard(await Promise.all([...setsToFill].map((id) => fallbackSet(language, id))));
  return {
    total: matches.length,
    cards: shown.map((card) => ({
      id: card.id,
      setId: setIdOf(card.id),
      localId: card.localId,
      name: card.name,
      imageUrl: pokemonTcgImage(card.id) ?? assetUrl(card.image ?? fallbackImages.get(card.id)),
      variants: [],
    })),
  };
}
