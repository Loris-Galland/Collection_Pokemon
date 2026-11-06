import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cheapestPrice, isLanguage, type CardSet, type Price } from './catalog.ts';
import { countOwnedQuantities, isCopy, summarizeCollection, type Copy } from './collection.ts';
import { computeAllSetProgress } from './progress.ts';
import { computeWishlistCost, isWish, type Wish } from './wishlist.ts';

const copy: Copy = {
  id: 'a',
  cardId: 'sv03.5-006',
  setId: 'sv03.5',
  variant: 'holo',
  language: 'fr',
  condition: 'near-mint',
  quantity: 2,
};

const price = (amount: number, variant: Price['variant'] = 'normal'): Price => ({
  cardId: 'sv03.5-006',
  variant,
  amount,
  currency: 'EUR',
  updatedAt: '2026-10-30',
});

describe('countOwnedQuantities', () => {
  it('adds up the quantities of a card across variants and languages', () => {
    const owned = countOwnedQuantities([copy, { ...copy, id: 'b', language: 'en', quantity: 1 }]);
    assert.equal(owned.get('sv03.5-006'), 3);
  });
});

describe('summarizeCollection', () => {
  it('counts copies and distinct cards', () => {
    const summary = summarizeCollection([copy, { ...copy, id: 'b', cardId: 'sv03.5-007', quantity: 1 }]);
    assert.deepEqual(summary, { copyCount: 3, distinctCardCount: 2 });
  });
});

describe('computeAllSetProgress', () => {
  const sets: CardSet[] = [
    { id: 'sv03.5', name: '151', cardCount: { official: 165, total: 207 } },
    { id: 'base1', name: 'Set de Base', cardCount: { official: 102, total: 102 } },
  ];

  it('gives the progress of every set in a single pass', () => {
    const progress = computeAllSetProgress(sets, [copy]);
    assert.equal(progress.get('sv03.5')?.owned, 1);
    assert.equal(progress.get('base1')?.owned, 0);
  });
});

describe('cheapestPrice', () => {
  it('returns the price of the cheapest variant', () => {
    assert.equal(cheapestPrice([price(8), price(3, 'reverse')])?.amount, 3);
  });

  it('returns nothing without prices', () => {
    assert.equal(cheapestPrice([]), undefined);
  });
});

describe('computeWishlistCost', () => {
  const wishes: Wish[] = [
    { cardId: 'sv03.5-006', setId: 'sv03.5', wishlistId: 'w', addedAt: '2026-10-30' },
    { cardId: 'sv03.5-151', setId: 'sv03.5', wishlistId: 'w', addedAt: '2026-10-30' },
  ];

  it('adds up the cheapest variant of each wish and counts the unpriced ones', () => {
    const cost = computeWishlistCost(wishes, new Map([['sv03.5-006', [price(8), price(3, 'reverse')]]]));
    assert.deepEqual(cost, { amount: 3, currency: 'EUR', unpricedCount: 1 });
  });
});

describe('shape guards', () => {
  it('accept valid data', () => {
    assert.equal(isCopy(copy), true);
    assert.equal(isWish({ cardId: 'x-1', setId: 'x', wishlistId: 'w', addedAt: '2026-10-30' }), true);
    assert.equal(isLanguage('fr'), true);
  });

  it('reject corrupted or unknown values', () => {
    assert.equal(isCopy({ ...copy, quantity: 0 }), false);
    assert.equal(isCopy({ ...copy, quantity: 1.5 }), false);
    assert.equal(isCopy({ ...copy, variant: 'gold' }), false);
    assert.equal(isCopy(null), false);
    assert.equal(isWish({ cardId: 'x-1' }), false);
    assert.equal(isLanguage('jp'), false);
  });
});
