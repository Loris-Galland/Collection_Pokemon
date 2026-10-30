// The wishlist, meaning the cards a user wants to get.

import { cheapestPrice, type Price } from './catalog.ts';
import type { Copy } from './collection.ts';

/**
 * Wish. A card a user wants to get. It applies to the card, not to a variant or a language, so owning the card in any
 * form fulfils it.
 */
export interface Wish {
  cardId: string;
  setId: string;
  /** Date it was added, in ISO format. */
  addedAt: string;
}

/** Wishlist, from newest to oldest. */
export type Wishlist = Wish[];

/** Adds a wish at the top of the list. A card already on the list is not duplicated. */
export function addWish(wishlist: Wishlist, wish: Wish): Wishlist {
  if (wishlist.some((entry) => entry.cardId === wish.cardId)) return wishlist;
  return [wish, ...wishlist];
}

/** Removes the wish for a card. */
export function removeWish(wishlist: Wishlist, cardId: string): Wishlist {
  return wishlist.filter((entry) => entry.cardId !== cardId);
}

/**
 * An owned card is no longer a wish. Removes the cards found in the collection and returns them separately, so they can
 * be announced.
 */
export function removeObtainedWishes(
  wishlist: Wishlist,
  copies: readonly Copy[],
): { wishlist: Wishlist; obtained: Wish[] } {
  const owned = new Set(copies.map((copy) => copy.cardId));
  const obtained = wishlist.filter((entry) => owned.has(entry.cardId));
  if (obtained.length === 0) return { wishlist, obtained };
  return { wishlist: wishlist.filter((entry) => !owned.has(entry.cardId)), obtained };
}

/** What the wishlist would cost, taking the cheapest variant of each card. */
export interface WishlistCost {
  amount: number;
  currency: 'EUR';
  /** Wishes with no known price count as 0 €, and the UI must say so. */
  unpricedCount: number;
}

/** Cost of the wishlist, based on the known prices of each card. */
export function computeWishlistCost(
  wishlist: Wishlist,
  pricesByCard: ReadonlyMap<string, readonly Price[]>,
): WishlistCost {
  let amount = 0;
  let unpricedCount = 0;
  for (const wish of wishlist) {
    const price = cheapestPrice(pricesByCard.get(wish.cardId) ?? []);
    if (price) amount += price.amount;
    else unpricedCount += 1;
  }
  return { amount: Math.round(amount * 100) / 100, currency: 'EUR', unpricedCount };
}

/** Checks that received data (local storage, request) is a valid wish. */
export function isWish(value: unknown): value is Wish {
  if (typeof value !== 'object' || value === null) return false;
  const wish = value as Record<string, unknown>;
  return typeof wish.cardId === 'string' && typeof wish.setId === 'string' && typeof wish.addedAt === 'string';
}
