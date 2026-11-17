import { isWishlistChange } from '@collection/shared/compiled';

import { accountLimitKeys } from '../src/account-limit.js';
import { changeRoute } from '../src/change-route.js';
import { readWishes, saveWishlistChange } from '../src/wishes.js';

/** The wishlists and wishes of the signed in account, and their changes. */
export const { GET, POST } = changeRoute({
  limitKeys: (userId) => ({
    read: accountLimitKeys(userId).wishesRead,
    write: accountLimitKeys(userId).wishesWrite,
  }),
  read: readWishes,
  isChange: isWishlistChange,
  save: saveWishlistChange,
  refusals: { 'too-many-wishes': 'too_many_wishes', 'too-many-lists': 'too_many_wishlists' },
});
