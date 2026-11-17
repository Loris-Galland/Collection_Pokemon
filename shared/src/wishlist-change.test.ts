import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NO_WISHES, type Wish, type Wishes, type Wishlist } from './wishlist.ts';
import {
  MAX_WISHLISTS_PER_ACCOUNT,
  applyWishlistChange,
  isWishlistChange,
  wishlistLimitOf,
} from './wishlist-change.ts';

const list = (id: string): Wishlist => ({ id, name: `List ${id}`, createdAt: '2026-11-17T10:00:00.000Z' });
const wish = (cardId: string, wishlistId = 'a'): Wish => ({
  cardId,
  setId: cardId.slice(0, cardId.lastIndexOf('-')),
  wishlistId,
  addedAt: '2026-11-17T10:00:00.000Z',
});
const start: Wishes = { wishlists: [list('a'), list('b')], wishes: [wish('sv01-1')] };

describe('applyWishlistChange', () => {
  it('creates, renames and removes a list with its wishes', () => {
    const created = applyWishlistChange(NO_WISHES, { type: 'create-list', wishlist: list('a') });
    const renamed = applyWishlistChange(created, { type: 'rename-list', wishlistId: 'a', name: 'Feu' });
    assert.equal(renamed.wishlists[0]?.name, 'Feu');
    assert.deepEqual(applyWishlistChange(start, { type: 'remove-list', wishlistId: 'a' }).wishes, []);
  });

  it('adds and removes a wish', () => {
    const added = applyWishlistChange(start, { type: 'add-wish', wish: wish('sv01-2', 'b') });
    assert.equal(added.wishes.length, 2);
    assert.equal(applyWishlistChange(added, { type: 'remove-wish', cardId: 'sv01-1' }).wishes.length, 1);
  });

  it('imports lists and wishes without moving a card already wished', () => {
    const imported = applyWishlistChange(start, {
      type: 'import',
      wishlists: [list('c')],
      wishes: [wish('sv01-1', 'c'), wish('sv01-3', 'c')],
    });
    assert.equal(imported.wishlists.length, 3);
    assert.equal(imported.wishes.find((entry) => entry.cardId === 'sv01-1')?.wishlistId, 'a');
    assert.equal(imported.wishes.find((entry) => entry.cardId === 'sv01-3')?.wishlistId, 'c');
  });
});

describe('wishlistLimitOf', () => {
  it('refuses a list past the limit', () => {
    const full: Wishes = {
      wishlists: Array.from({ length: MAX_WISHLISTS_PER_ACCOUNT }, (_, index) => list(`l${index}`)),
      wishes: [],
    };
    assert.equal(wishlistLimitOf(full, { type: 'create-list', wishlist: list('new') }), 'too-many-lists');
    assert.equal(wishlistLimitOf(full, { type: 'remove-list', wishlistId: 'l1' }), undefined);
  });
});

describe('isWishlistChange', () => {
  it('accepts well formed changes', () => {
    assert.ok(isWishlistChange({ type: 'add-wish', wish: wish('exu-!') }));
    assert.ok(isWishlistChange({ type: 'rename-list', wishlistId: 'a', name: 'Feu' }));
  });

  it('refuses a wish whose card is not in its set, an empty name or an unknown type', () => {
    assert.ok(!isWishlistChange({ type: 'add-wish', wish: { ...wish('sv01-1'), setId: 'sv02' } }));
    assert.ok(!isWishlistChange({ type: 'rename-list', wishlistId: 'a', name: '  ' }));
    assert.ok(!isWishlistChange({ type: 'drop', cardId: 'sv01-1' }));
    assert.ok(!isWishlistChange({ type: 'import', wishlists: [], wishes: [] }));
  });
});
