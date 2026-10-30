import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { priceKey, type CardSet, type Price } from './catalog.ts';
import { addCopy, setCopyQuantity, type Copy, type CopyInput } from './collection.ts';
import { computeSetProgress } from './progress.ts';
import { computeCollectionValue } from './value.ts';

const set151: CardSet = { id: 'sv03.5', name: '151', cardCount: { official: 165, total: 207 } };

const dracaufeuVF: CopyInput = {
  cardId: 'sv03.5-006',
  setId: 'sv03.5',
  variant: 'holo',
  language: 'fr',
  condition: 'near-mint',
  quantity: 1,
};

let nextId = 0;
const newId = () => `copy-${++nextId}`;

describe('addCopy', () => {
  it('merges an identical combination by raising the quantity', () => {
    const once = addCopy([], dracaufeuVF, newId);
    const twice = addCopy(once, dracaufeuVF, newId);
    assert.equal(twice.length, 1);
    assert.equal(twice[0]?.quantity, 2);
  });

  it('creates another copy when the language differs', () => {
    const copies = addCopy(addCopy([], dracaufeuVF, newId), { ...dracaufeuVF, language: 'en' }, newId);
    assert.equal(copies.length, 2);
  });
});

describe('setCopyQuantity', () => {
  it('removes the copy when the quantity drops to 0', () => {
    const copies = addCopy([], dracaufeuVF, newId);
    assert.deepEqual(setCopyQuantity(copies, copies[0]!.id, 0), []);
  });
});

describe('computeSetProgress', () => {
  it('counts a card once, whatever its language and quantity', () => {
    const copies: Copy[] = [
      { ...dracaufeuVF, id: 'a', quantity: 3 },
      { ...dracaufeuVF, id: 'b', language: 'en' },
      { ...dracaufeuVF, id: 'c', cardId: 'sv03.5-200' },
    ];
    const progress = computeSetProgress(set151, copies);
    assert.equal(progress.owned, 2);
    assert.equal(progress.total, 207);
  });

  it('ignores copies from other sets', () => {
    const copies: Copy[] = [{ ...dracaufeuVF, id: 'a', setId: 'base1', cardId: 'base1-4' }];
    assert.equal(computeSetProgress(set151, copies).owned, 0);
  });
});

describe('computeCollectionValue', () => {
  const price: Price = {
    cardId: 'sv03.5-006',
    variant: 'holo',
    amount: 7.98,
    currency: 'EUR',
    updatedAt: '2026-10-28',
  };
  const prices = new Map([[priceKey(price.cardId, price.variant), price]]);

  it('multiplies the price by the quantity', () => {
    const value = computeCollectionValue([{ ...dracaufeuVF, id: 'a', quantity: 2 }], prices);
    assert.equal(value.amount, 15.96);
    assert.equal(value.unpricedCopyCount, 0);
  });

  it('counts 0 € and reports a copy without a price', () => {
    const value = computeCollectionValue([{ ...dracaufeuVF, id: 'a', variant: 'normal' }], prices);
    assert.equal(value.amount, 0);
    assert.equal(value.unpricedCopyCount, 1);
  });
});
