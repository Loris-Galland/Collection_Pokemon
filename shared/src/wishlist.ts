// Wishes, meaning the cards a user wants to get, sorted into wishlists the user names.

import { cheapestPrice, type Price } from './catalog.ts';
import type { Copy } from './collection.ts';

/** Wishlist. A list the user creates and names, for example "Fire deck", to sort wishes. */
export interface Wishlist {
  id: string;
  name: string;
  /** Date it was created, in ISO format. */
  createdAt: string;
}

/**
 * Wish. A card a user wants to get. It applies to the card, not to a variant or a language, so owning the card in any
 * form fulfils it. A card is a wish in one wishlist at most.
 */
export interface Wish {
  cardId: string;
  setId: string;
  wishlistId: string;
  /** Date it was added, in ISO format. */
  addedAt: string;
}

/** Every wishlist of an account and their wishes, from newest to oldest. */
export interface Wishes {
  wishlists: Wishlist[];
  wishes: Wish[];
}

export const NO_WISHES: Wishes = { wishlists: [], wishes: [] };

/** Longest name a wishlist can have, so it fits on a tile. */
export const WISHLIST_NAME_MAX_LENGTH = 40;

/** The name as it will be saved, or undefined when it is empty. */
export function cleanWishlistName(name: string): string | undefined {
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, WISHLIST_NAME_MAX_LENGTH);
  return clean.length > 0 ? clean : undefined;
}

/** Adds a wishlist at the top. */
export function addWishlist(state: Wishes, wishlist: Wishlist): Wishes {
  if (state.wishlists.some((entry) => entry.id === wishlist.id)) return state;
  return { ...state, wishlists: [wishlist, ...state.wishlists] };
}

export function renameWishlist(state: Wishes, wishlistId: string, name: string): Wishes {
  return {
    ...state,
    wishlists: state.wishlists.map((entry) => (entry.id === wishlistId ? { ...entry, name } : entry)),
  };
}

/** Removes a wishlist and the wishes it holds. */
export function removeWishlist(state: Wishes, wishlistId: string): Wishes {
  return {
    wishlists: state.wishlists.filter((entry) => entry.id !== wishlistId),
    wishes: state.wishes.filter((wish) => wish.wishlistId !== wishlistId),
  };
}

/**
 * Puts a card at the top of a wishlist. A card already wished in another wishlist moves to this one, so it is never in
 * two. A wishlist that does not exist changes nothing.
 */
export function addWish(state: Wishes, wish: Wish): Wishes {
  if (!state.wishlists.some((entry) => entry.id === wish.wishlistId)) return state;
  const current = state.wishes.find((entry) => entry.cardId === wish.cardId);
  if (current?.wishlistId === wish.wishlistId) return state;
  return { ...state, wishes: [wish, ...state.wishes.filter((entry) => entry.cardId !== wish.cardId)] };
}

/** Removes the wish for a card, whatever its wishlist. */
export function removeWish(state: Wishes, cardId: string): Wishes {
  if (!state.wishes.some((entry) => entry.cardId === cardId)) return state;
  return { ...state, wishes: state.wishes.filter((entry) => entry.cardId !== cardId) };
}

/** The wishes of one wishlist, newest first. */
export function wishesOf(state: Wishes, wishlistId: string): Wish[] {
  return state.wishes.filter((wish) => wish.wishlistId === wishlistId);
}

/**
 * An owned card is no longer a wish. Removes the cards found in the collection and returns them separately, so they can
 * be announced.
 */
export function removeObtainedWishes(state: Wishes, copies: readonly Copy[]): { state: Wishes; obtained: Wish[] } {
  const owned = new Set(copies.map((copy) => copy.cardId));
  const obtained = state.wishes.filter((entry) => owned.has(entry.cardId));
  if (obtained.length === 0) return { state, obtained };
  return { state: { ...state, wishes: state.wishes.filter((entry) => !owned.has(entry.cardId)) }, obtained };
}

/** What some wishes would cost, taking the cheapest variant of each card. */
export interface WishlistCost {
  amount: number;
  currency: 'EUR';
  /** Wishes with no known price count as 0 €, and the UI must say so. */
  unpricedCount: number;
}

/** Cost of some wishes, based on the known prices of each card. */
export function computeWishlistCost(
  wishes: readonly Wish[],
  pricesByCard: ReadonlyMap<string, readonly Price[]>,
): WishlistCost {
  let amount = 0;
  let unpricedCount = 0;
  for (const wish of wishes) {
    const price = cheapestPrice(pricesByCard.get(wish.cardId) ?? []);
    if (price) amount += price.amount;
    else unpricedCount += 1;
  }
  return { amount: Math.round(amount * 100) / 100, currency: 'EUR', unpricedCount };
}

export function isWishlist(value: unknown): value is Wishlist {
  if (typeof value !== 'object' || value === null) return false;
  const wishlist = value as Record<string, unknown>;
  return (
    typeof wishlist.id === 'string' &&
    typeof wishlist.name === 'string' &&
    wishlist.name.length > 0 &&
    typeof wishlist.createdAt === 'string'
  );
}

/** Checks that received data (local storage, request) is a valid wish. */
export function isWish(value: unknown): value is Wish {
  if (typeof value !== 'object' || value === null) return false;
  const wish = value as Record<string, unknown>;
  return (
    typeof wish.cardId === 'string' &&
    typeof wish.setId === 'string' &&
    typeof wish.wishlistId === 'string' &&
    typeof wish.addedAt === 'string'
  );
}

/** Wishes saved before wishlists existed, which go into one wishlist with this id. */
export const FIRST_WISHLIST_ID = 'first';

/**
 * Turns saved data back into wishes, keeping whatever is still valid. A plain array is the format from before
 * wishlists, and its wishes go into a first wishlist named `legacyName`. Returns undefined when nothing can be recovered.
 */
export function restoreWishes(value: unknown, legacyName: string, now: string): Wishes | undefined {
  if (Array.isArray(value)) {
    const wishes = value
      .map((entry: unknown) => (typeof entry === 'object' && entry !== null ? { ...entry, wishlistId: FIRST_WISHLIST_ID } : entry))
      .filter(isWish);
    if (wishes.length === 0) return NO_WISHES;
    return { wishlists: [{ id: FIRST_WISHLIST_ID, name: legacyName, createdAt: now }], wishes };
  }
  if (typeof value !== 'object' || value === null) return undefined;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.wishlists) || !Array.isArray(raw.wishes)) return undefined;
  const wishlists = raw.wishlists.filter(isWishlist);
  const ids = new Set(wishlists.map((wishlist) => wishlist.id));
  const seen = new Set<string>();
  // A wish whose wishlist is gone, or a second wish for the same card, is dropped.
  const wishes = raw.wishes.filter(isWish).filter((wish) => {
    if (!ids.has(wish.wishlistId) || seen.has(wish.cardId)) return false;
    seen.add(wish.cardId);
    return true;
  });
  return { wishlists, wishes };
}
