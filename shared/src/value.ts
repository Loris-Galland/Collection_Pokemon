import { priceKey, type Price, type PriceTrend } from './catalog.ts';
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

/** A sorted copy of the list, the most valuable copies first and those with no known price last. */
export function sortCopiesByValue(copies: readonly Copy[], prices: ReadonlyMap<string, Price>): Copy[] {
  const amountOf = (copy: Copy) => prices.get(priceKey(copy.cardId, copy.variant))?.amount ?? -1;
  return [...copies].sort((a, b) => amountOf(b) - amountOf(a));
}

/**
 * Value trend, meaning what the copies owned today would be worth at the recent Cardmarket averages. It is an estimate
 * that only moves with prices, not a value history.
 */
export interface ValueTrend {
  avg30: number;
  avg7: number;
  avg1: number;
  currency: 'EUR';
  /** Copies with no known average, left out of every period. */
  untrackedCopyCount: number;
}

const roundCents = (amount: number) => Math.round(amount * 100) / 100;

/**
 * Value trend of the collection, or undefined when no copy has a known average. A missing average takes the closest
 * known one, so every period sums the same copies and the curve only shows price changes.
 */
export function computeValueTrend(
  copies: readonly Copy[],
  trends: ReadonlyMap<string, PriceTrend>,
): ValueTrend | undefined {
  let avg30 = 0;
  let avg7 = 0;
  let avg1 = 0;
  let untrackedCopyCount = 0;
  for (const copy of copies) {
    const trend = trends.get(priceKey(copy.cardId, copy.variant));
    const closest30 = trend?.avg30 ?? trend?.avg7 ?? trend?.avg1;
    const closest7 = trend?.avg7 ?? trend?.avg1 ?? trend?.avg30;
    const closest1 = trend?.avg1 ?? trend?.avg7 ?? trend?.avg30;
    if (closest30 === undefined || closest7 === undefined || closest1 === undefined) {
      untrackedCopyCount += 1;
      continue;
    }
    avg30 += closest30 * copy.quantity;
    avg7 += closest7 * copy.quantity;
    avg1 += closest1 * copy.quantity;
  }
  if (avg1 === 0) return undefined;
  return {
    avg30: roundCents(avg30),
    avg7: roundCents(avg7),
    avg1: roundCents(avg1),
    currency: 'EUR',
    untrackedCopyCount,
  };
}

/** Recent change of the value, meaning the average of the last day against the average of the last 7 days. */
export function recentValueChange(trend: ValueTrend): number {
  return roundCents(trend.avg1 - trend.avg7);
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

/** A snapshot as the app receives it, for the signed in account only. */
export type DailyValue = Pick<ValueSnapshot, 'date' | 'amount'>;

/**
 * The value history with today's value at its end, since the last snapshot was taken at night and copies may have
 * changed since. Today's value replaces a snapshot of the same day. Returns the points oldest first.
 */
export function withTodayValue(history: readonly DailyValue[], today: DailyValue): DailyValue[] {
  return [...history.filter((snapshot) => snapshot.date < today.date), today];
}

/** How the value moved since the day before, or undefined with fewer than two points. */
export function dailyValueChange(points: readonly DailyValue[]): number | undefined {
  const last = points.at(-1);
  const before = points.at(-2);
  return last && before ? roundCents(last.amount - before.amount) : undefined;
}
