import type { CardSet } from './catalog.ts';
import type { Copy } from './collection.ts';

export interface SetProgress {
  setId: string;
  owned: number;
  total: number;
  /** Between 0 and 1. */
  ratio: number;
}

/**
 * Progress, meaning distinct owned cards over the total of the set, secret cards included. Variant, language and
 * quantity do not count.
 */
export function computeSetProgress(set: CardSet, copies: readonly Copy[]): SetProgress {
  const ownedCardIds = new Set(copies.filter((copy) => copy.setId === set.id).map((copy) => copy.cardId));
  return progressOf(set, ownedCardIds.size);
}

/**
 * Progress of every set at once. Copies are grouped by set in a single pass instead of being scanned again for each
 * set.
 */
export function computeAllSetProgress(sets: readonly CardSet[], copies: readonly Copy[]): Map<string, SetProgress> {
  const ownedBySet = new Map<string, Set<string>>();
  for (const copy of copies) {
    let owned = ownedBySet.get(copy.setId);
    if (!owned) ownedBySet.set(copy.setId, (owned = new Set()));
    owned.add(copy.cardId);
  }
  return new Map(sets.map((set) => [set.id, progressOf(set, ownedBySet.get(set.id)?.size ?? 0)]));
}

function progressOf(set: CardSet, distinctOwned: number): SetProgress {
  const total = set.cardCount.total;
  const owned = Math.min(distinctOwned, total);
  return { setId: set.id, owned, total, ratio: total === 0 ? 0 : owned / total };
}
