import type { Wish, Wishlist } from '@collection/shared/compiled';

import { db } from './db.js';
import type { AppliedChangeDocument } from './copies.js';

/** A wishlist as stored, one document each, with its owner. */
export interface WishlistDocument extends Wishlist {
  userId: string;
}

/** A wish as stored, one document each, with its owner. */
export interface WishDocument extends Wish {
  userId: string;
}

export const wishlists = () => db.collection<WishlistDocument>('wishlist');
export const wishes = () => db.collection<WishDocument>('wish');
export const appliedWishlistChanges = () => db.collection<AppliedChangeDocument>('appliedWishlistChange');

/**
 * Apart from the rest of the wishlist code on purpose, like `deleteCollection`. The sign in and the collection import
 * it, and they must keep working even if the compiled shared package failed to deploy.
 */
export async function deleteWishes(userId: string): Promise<void> {
  await Promise.all([
    wishlists().deleteMany({ userId }),
    wishes().deleteMany({ userId }),
    appliedWishlistChanges().deleteMany({ userId }),
  ]);
}
