import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Copy } from './collection.ts';
import { addWish, removeObtainedWishes, removeWish, type Wish } from './wishlist.ts';

const dracaufeu: Wish = { cardId: 'sv03.5-006', setId: 'sv03.5', addedAt: '2026-10-30T10:00:00.000Z' };
const mew: Wish = { cardId: 'sv03.5-151', setId: 'sv03.5', addedAt: '2026-10-30T11:00:00.000Z' };

const dracaufeuCopy: Copy = {
  id: 'copy-1',
  cardId: 'sv03.5-006',
  setId: 'sv03.5',
  variant: 'holo',
  language: 'fr',
  condition: 'near-mint',
  quantity: 1,
};

describe('addWish', () => {
  it('adds a card only once', () => {
    const wishlist = addWish(addWish([], dracaufeu), { ...dracaufeu, addedAt: '2026-10-31T00:00:00.000Z' });
    assert.deepEqual(wishlist, [dracaufeu]);
  });

  it('puts the latest wish at the top', () => {
    assert.deepEqual(addWish([dracaufeu], mew), [mew, dracaufeu]);
  });
});

describe('removeWish', () => {
  it('removes the wish for the card', () => {
    assert.deepEqual(removeWish([mew, dracaufeu], dracaufeu.cardId), [mew]);
  });
});

describe('removeObtainedWishes', () => {
  it('removes owned cards, whatever the variant', () => {
    const result = removeObtainedWishes([mew, dracaufeu], [dracaufeuCopy]);
    assert.deepEqual(result.wishlist, [mew]);
    assert.deepEqual(result.obtained, [dracaufeu]);
  });

  it('returns the same list when nothing was obtained', () => {
    const wishlist = [mew];
    assert.equal(removeObtainedWishes(wishlist, [dracaufeuCopy]).wishlist, wishlist);
  });
});
