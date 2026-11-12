import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readCardmarketPrices, readCardmarketTrends, sharesShinyPrice, type CardmarketPricing } from './cardmarket.ts';
import type { Variant } from './catalog.ts';

const market: CardmarketPricing = { updated: '2026-11-03', avg: 2, 'avg-holo': 10, avg7: 3, 'avg7-holo': null };

// Only the long averages, so these tests only see which field each variant reads.
const longAverages: CardmarketPricing = { updated: '2026-11-03', avg: 2, 'avg-holo': 10 };

const card = (...variants: Variant[]) => ({ id: 'sv03.5-006', variants });
const amounts = (...variants: Variant[]) =>
  readCardmarketPrices(card(...variants), longAverages).map((price) => [price.variant, price.amount]);

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

  it('uses the 7 day average, then the 30 day one, then the long average', () => {
    // Jirachi-ex 155 of the 30th anniversary on 11 November 2026, whose long average still held its launch price.
    const priceOf = (pricing: Omit<CardmarketPricing, 'updated'>) =>
      readCardmarketPrices(card('holo'), { updated: '2026-11-11', ...pricing }).map((price) => price.amount);
    assert.deepEqual(priceOf({ avg: 40.33, avg30: 33.41, avg7: 32.25, avg1: 27.61 }), [32.25]);
    assert.deepEqual(priceOf({ avg: 40.33, avg30: 33.41, avg7: 0 }), [33.41]);
    assert.deepEqual(priceOf({ avg: 40.33, avg7: null }), [40.33]);
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
