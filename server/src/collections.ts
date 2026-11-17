// Every MongoDB collection of our own data, in one place. Better Auth keeps its own collections itself.
//
// This module imports only types from the shared package, never its code. The sign in imports it to erase an account,
// and it must keep working even if the compiled shared package failed to deploy.

import type { Copy, ValueSnapshot, Variant, Wish, Wishlist } from '@collection/shared/compiled';

import { db } from './db.js';

/** A copy as stored, one document each. The owner is a field, so a request can only ever reach its own copies. */
export interface CopyDocument extends Copy {
  userId: string;
}

/** A wishlist as stored, one document each, with its owner. */
export interface WishlistDocument extends Wishlist {
  userId: string;
}

/** A wish as stored, one document each, with its owner. */
export interface WishDocument extends Wish {
  userId: string;
}

/** A change the server has already saved, kept for a while so that the same change sent again is not saved twice. */
export interface AppliedChangeDocument {
  userId: string;
  changeId: string;
  appliedAt: Date;
}

/** The price of a card in one variant, as read from TCGdex on a given day. */
export interface PriceDocument {
  cardId: string;
  variant: Variant;
  amount: number;
  updatedAt: Date;
}

/** When the prices of a card were last read, priced or not, so the oldest ones are read first. */
export interface PriceCheckDocument {
  _id: string;
  checkedAt: Date;
}

export const copies = () => db.collection<CopyDocument>('copy');
export const appliedCollectionChanges = () => db.collection<AppliedChangeDocument>('appliedCollectionChange');
export const wishlists = () => db.collection<WishlistDocument>('wishlist');
export const wishes = () => db.collection<WishDocument>('wish');
export const appliedWishlistChanges = () => db.collection<AppliedChangeDocument>('appliedWishlistChange');
export const prices = () => db.collection<PriceDocument>('price');
export const priceChecks = () => db.collection<PriceCheckDocument>('priceCheck');
export const valueSnapshots = () => db.collection<ValueSnapshot>('valueSnapshot');

/** Erases the collection, the wishes and the value history of an account. */
export async function deleteOwnData(userId: string): Promise<void> {
  const filter = { userId };
  await Promise.all([
    copies().deleteMany(filter),
    appliedCollectionChanges().deleteMany(filter),
    wishlists().deleteMany(filter),
    wishes().deleteMany(filter),
    appliedWishlistChanges().deleteMany(filter),
    valueSnapshots().deleteMany(filter),
  ]);
}
