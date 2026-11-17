import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { loadDb, skipWithoutDatabase } from './test-db.js';

type WishesModule = typeof import('../src/wishes.js');
type CollectionModule = typeof import('../src/collection.js');
type DbModule = Awaited<ReturnType<typeof loadDb>>;

const list = (id: string) => ({ id, name: `List ${id}`, createdAt: '2026-11-17T10:00:00.000Z' });
const wish = (cardId: string, wishlistId = 'a') => ({
  cardId,
  setId: cardId.slice(0, cardId.lastIndexOf('-')),
  wishlistId,
  addedAt: '2026-11-17T10:00:00.000Z',
});

describe('wishes on the server', { skip: skipWithoutDatabase }, () => {
  let dbModule: DbModule;
  let wishes: WishesModule;
  let collection: CollectionModule;
  const users = [`wish-test-${Date.now()}`, `wish-other-${Date.now()}`];
  const [userId, otherId] = users as [string, string];

  before(async () => {
    dbModule = await loadDb();
    wishes = await import('../src/wishes.js');
    collection = await import('../src/collection.js');
  });

  after(async () => {
    const { deleteWishes } = await import('../src/wish-store.js');
    const { deleteCollection } = await import('../src/copies.js');
    await Promise.all(users.flatMap((id) => [deleteWishes(id), deleteCollection(id)]));
    await dbModule.mongoClient.close();
  });

  test('saves lists and wishes, and applies a change id only once', async () => {
    await wishes.saveWishlistChange(userId, 'c1', { type: 'create-list', wishlist: list('a') });
    await wishes.saveWishlistChange(userId, 'c2', { type: 'add-wish', wish: wish('sv01-1') });
    await wishes.saveWishlistChange(userId, 'c2', { type: 'add-wish', wish: wish('sv01-1') });
    await wishes.saveWishlistChange(userId, 'c3', { type: 'remove-wishes', cardIds: ['sv01-1'] });
    // Sent again after the removal, it must not bring the wish back.
    await wishes.saveWishlistChange(userId, 'c2', { type: 'add-wish', wish: wish('sv01-1') });
    const saved = await wishes.readWishes(userId);
    assert.equal(saved.wishlists.length, 1);
    assert.equal(saved.wishes.length, 0);
  });

  test('keeps each account to its own wishes', async () => {
    await wishes.saveWishlistChange(userId, 'c4', { type: 'add-wish', wish: wish('sv01-2') });
    assert.equal((await wishes.readWishes(otherId)).wishes.length, 0);
    // A wish for a list of another account is dropped.
    await wishes.saveWishlistChange(otherId, 'c1', { type: 'add-wish', wish: wish('sv01-3') });
    assert.equal((await wishes.readWishes(otherId)).wishes.length, 0);
  });

  test('imports without moving a card already wished', async () => {
    await wishes.saveWishlistChange(userId, 'import-1', {
      type: 'import',
      wishlists: [list('b')],
      wishes: [wish('sv01-2', 'b'), wish('sv01-4', 'b')],
    });
    const saved = await wishes.readWishes(userId);
    assert.equal(saved.wishes.find((entry) => entry.cardId === 'sv01-2')?.wishlistId, 'a');
    assert.equal(saved.wishes.find((entry) => entry.cardId === 'sv01-4')?.wishlistId, 'b');
  });

  test('removes a list with its wishes', async () => {
    await wishes.saveWishlistChange(userId, 'c5', { type: 'remove-list', wishlistId: 'b' });
    const saved = await wishes.readWishes(userId);
    assert.deepEqual(
      saved.wishlists.map((entry) => entry.id),
      ['a'],
    );
    assert.equal(
      saved.wishes.some((entry) => entry.wishlistId === 'b'),
      false,
    );
  });

  test('refuses a list past the limit and leaves nothing behind', async () => {
    const { wishlists } = await import('../src/wish-store.js');
    await wishlists().insertMany(Array.from({ length: 49 }, (_, index) => ({ userId, ...list(`fill-${index}`) })));
    assert.equal(
      await wishes.saveWishlistChange(userId, 'c6', { type: 'create-list', wishlist: list('over') }),
      'too-many-lists',
    );
    assert.equal((await wishes.readWishes(userId)).wishlists.length, 50);
  });

  test('a copy added to the collection removes the wish for its card', async () => {
    await wishes.saveWishlistChange(userId, 'c7', { type: 'add-wish', wish: wish('sv01-9') });
    await collection.saveCollectionChange(userId, 'copy-1', {
      type: 'add',
      id: 'copy-1',
      input: {
        cardId: 'sv01-9',
        setId: 'sv01',
        variant: 'normal',
        language: 'fr',
        condition: 'near-mint',
        quantity: 1,
      },
    });
    assert.equal(
      (await wishes.readWishes(userId)).wishes.some((entry) => entry.cardId === 'sv01-9'),
      false,
    );
  });
});
