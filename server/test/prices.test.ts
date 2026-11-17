import assert from 'node:assert/strict';
import { after, before, describe, mock, test } from 'node:test';

import { loadDb, skipWithoutDatabase } from './test-db.js';

type PricesModule = typeof import('../src/prices.js');
type DbModule = Awaited<ReturnType<typeof loadDb>>;

const copy = (userId: string, cardId: string, variant: string, quantity: number) => ({
  userId,
  id: `${userId}-${cardId}-${variant}`,
  cardId,
  setId: cardId.slice(0, cardId.lastIndexOf('-')),
  variant,
  language: 'fr',
  condition: 'near-mint',
  quantity,
});

describe('daily prices and value snapshots', { skip: skipWithoutDatabase }, () => {
  let dbModule: DbModule;
  let prices: PricesModule;
  const stamp = Date.now();
  const ash = `price-ash-${stamp}`;
  const misty = `price-misty-${stamp}`;
  const cards = [`zz${stamp}-1`, `zz${stamp}-2`];

  before(async () => {
    dbModule = await loadDb();
    prices = await import('../src/prices.js');
    await dbModule.db
      .collection('copy')
      .insertMany([
        copy(ash, cards[0]!, 'normal', 2),
        copy(ash, cards[1]!, 'holo', 1),
        copy(misty, cards[1]!, 'holo', 3),
      ]);
  });

  after(async () => {
    const { db } = dbModule;
    await Promise.all([
      db.collection('copy').deleteMany({ userId: { $in: [ash, misty] } }),
      db.collection('valueSnapshot').deleteMany({ userId: { $in: [ash, misty] } }),
      db.collection('price').deleteMany({ cardId: { $in: cards } }),
      db.collection('priceCheck').deleteMany({ _id: { $in: cards } as never }),
    ]);
    mock.restoreAll();
    await dbModule.mongoClient.close();
  });

  test('reads the prices of the owned cards on TCGdex', async () => {
    mock.method(globalThis, 'fetch', async (url: string) => {
      const id = decodeURIComponent(url.split('/').pop()!);
      if (!cards.includes(id)) return new Response(null, { status: 404 });
      const holoOnly = id === cards[1];
      return Response.json({
        id,
        variants: holoOnly ? { holo: true } : { normal: true },
        pricing: { cardmarket: { updated: '2026-11-17', avg7: holoOnly ? 10 : 1.5 } },
      });
    });
    const result = await prices.refreshOwnedPrices(await prices.ownedCardIds(), Date.now() + 10_000);
    assert.equal(result.failed, 0);
    const { prices: priceCollection } = await import('../src/collections.js');
    const kept = await priceCollection()
      .find({ cardId: { $in: cards } })
      .toArray();
    assert.deepEqual(kept.map((price) => [price.cardId, price.variant, price.amount]).sort(), [
      [cards[0], 'normal', 1.5],
      [cards[1], 'holo', 10],
    ]);
  });

  test('records the value of each collection for the day, once', async () => {
    const day = new Date('2026-11-17T03:00:00.000Z');
    await prices.recordValueSnapshots(day);
    await prices.recordValueSnapshots(day);
    assert.deepEqual(await prices.readValueHistory(ash), [{ date: '2026-11-17', amount: 13 }]);
    assert.deepEqual(await prices.readValueHistory(misty), [{ date: '2026-11-17', amount: 30 }]);
  });

  test('days are counted in Paris', () => {
    assert.equal(prices.dayOf(new Date('2026-11-17T23:30:00.000Z')), '2026-11-18');
  });
});
