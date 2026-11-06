import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Copy } from './collection.ts';
import {
  addWish,
  addWishlist,
  cleanWishlistName,
  FIRST_WISHLIST_ID,
  NO_WISHES,
  removeObtainedWishes,
  removeWish,
  removeWishlist,
  renameWishlist,
  restoreWishes,
  wishesOf,
  type Wish,
  type Wishes,
  type Wishlist,
} from './wishlist.ts';

const fireDeck: Wishlist = { id: 'fire', name: 'Fire deck', createdAt: '2026-11-01T10:00:00.000Z' };
const gifts: Wishlist = { id: 'gifts', name: 'Gifts', createdAt: '2026-11-01T11:00:00.000Z' };

const dracaufeu: Wish = { cardId: 'sv03.5-006', setId: 'sv03.5', wishlistId: 'fire', addedAt: '2026-11-02T10:00:00.000Z' };
const mew: Wish = { cardId: 'sv03.5-151', setId: 'sv03.5', wishlistId: 'gifts', addedAt: '2026-11-02T11:00:00.000Z' };

const withLists: Wishes = { wishlists: [gifts, fireDeck], wishes: [] };

const dracaufeuCopy: Copy = {
  id: 'copy-1',
  cardId: 'sv03.5-006',
  setId: 'sv03.5',
  variant: 'holo',
  language: 'fr',
  condition: 'near-mint',
  quantity: 1,
};

describe('cleanWishlistName', () => {
  it('trims and squashes the spaces', () => {
    assert.equal(cleanWishlistName('  Fire   deck '), 'Fire deck');
  });

  it('refuses an empty name', () => {
    assert.equal(cleanWishlistName('   '), undefined);
  });

  it('cuts a name that is too long', () => {
    assert.equal(cleanWishlistName('a'.repeat(60))?.length, 40);
  });
});

describe('addWishlist', () => {
  it('puts the new wishlist at the top', () => {
    assert.deepEqual(addWishlist(addWishlist(NO_WISHES, fireDeck), gifts).wishlists, [gifts, fireDeck]);
  });
});

describe('renameWishlist', () => {
  it('changes the name of one wishlist only', () => {
    const renamed = renameWishlist(withLists, 'fire', 'Water deck');
    assert.deepEqual(
      renamed.wishlists.map((w) => w.name),
      ['Gifts', 'Water deck'],
    );
  });
});

describe('removeWishlist', () => {
  it('removes the wishlist and its wishes', () => {
    const state = addWish(addWish(withLists, dracaufeu), mew);
    const result = removeWishlist(state, 'fire');
    assert.deepEqual(result.wishlists, [gifts]);
    assert.deepEqual(result.wishes, [mew]);
  });
});

describe('addWish', () => {
  it('puts the latest wish at the top', () => {
    assert.deepEqual(addWish(addWish(withLists, dracaufeu), mew).wishes, [mew, dracaufeu]);
  });

  it('moves a card to the new wishlist instead of keeping it in two', () => {
    const state = addWish(withLists, dracaufeu);
    const moved = addWish(state, { ...dracaufeu, wishlistId: 'gifts' });
    assert.deepEqual(moved.wishes, [{ ...dracaufeu, wishlistId: 'gifts' }]);
  });

  it('changes nothing when the card is already in that wishlist', () => {
    const state = addWish(withLists, dracaufeu);
    assert.equal(addWish(state, { ...dracaufeu, addedAt: '2026-11-03T00:00:00.000Z' }), state);
  });

  it('ignores a wishlist that does not exist', () => {
    assert.equal(addWish(withLists, { ...dracaufeu, wishlistId: 'nope' }), withLists);
  });
});

describe('removeWish', () => {
  it('removes the wish for the card', () => {
    assert.deepEqual(removeWish(addWish(addWish(withLists, dracaufeu), mew), dracaufeu.cardId).wishes, [mew]);
  });
});

describe('wishesOf', () => {
  it('keeps the wishes of one wishlist', () => {
    assert.deepEqual(wishesOf(addWish(addWish(withLists, dracaufeu), mew), 'gifts'), [mew]);
  });
});

describe('removeObtainedWishes', () => {
  it('removes owned cards, whatever the variant', () => {
    const result = removeObtainedWishes(addWish(addWish(withLists, dracaufeu), mew), [dracaufeuCopy]);
    assert.deepEqual(result.state.wishes, [mew]);
    assert.deepEqual(result.obtained, [dracaufeu]);
  });

  it('returns the same state when nothing was obtained', () => {
    const state = addWish(withLists, mew);
    assert.equal(removeObtainedWishes(state, [dracaufeuCopy]).state, state);
  });
});

describe('restoreWishes', () => {
  const now = '2026-11-06T00:00:00.000Z';

  it('puts the wishes saved before wishlists into a first wishlist', () => {
    const legacy = [{ cardId: 'sv03.5-006', setId: 'sv03.5', addedAt: '2026-10-30T10:00:00.000Z' }];
    assert.deepEqual(restoreWishes(legacy, 'My wishes', now), {
      wishlists: [{ id: FIRST_WISHLIST_ID, name: 'My wishes', createdAt: now }],
      wishes: [{ ...legacy[0], wishlistId: FIRST_WISHLIST_ID }],
    });
  });

  it('creates no wishlist for an empty legacy list', () => {
    assert.deepEqual(restoreWishes([], 'My wishes', now), NO_WISHES);
  });

  it('drops the wishes of a missing wishlist and the duplicates', () => {
    const saved = { wishlists: [fireDeck], wishes: [dracaufeu, { ...dracaufeu, addedAt: now }, mew, 'junk'] };
    assert.deepEqual(restoreWishes(saved, 'My wishes', now), { wishlists: [fireDeck], wishes: [dracaufeu] });
  });

  it('gives up on data it cannot read', () => {
    assert.equal(restoreWishes('junk', 'My wishes', now), undefined);
  });
});
