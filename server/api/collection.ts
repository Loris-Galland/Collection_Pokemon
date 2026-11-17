import { isCollectionChange } from '@collection/shared/compiled';

import { accountLimitKeys } from '../src/account-limit.js';
import { changeRoute } from '../src/change-route.js';
import { readCollection, saveCollectionChange } from '../src/collection.js';

/** The collection of the signed in account, and its changes. */
export const { GET, POST } = changeRoute({
  limitKeys: (userId) => ({
    read: accountLimitKeys(userId).collectionRead,
    write: accountLimitKeys(userId).collectionWrite,
  }),
  read: async (userId) => ({ copies: await readCollection(userId) }),
  isChange: isCollectionChange,
  save: saveCollectionChange,
  refusals: { full: 'collection_full', conflict: 'id_taken' },
});
