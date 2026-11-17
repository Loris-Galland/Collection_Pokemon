// Changes to the wishes, as the phone sends them to the server. Each one is applied once, like a collection change.

import { isCatalogId, isPhoneId } from './collection.ts';
import {
  WISHLIST_NAME_MAX_LENGTH,
  addWish,
  addWishlist,
  removeWish,
  removeWishlist,
  renameWishlist,
  type Wish,
  type Wishes,
  type Wishlist,
} from './wishlist.ts';

/** Most wishes one account can hold, so that one account cannot fill the free database. */
export const MAX_WISHES_PER_ACCOUNT = 2000;
/** Most wishlists one account can hold. */
export const MAX_WISHLISTS_PER_ACCOUNT = 50;
/** Most wishes in one import or one removal, so a request stays small. */
export const MAX_WISHES_PER_IMPORT = 500;

/**
 * A change to the wishes. `import` sends the wishes saved on the phone before they moved to the server, in batches. A
 * wish or a list already on the server is kept as it is.
 */
export type WishlistChange =
  | { type: 'create-list'; wishlist: Wishlist }
  | { type: 'rename-list'; wishlistId: string; name: string }
  | { type: 'remove-list'; wishlistId: string }
  | { type: 'add-wish'; wish: Wish }
  /** Removes the wishes for these cards, one card or the cards just added to the collection. */
  | { type: 'remove-wishes'; cardIds: string[] }
  | { type: 'import'; wishlists: Wishlist[]; wishes: Wish[] };

/** Applies a change the way the server does, so the phone shows the same result before the server answers. */
export function applyWishlistChange(state: Wishes, change: WishlistChange): Wishes {
  switch (change.type) {
    case 'create-list':
      return addWishlist(state, change.wishlist);
    case 'rename-list':
      return renameWishlist(state, change.wishlistId, change.name);
    case 'remove-list':
      return removeWishlist(state, change.wishlistId);
    case 'add-wish':
      return addWish(state, change.wish);
    case 'remove-wishes':
      return change.cardIds.reduce(removeWish, state);
    case 'import': {
      const withLists = change.wishlists.reduce(addWishlist, state);
      const wished = new Set(withLists.wishes.map((wish) => wish.cardId));
      // A card already wished keeps its wish, so an import never moves what the account did since.
      return change.wishes
        .filter((wish) => !wished.has(wish.cardId))
        .reduce((current, wish) => addWish(current, wish), withLists);
    }
  }
}

/** Why a change would break a limit, or undefined when it fits. */
export function wishlistLimitOf(
  state: Wishes,
  change: WishlistChange,
): 'too-many-wishes' | 'too-many-lists' | undefined {
  const next = applyWishlistChange(state, change);
  if (next.wishlists.length > MAX_WISHLISTS_PER_ACCOUNT && next.wishlists.length > state.wishlists.length) {
    return 'too-many-lists';
  }
  if (next.wishes.length > MAX_WISHES_PER_ACCOUNT && next.wishes.length > state.wishes.length) return 'too-many-wishes';
  return undefined;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isDate = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));

const isName = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= WISHLIST_NAME_MAX_LENGTH;

function isValidWishlist(value: unknown): value is Wishlist {
  return isRecord(value) && isPhoneId(value.id) && isName(value.name) && isDate(value.createdAt);
}

function isValidWish(value: unknown): value is Wish {
  return (
    isRecord(value) &&
    isCatalogId(value.cardId) &&
    isCatalogId(value.setId) &&
    value.cardId.startsWith(`${value.setId}-`) &&
    isPhoneId(value.wishlistId) &&
    isDate(value.addedAt)
  );
}

/** Checks that a change received from the phone is well formed before it touches the wishes. */
export function isWishlistChange(value: unknown): value is WishlistChange {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case 'create-list':
      return isValidWishlist(value.wishlist);
    case 'rename-list':
      return isPhoneId(value.wishlistId) && isName(value.name);
    case 'remove-list':
      return isPhoneId(value.wishlistId);
    case 'add-wish':
      return isValidWish(value.wish);
    case 'remove-wishes':
      return (
        Array.isArray(value.cardIds) &&
        value.cardIds.length > 0 &&
        value.cardIds.length <= MAX_WISHES_PER_IMPORT &&
        value.cardIds.every(isCatalogId)
      );
    case 'import':
      return (
        Array.isArray(value.wishlists) &&
        Array.isArray(value.wishes) &&
        value.wishlists.length <= MAX_WISHLISTS_PER_ACCOUNT &&
        value.wishes.length <= MAX_WISHES_PER_IMPORT &&
        value.wishlists.length + value.wishes.length > 0 &&
        value.wishlists.every(isValidWishlist) &&
        value.wishes.every(isValidWish)
      );
    default:
      return false;
  }
}
