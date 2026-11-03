import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { priceKey, type PriceTrend } from './catalog.ts';
import type { Copy } from './collection.ts';
import { computeValueTrend, recentValueChange } from './value.ts';

const copy = (cardId: string, quantity = 1): Copy => ({
  id: cardId,
  cardId,
  setId: 'sv03.5',
  variant: 'holo',
  language: 'fr',
  condition: 'near-mint',
  quantity,
});

const trends = (...entries: (Pick<PriceTrend, 'cardId'> & Partial<PriceTrend>)[]) =>
  new Map(
    entries.map((entry) => [
      priceKey(entry.cardId, 'holo'),
      { variant: 'holo' as const, updatedAt: '2026-11-03', ...entry },
    ]),
  );

describe('computeValueTrend', () => {
  it('sums each average times the quantity', () => {
    const trend = computeValueTrend(
      [copy('a', 2), copy('b')],
      trends({ cardId: 'a', avg30: 1, avg7: 2, avg1: 3 }, { cardId: 'b', avg30: 10, avg7: 20, avg1: 30 }),
    );
    assert.deepEqual(trend, { avg30: 12, avg7: 24, avg1: 36, currency: 'EUR', untrackedCopyCount: 0 });
  });

  it('fills a missing average with the closest known one, so the same copies are always counted', () => {
    const trend = computeValueTrend([copy('a')], trends({ cardId: 'a', avg7: 5 }));
    assert.deepEqual(trend, { avg30: 5, avg7: 5, avg1: 5, currency: 'EUR', untrackedCopyCount: 0 });
  });

  it('leaves out copies with no known average and counts them', () => {
    const trend = computeValueTrend([copy('a'), copy('b')], trends({ cardId: 'a', avg30: 1, avg7: 1, avg1: 1 }));
    assert.equal(trend?.avg1, 1);
    assert.equal(trend?.untrackedCopyCount, 1);
  });

  it('gives nothing when no copy has a known average', () => {
    assert.equal(computeValueTrend([copy('a')], new Map()), undefined);
    assert.equal(computeValueTrend([], new Map()), undefined);
  });
});

describe('recentValueChange', () => {
  it('compares the last day to the last 7 days, rounded to the cent', () => {
    const trend = { avg30: 1, avg7: 10.1, avg1: 10.3, currency: 'EUR' as const, untrackedCopyCount: 0 };
    assert.equal(recentValueChange(trend), 0.2);
    assert.equal(recentValueChange({ ...trend, avg1: 9.6 }), -0.5);
  });
});
