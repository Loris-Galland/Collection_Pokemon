import type { Copy } from '@collection/shared/compiled';

import { db } from './db.js';

/** A copy as stored, one document each. The owner is a field, so a request can only ever reach its own copies. */
export interface CopyDocument extends Copy {
  userId: string;
}

export const copies = () => db.collection<CopyDocument>('copy');

/** A change the server has already saved, kept for a while so that the same change sent again is not saved twice. */
export interface AppliedChangeDocument {
  userId: string;
  changeId: string;
  appliedAt: Date;
}

export const appliedChanges = () => db.collection<AppliedChangeDocument>('appliedCollectionChange');

/**
 * Apart from the rest of the collection code on purpose. The sign in imports it, and it must keep working even if the
 * compiled shared package failed to deploy.
 */
export async function deleteCollection(userId: string): Promise<void> {
  await Promise.all([copies().deleteMany({ userId }), appliedChanges().deleteMany({ userId })]);
}
