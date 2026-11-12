import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { ObjectId } from 'mongodb';

import { loadDb, skipWithoutDatabase } from './test-db.js';

type AccountDataModule = typeof import('../src/account-data.js');
type DbModule = Awaited<ReturnType<typeof loadDb>>;

// Every account the tests saved, removed once they end.
const seeded: ObjectId[] = [];

/** Saves an account the way Better Auth and our routes do, with a secret in every place one is kept. */
async function seedAccount({ db }: DbModule, name: string) {
  const objectId = new ObjectId();
  seeded.push(objectId);
  const userId = objectId.toString();
  const createdAt = new Date('2026-11-01T10:00:00.000Z');
  await db.collection('user').insertOne({
    _id: objectId,
    name,
    email: `${name}@example.com`,
    emailVerified: false,
    image: `https://lh3.googleusercontent.com/${name}`,
    twoFactorEnabled: true,
    createdAt,
    updatedAt: createdAt,
  });
  await db.collection('account').insertOne({
    userId: objectId,
    providerId: 'credential',
    accountId: userId,
    password: `${name}-password-hash`,
    createdAt,
    updatedAt: createdAt,
  });
  await db.collection('session').insertOne({
    userId: objectId,
    token: `${name}-session-token`,
    ipAddress: '203.0.113.7',
    userAgent: 'Expo Go',
    createdAt,
    updatedAt: createdAt,
    expiresAt: new Date('2026-11-08T10:00:00.000Z'),
  });
  await db.collection('twoFactor').insertOne({
    userId: objectId,
    secret: `${name}-two-factor-secret`,
    backupCodes: `${name}-backup-codes`,
  });
  await db.collection('avatar').insertOne({ _id: userId as never, image: `${name}-picture` });
  await db.collection('copy').insertOne({
    userId,
    id: `${name}-copy`,
    cardId: 'sv03.5-006',
    setId: 'sv03.5',
    variant: 'holo',
    language: 'fr',
    condition: 'near-mint',
    quantity: 2,
  });
  await db
    .collection('appliedCollectionChange')
    .insertOne({ userId, changeId: `${name}-change`, appliedAt: createdAt });
  await db.collection('accountLimit').insertOne({
    _id: `${userId}:collection-read` as never,
    count: 1,
    windowStart: 0,
  });
  return userId;
}

describe('account data', { skip: skipWithoutDatabase }, () => {
  let accountData: AccountDataModule;
  let dbModule: DbModule;

  before(async () => {
    dbModule = await loadDb();
    accountData = await import('../src/account-data.js');
  });

  // Removes the accounts the tests saved, the way a real deletion does.
  after(async () => {
    if (!dbModule) return;
    const { db, mongoClient } = dbModule;
    await Promise.all(seeded.map((id) => accountData.eraseAfterUserDeletion(id.toString())));
    await db.collection('user').deleteMany({ _id: { $in: seeded } });
    await Promise.all(
      ['account', 'session'].map((name) => db.collection(name).deleteMany({ userId: { $in: seeded } })),
    );
    await mongoClient.close();
  });

  test('the export holds the account, its sign in methods, its sessions, its picture and its collection', async () => {
    const userId = await seedAccount(dbModule, 'ash');

    assert.deepEqual(await accountData.exportAccountData(userId), {
      account: {
        id: userId,
        name: 'ash',
        email: 'ash@example.com',
        image: 'https://lh3.googleusercontent.com/ash',
        emailVerified: false,
        twoFactorEnabled: true,
        createdAt: '2026-11-01T10:00:00.000Z',
        updatedAt: '2026-11-01T10:00:00.000Z',
      },
      signInMethods: [{ provider: 'credential', accountId: userId, createdAt: '2026-11-01T10:00:00.000Z' }],
      sessions: [
        {
          ipAddress: '203.0.113.7',
          userAgent: 'Expo Go',
          createdAt: '2026-11-01T10:00:00.000Z',
          expiresAt: '2026-11-08T10:00:00.000Z',
        },
      ],
      avatarJpegBase64: 'ash-picture',
      collection: [
        {
          id: 'ash-copy',
          cardId: 'sv03.5-006',
          setId: 'sv03.5',
          variant: 'holo',
          language: 'fr',
          condition: 'near-mint',
          quantity: 2,
        },
      ],
    });
  });

  test('deleting the data of an account leaves nothing of it and keeps the other accounts', async () => {
    const { db } = dbModule;
    const misty = await seedAccount(dbModule, 'misty');
    const brock = await seedAccount(dbModule, 'brock');
    const mistyBefore = await accountData.exportAccountData(misty);

    await accountData.eraseAfterUserDeletion(brock);

    // Better Auth removes the user, its sessions and its sign in methods itself, after this function.
    const left = await Promise.all([
      db.collection('twoFactor').countDocuments({ userId: new ObjectId(brock) }),
      db.collection('avatar').countDocuments({ _id: brock as never }),
      db.collection('copy').countDocuments({ userId: brock }),
      db.collection('appliedCollectionChange').countDocuments({ userId: brock }),
      db.collection('accountLimit').countDocuments({ _id: { $regex: `^${brock}:` } as never }),
    ]);
    assert.deepEqual(left, [0, 0, 0, 0, 0]);
    assert.deepEqual(await accountData.exportAccountData(misty), mistyBefore);
    assert.equal(await db.collection('twoFactor').countDocuments({ userId: new ObjectId(misty) }), 1);
  });

  test('the first step of a deletion keeps the two-factor secret, so a failed deletion can be tried again', async () => {
    const { db } = dbModule;
    const gary = await seedAccount(dbModule, 'gary');

    await accountData.eraseBeforeUserDeletion(gary);

    const exported = await accountData.exportAccountData(gary);
    assert.equal(exported?.avatarJpegBase64, null);
    assert.deepEqual(exported?.collection, []);
    assert.equal(await db.collection('twoFactor').countDocuments({ userId: new ObjectId(gary) }), 1);
  });

  test('the daily clean up removes a two-factor secret whose account is gone', async () => {
    const { db } = dbModule;
    const { purgeExpiredRecords } = await import('../src/retention.js');
    const red = await seedAccount(dbModule, 'red');
    const blue = await seedAccount(dbModule, 'blue');
    // As if the last step of a deletion had failed once Better Auth had removed the user.
    await db.collection('user').deleteOne({ _id: new ObjectId(red) });

    await purgeExpiredRecords();

    assert.equal(await db.collection('twoFactor').countDocuments({ userId: new ObjectId(red) }), 0);
    assert.equal(await db.collection('twoFactor').countDocuments({ userId: new ObjectId(blue) }), 1);
  });

  test('the daily clean up never removes a secret whose owner it cannot read', async () => {
    const { db } = dbModule;
    const { purgeExpiredRecords } = await import('../src/retention.js');
    const green = await seedAccount(dbModule, 'green');
    // An id kept as text, as it would be if the way Better Auth stores ids ever changed.
    await db.collection('twoFactor').updateOne({ userId: new ObjectId(green) }, { $set: { userId: green } });

    await purgeExpiredRecords();

    assert.equal(await db.collection('twoFactor').countDocuments({ userId: green }), 1);
    await db.collection('twoFactor').deleteMany({ userId: green });
  });
});
