import {
  hasUnreliablePrice,
  mapLimited,
  readCardmarketPrices,
  variantsOf,
  type CardmarketPricing,
  type TcgdexVariants,
} from '@collection/shared/compiled';
import type { AnyBulkWriteOperation } from 'mongodb';

import { copies, priceChecks, prices, valueSnapshots, type PriceDocument } from './collections.js';

// Prices are the same in every language, and English is the most complete one on TCGdex.
const TCGDEX_CARD_URL = 'https://api.tcgdex.net/v2/en/cards/';
const PARALLEL_REQUESTS = 8;
const REQUEST_TIMEOUT_MS = 10_000;
/** Snapshots are kept this long, enough for a curve over a year. */
const SNAPSHOT_LIFETIME_DAYS = 400;

let indexesReady: Promise<unknown> | undefined;

function ensureIndexes(): Promise<unknown> {
  indexesReady ??= Promise.all([
    prices().createIndex({ cardId: 1, variant: 1 }, { unique: true }),
    valueSnapshots().createIndex({ userId: 1, date: 1 }, { unique: true }),
    valueSnapshots().createIndex({ date: 1 }),
  ]).catch((error: unknown) => {
    indexesReady = undefined;
    throw error;
  });
  return indexesReady;
}

interface TcgdexCard {
  id: string;
  variants?: TcgdexVariants;
  pricing?: { cardmarket?: CardmarketPricing | null };
}

async function fetchCard(cardId: string): Promise<TcgdexCard | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${TCGDEX_CARD_URL}${encodeURIComponent(cardId)}`, { signal: controller.signal });
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`TCGdex returned ${response.status} for ${cardId}`);
    return (await response.json()) as TcgdexCard;
  } finally {
    clearTimeout(timer);
  }
}

/** Reads the prices of one card and replaces those kept for it. A card with no price now keeps none. */
async function refreshCard(cardId: string, now: Date): Promise<void> {
  const card = await fetchCard(cardId);
  const market = card && !hasUnreliablePrice(cardId) ? card.pricing?.cardmarket : undefined;
  const read = card ? readCardmarketPrices({ id: cardId, variants: variantsOf(card.variants) }, market) : [];
  const operations: AnyBulkWriteOperation<PriceDocument>[] = [
    { deleteMany: { filter: { cardId, variant: { $nin: read.map((price) => price.variant) } } } },
    ...read.map((price): AnyBulkWriteOperation<PriceDocument> => ({
      updateOne: {
        filter: { cardId, variant: price.variant },
        update: { $set: { amount: price.amount, updatedAt: now } },
        upsert: true,
      },
    })),
  ];
  await prices().bulkWrite(operations);
  await priceChecks().updateOne({ _id: cardId }, { $set: { checkedAt: now } }, { upsert: true });
}

/**
 * Reads the prices of every owned card on TCGdex, the cards checked longest ago first, until the time is up. Cards
 * left for the next day keep their last known prices.
 */
export async function refreshOwnedPrices(
  owned: readonly string[],
  deadline: number,
  now = new Date(),
): Promise<{ read: number; failed: number; left: number }> {
  await ensureIndexes();
  const checks = await priceChecks()
    .find({ _id: { $in: [...owned] } })
    .toArray();
  const checkedAt = new Map(checks.map((check) => [check._id, check.checkedAt.getTime()]));
  const oldestFirst = [...owned].sort((a, b) => (checkedAt.get(a) ?? 0) - (checkedAt.get(b) ?? 0));
  const results = await mapLimited(oldestFirst, PARALLEL_REQUESTS, async (cardId) => {
    if (Date.now() >= deadline) return 'left' as const;
    await refreshCard(cardId, now);
    return 'read' as const;
  });
  const count = (outcome: 'read' | 'left') =>
    results.filter((result) => result.status === 'fulfilled' && result.value === outcome).length;
  for (const result of results) {
    if (result.status === 'rejected') console.warn('Could not read the prices of a card', result.reason);
  }
  return {
    read: count('read'),
    failed: results.filter((result) => result.status === 'rejected').length,
    left: count('left'),
  };
}

/** Every card someone owns. */
export async function ownedCardIds(): Promise<string[]> {
  return (await copies().distinct('cardId')) as string[];
}

/** The day of a date in Paris, formatted as YYYY-MM-DD, since the job runs at night there. */
export function dayOf(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(date);
}

/**
 * Records the value of every collection for the day, as price times quantity over every copy, in one query. A copy
 * with no known price counts as 0 €, as in the app. Recording the same day again replaces its snapshot.
 */
export async function recordValueSnapshots(now = new Date()): Promise<number> {
  await ensureIndexes();
  const date = dayOf(now);
  const totals = await copies()
    .aggregate<{ _id: string; amount: number }>([
      {
        $lookup: {
          from: 'price',
          let: { cardId: '$cardId', variant: '$variant' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$cardId', '$$cardId'] }, { $eq: ['$variant', '$$variant'] }] } } },
            { $project: { _id: 0, amount: 1 } },
          ],
          as: 'price',
        },
      },
      {
        $group: {
          _id: '$userId',
          amount: { $sum: { $multiply: ['$quantity', { $ifNull: [{ $first: '$price.amount' }, 0] }] } },
        },
      },
    ])
    .toArray();
  if (totals.length === 0) return 0;
  await valueSnapshots().bulkWrite(
    totals.map(({ _id: userId, amount }) => ({
      updateOne: {
        filter: { userId, date },
        update: { $set: { amount: Math.round(amount * 100) / 100 } },
        upsert: true,
      },
    })),
  );
  return totals.length;
}

/** Removes the snapshots older than the lifetime, and the prices of cards nobody owns any more. */
export async function purgeOldValueData(owned: readonly string[], now = new Date()): Promise<void> {
  const oldest = dayOf(new Date(now.getTime() - SNAPSHOT_LIFETIME_DAYS * 24 * 60 * 60 * 1000));
  await Promise.all([
    valueSnapshots().deleteMany({ date: { $lt: oldest } }),
    prices().deleteMany({ cardId: { $nin: [...owned] } }),
    priceChecks().deleteMany({ _id: { $nin: [...owned] } }),
  ]);
}

/** The value history of an account, oldest first. */
export async function readValueHistory(userId: string): Promise<{ date: string; amount: number }[]> {
  return valueSnapshots()
    .find({ userId }, { projection: { _id: 0, date: 1, amount: 1 } })
    .sort({ date: 1 })
    .limit(SNAPSHOT_LIFETIME_DAYS)
    .toArray();
}
