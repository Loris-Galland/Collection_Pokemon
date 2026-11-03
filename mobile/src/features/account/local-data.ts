import { moveJson, removeJson } from '@/lib/storage';

// Saved before accounts existed, with no owner.
const LEGACY_COLLECTION_KEY = 'collection/v1';
const LEGACY_WISHLIST_KEY = 'wishlist/v1';

const VISITOR = 'visitor';

// Each account has its own keys, so people sharing a phone never see each other's data after a sign out.
export const collectionKey = (userId: string | undefined) => `${LEGACY_COLLECTION_KEY}/${userId ?? VISITOR}`;
export const wishlistKey = (userId: string | undefined) => `${LEGACY_WISHLIST_KEY}/${userId ?? VISITOR}`;

/** Gives what was saved before accounts existed to the first account that signs in on this phone. */
export async function adoptLegacyData(userId: string): Promise<void> {
  await moveJson(LEGACY_COLLECTION_KEY, collectionKey(userId));
  await moveJson(LEGACY_WISHLIST_KEY, wishlistKey(userId));
}

/** Removes what an account saved on this phone, once the account is deleted. */
export function removeLocalData(userId: string): Promise<void> {
  return removeJson([collectionKey(userId), wishlistKey(userId)]);
}
