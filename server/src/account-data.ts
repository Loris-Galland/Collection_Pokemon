import type { Copy } from '@collection/shared/compiled';
import { ObjectId } from 'mongodb';

import { clearAccountLimits } from './account-limit.js';
import { deleteAvatar, readAvatar } from './avatar.js';
import { copies, deleteCollection } from './copies.js';
import { db } from './db.js';

// The sign in imports this file. It must only import types from the shared package, so that deleting an account keeps
// working even if the compiled shared package failed to deploy.

/** Everything the server keeps about an account, as the account owner may read it. No secret ever goes in it. */
export interface AccountExport {
  account: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    createdAt: string;
    updatedAt: string;
  };
  signInMethods: { provider: string; accountId: string; createdAt: string }[];
  sessions: {
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    expiresAt: string;
  }[];
  avatarJpegBase64: string | null;
  collection: Copy[];
}

// Better Auth keeps its ids as ObjectId, while our own collections keep them as text.
interface UserDocument {
  _id: ObjectId;
  name: string;
  email: string;
  // The address of the Google picture, for an account made with Google.
  image?: string | null;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AccountDocument {
  providerId: string;
  // The id of the account at the provider, such as the Google id. It is not a secret.
  accountId: string;
  createdAt: Date;
}

interface SessionDocument {
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  expiresAt: Date;
}

const iso = (date: Date) => date.toISOString();

// The limit of a collection (MAX_COPIES_PER_ACCOUNT), written again because that file imports the shared package. Adds
// sent at the same moment can pass the limit a little, and this cap keeps the answer under the size Vercel allows.
const MAX_EXPORTED_COPIES = 10_000;

/**
 * The data of an account, or null when it does not exist. Each field is picked one by one, so a field Better Auth adds
 * later, a password hash or a token never ends up in the export.
 */
export async function exportAccountData(userId: string): Promise<AccountExport | null> {
  if (!ObjectId.isValid(userId)) return null;
  const objectId = new ObjectId(userId);
  const user = await db.collection<UserDocument>('user').findOne({ _id: objectId });
  if (!user) return null;
  const [accounts, sessions, avatar, collection] = await Promise.all([
    db.collection<AccountDocument>('account').find({ userId: objectId }).toArray(),
    db.collection<SessionDocument>('session').find({ userId: objectId }).toArray(),
    readAvatar(userId),
    copies()
      .find({ userId }, { projection: { _id: 0, userId: 0 } })
      .limit(MAX_EXPORTED_COPIES)
      .toArray(),
  ]);
  return {
    account: {
      id: userId,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      emailVerified: Boolean(user.emailVerified),
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      createdAt: iso(user.createdAt),
      updatedAt: iso(user.updatedAt),
    },
    signInMethods: accounts.map((account) => ({
      provider: account.providerId,
      accountId: account.accountId,
      createdAt: iso(account.createdAt),
    })),
    sessions: sessions.map((session) => ({
      ipAddress: session.ipAddress ?? null,
      userAgent: session.userAgent ?? null,
      createdAt: iso(session.createdAt),
      expiresAt: iso(session.expiresAt),
    })),
    avatarJpegBase64: avatar,
    collection,
  };
}

/**
 * First step of a deletion, before Better Auth removes the user. The two-factor secret stays, because a guarded action
 * needs it. If the deletion then fails, the account can still try it again instead of being locked out.
 */
export async function eraseBeforeUserDeletion(userId: string): Promise<void> {
  await Promise.all([deleteAvatar(userId), deleteCollection(userId), clearAccountLimits(userId)]);
}

/**
 * Last step of a deletion, once Better Auth has removed the user, its sessions and its sign in methods. It removes the
 * two-factor secret and the backup codes, which Better Auth leaves, and the rest again in case a request still running
 * wrote something in between.
 */
export async function eraseAfterUserDeletion(userId: string): Promise<void> {
  await Promise.all([
    db.collection('twoFactor').deleteMany({ userId: new ObjectId(userId) }),
    eraseBeforeUserDeletion(userId),
  ]);
}

/**
 * Removes the two-factor secrets whose account is gone. It only happens when the last step of a deletion failed, and the
 * daily job runs it so that such a secret never stays for long. Returns how many were removed.
 */
export async function purgeOrphanTwoFactor(): Promise<number> {
  const orphans = await db
    .collection('twoFactor')
    .aggregate<{ _id: ObjectId }>([
      // Better Auth keeps the owner as an ObjectId. A secret whose owner has another type is left alone, since the look up
      // below would not find its account and would take it for an orphan.
      { $match: { userId: { $type: 'objectId' } } },
      { $lookup: { from: 'user', localField: 'userId', foreignField: '_id', as: 'owner' } },
      { $match: { owner: { $size: 0 } } },
      { $project: { _id: 1 } },
    ])
    .toArray();
  if (orphans.length === 0) return 0;
  return (await db.collection('twoFactor').deleteMany({ _id: { $in: orphans.map(({ _id }) => _id) } })).deletedCount;
}
