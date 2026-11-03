// TCGdex client. Turns API responses into domain types.
// Docs at https://tcgdex.dev

import {
  readCardmarketPrices,
  readCardmarketTrends,
  type Card,
  type CardSet,
  type CardmarketPricing,
  type Language,
  type Price,
  type PriceTrend,
  type Variant,
} from '@collection/shared';

const API_URL = 'https://api.tcgdex.net/v2';

/** The only image host we accept, so a tampered response cannot make the app load an image from elsewhere. */
const ASSETS_ORIGIN = 'https://assets.tcgdex.net/';

function assetUrl(url: string | undefined): string | undefined {
  return url?.startsWith(ASSETS_ORIGIN) ? url : undefined;
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

/** TCGdex returns a base URL, to which we add the quality and the format. */
export function cardImageUrl(baseUrl: string | undefined, quality: ImageQuality): string | undefined {
  return baseUrl ? `${baseUrl}/${quality}.webp` : undefined;
}

/** Converts a TCGdex set into a domain `CardSet`. */
function toCardSet(api: ApiSetSummary & { releaseDate?: string }): CardSet {
  return {
    id: api.id,
    name: api.name,
    logoUrl: assetUrl(api.logo && `${api.logo}.webp`),
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
  const sets = await get<ApiSetSummary[]>(language, '/sets');
  return sets
    .filter((set) => set.cardCount.total > 0)
    .map(toCardSet)
    .reverse();
}

/** Loads a set and the list of its cards. */
export async function fetchSet(language: Language, setId: string): Promise<SetWithCards> {
  const api = await get<ApiSet>(language, `/sets/${encodeURIComponent(setId)}`);
  return {
    set: toCardSet(api),
    cards: api.cards.map((card) => ({
      id: card.id,
      setId: api.id,
      localId: card.localId,
      name: card.name,
      imageUrl: assetUrl(card.image),
      // Variant details are only known once the card itself is loaded.
      variants: [],
    })),
  };
}

/** Loads the details of a card, meaning its variants, set and prices. */
export async function fetchCard(language: Language, cardId: string): Promise<CardDetail> {
  const api = await get<ApiCard>(language, `/cards/${encodeURIComponent(cardId)}`);
  const card: Card = {
    id: api.id,
    setId: api.set.id,
    localId: api.localId,
    name: api.name,
    imageUrl: assetUrl(api.image),
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

/** Maximum number of cards returned by a search. */
export const SEARCH_LIMIT = 60;

/** Searches cards by name across every set. */
export async function searchCards(language: Language, query: string): Promise<Card[]> {
  const params = `name=${encodeURIComponent(query)}&pagination:itemsPerPage=${SEARCH_LIMIT}`;
  const cards = await get<ApiCardSummary[]>(language, `/cards?${params}`);
  return (
    cards
      .map((card) => ({
        id: card.id,
        // A card id is made of the set id and the card number, joined by a hyphen.
        setId: card.id.slice(0, card.id.lastIndexOf('-')),
        localId: card.localId,
        name: card.name,
        imageUrl: assetUrl(card.image),
        variants: [],
      }))
      // Cards with a preview come first. Those without an image are mostly old promos.
      .sort((a, b) => Number(b.imageUrl !== undefined) - Number(a.imageUrl !== undefined))
  );
}
