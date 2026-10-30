import { priceKey, type Price } from './catalog.ts';
import type { Copy } from './collection.ts';

export interface CollectionValue {
  amount: number;
  currency: 'EUR';
  /** Copies with no known price count as 0 €, and the UI must say so. */
  unpricedCopyCount: number;
}

/** Collection value, meaning the sum of price times quantity over every copy. */
export function computeCollectionValue(copies: readonly Copy[], prices: ReadonlyMap<string, Price>): CollectionValue {
  let amount = 0;
  let unpricedCopyCount = 0;
  for (const copy of copies) {
    const price = prices.get(priceKey(copy.cardId, copy.variant));
    if (price) amount += price.amount * copy.quantity;
    else unpricedCopyCount += 1;
  }
  return { amount: Math.round(amount * 100) / 100, currency: 'EUR', unpricedCopyCount };
}

/** Snapshot, meaning the value of a user's collection on a given date. */
export interface ValueSnapshot {
  userId: string;
  /** Day of the snapshot, formatted as YYYY-MM-DD. */
  date: string;
  amount: number;
}

/** Value history, meaning the list of snapshots from oldest to newest. */
export type ValueHistory = ValueSnapshot[];
