import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readCardmarketPrices, readCardmarketTrends, sharesShinyPrice, type CardmarketPricing } from './cardmarket.ts';
import type { Variant } from './catalog.ts';

const market: CardmarketPricing = { updated: '2026-11-03', avg: 2, 'avg-holo': 10, avg7: 3, 'avg7-holo': null };

const card = (...variants: Variant[]) => ({ id: 'sv03.5-006', variants });
const amounts = (...variants: Variant[]) =>
  readCardmarketPrices(card(...variants), market).map((price) => [price.variant, price.amount]);

describe('readCardmarketPrices', () => {
  it('reads the holo field for shiny prints when a normal print exists', () => {
    assert.deepEqual(amounts('normal', 'holo', 'reverse'), [
      ['normal', 2],
      ['holo', 10],
      ['reverse', 10],
    ]);
  });

  it('reads the base field for a holo card without a normal print', () => {
    assert.deepEqual(amounts('holo'), [['holo', 2]]);
  });

  it('skips variants with no price and missing pricing', () => {
    assert.deepEqual(amounts('first-edition'), []);
    assert.deepEqual(readCardmarketPrices(card('normal'), { updated: '2026-11-03', avg: 0 }), []);
    assert.deepEqual(readCardmarketPrices(card('normal'), null), []);
  });
});

describe('readCardmarketTrends', () => {
  it('keeps only the variants with a known average', () => {
    const trends = readCardmarketTrends(card('normal', 'holo'), market);
    assert.deepEqual(
      trends.map((trend) => [trend.variant, trend.avg7]),
      [['normal', 3]],
    );
  });
});

describe('sharesShinyPrice', () => {
  it('is true only when holo and reverse read the same field', () => {
    assert.equal(sharesShinyPrice(['normal', 'holo', 'reverse']), true);
    assert.equal(sharesShinyPrice(['holo', 'reverse']), false);
    assert.equal(sharesShinyPrice(['normal', 'holo']), false);
  });
});
