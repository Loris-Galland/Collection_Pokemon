import { moveJson, removeJson } from '@/lib/storage';

// Saved before accounts existed, with no owner.
const LEGACY_COLLECTION_KEY = 'collection/v1';
const LEGACY_WISHLIST_KEY = 'wishlist/v1';
const COLLECTION_CACHE_KEY = 'collection-cache/v1';
const COLLECTION_OUTBOX_KEY = 'collection-outbox/v1';
const WISHLIST_CACHE_KEY = 'wishlist-cache/v1';
const WISHLIST_OUTBOX_KEY = 'wishlist-outbox/v1';

const VISITOR = 'visitor';

// Each account has its own keys, so people sharing a phone never see each other's data after a sign out. Under
// `collectionKey` an account keeps what it saved on the phone before its collection moved to the server.
export const collectionKey = (userId: string | undefined) => `${LEGACY_COLLECTION_KEY}/${userId ?? VISITOR}`;
/** The copy of the collection last read from the server, shown when the phone is offline. */
export const collectionCacheKey = (userId: string) => `${COLLECTION_CACHE_KEY}/${userId}`;
/** The changes made while the server could not be reached, until it has them. */
export const collectionOutboxKey = (userId: string) => `${COLLECTION_OUTBOX_KEY}/${userId}`;
/** The wishes last read from the server, changes not yet sent included. */
export const wishlistCacheKey = (userId: string) => `${WISHLIST_CACHE_KEY}/${userId}`;
/** The wish changes made while the server could not be reached. */
export const wishlistOutboxKey = (userId: string) => `${WISHLIST_OUTBOX_KEY}/${userId}`;
// Under `wishlistKey` an account keeps what it saved on the phone before its wishes moved to the server.
export const wishlistKey = (userId: string | undefined) => `${LEGACY_WISHLIST_KEY}/${userId ?? VISITOR}`;

/** Gives what was saved before accounts existed to the first account that signs in on this phone. */
export async function adoptLegacyData(userId: string): Promise<void> {
  await moveJson(LEGACY_COLLECTION_KEY, collectionKey(userId));
  await moveJson(LEGACY_WISHLIST_KEY, wishlistKey(userId));
}

/** Removes what an account saved on this phone, once the account is deleted. */
export function removeLocalData(userId: string): Promise<void> {
  return removeJson([
    collectionKey(userId),
    collectionCacheKey(userId),
    collectionOutboxKey(userId),
    wishlistKey(userId),
    wishlistCacheKey(userId),
    wishlistOutboxKey(userId),
  ]);
}
