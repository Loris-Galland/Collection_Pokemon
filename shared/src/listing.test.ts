import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { countSecretCards, priceKey, type CardSet, type Price } from './catalog.ts';
import { copiesOfCard, type Copy } from './collection.ts';
import { listStartedSets } from './progress.ts';
import { searchSetsByName } from './search.ts';
import { sortCopiesByValue } from './value.ts';

const set = (id: string, name: string, official: number, total: number): CardSet => ({
  id,
  name,
  cardCount: { official, total },
});

const copy = (id: string, cardId: string, setId: string): Copy => ({
  id,
  cardId,
  setId,
  variant: 'normal',
  language: 'fr',
  condition: 'near-mint',
  quantity: 1,
});

const price = (cardId: string, amount: number): Price => ({
  cardId,
  variant: 'normal',
  amount,
  currency: 'EUR',
  updatedAt: '2026-11-06',
});

describe('countSecretCards', () => {
  it('counts the cards beyond the printed number', () => {
    assert.equal(countSecretCards(set('sv03.5', '151', 165, 207)), 42);
  });

  it('never goes below zero when the catalog totals are odd', () => {
    assert.equal(countSecretCards(set('x', 'X', 10, 8)), 0);
  });
});

describe('listStartedSets', () => {
  it('keeps the sets with at least one owned card, the most complete first', () => {
    const sets = [set('a', 'A', 10, 10), set('b', 'B', 2, 2), set('c', 'C', 5, 5)];
    const copies = [copy('1', 'a-1', 'a'), copy('2', 'b-1', 'b')];
    assert.deepEqual(
      listStartedSets(sets, copies).map(({ set: started }) => started.id),
      ['b', 'a'],
    );
  });
});

describe('sortCopiesByValue', () => {
  it('puts the most valuable copies first and those with no price last', () => {
    const copies = [copy('cheap', 'a-1', 'a'), copy('unpriced', 'a-2', 'a'), copy('rare', 'a-3', 'a')];
    const prices = new Map([
      [priceKey('a-1', 'normal'), price('a-1', 1)],
      [priceKey('a-3', 'normal'), price('a-3', 50)],
    ]);
    assert.deepEqual(
      sortCopiesByValue(copies, prices).map((entry) => entry.id),
      ['rare', 'cheap', 'unpriced'],
    );
  });

  it('leaves the given list untouched', () => {
    const copies = [copy('a', 'a-1', 'a'), copy('b', 'a-2', 'a')];
    sortCopiesByValue(copies, new Map([[priceKey('a-2', 'normal'), price('a-2', 3)]]));
    assert.deepEqual(copies.map((entry) => entry.id), ['a', 'b']);
  });
});

describe('copiesOfCard', () => {
  it('returns every copy of one card', () => {
    const copies = [copy('1', 'a-1', 'a'), copy('2', 'a-2', 'a'), copy('3', 'a-1', 'a')];
    assert.deepEqual(
      copiesOfCard(copies, 'a-1').map((entry) => entry.id),
      ['1', '3'],
    );
  });
});

describe('searchSetsByName', () => {
  const sets = [set('sv03.5', 'Pokémon 151', 165, 207), set('swsh1', 'Épée et Bouclier', 202, 216)];

  it('ignores accents and case', () => {
    assert.deepEqual(
      searchSetsByName(sets, 'epee').map((entry) => entry.id),
      ['swsh1'],
    );
  });

  it('returns every set for an empty search', () => {
    assert.equal(searchSetsByName(sets, '  ').length, 2);
  });
});
