// The collection, meaning what a user owns.

import { isLanguage, isVariant, type Language, type Variant } from './catalog.ts';

export type Condition = 'mint' | 'near-mint' | 'excellent' | 'good' | 'light-played' | 'played' | 'poor';

/** Cardmarket scale, from best to worst condition. */
export const CONDITIONS: readonly Condition[] = [
  'mint',
  'near-mint',
  'excellent',
  'good',
  'light-played',
  'played',
  'poor',
];

export const CONDITION_LABELS: Record<Condition, string> = {
  mint: 'Mint',
  'near-mint': 'Near Mint',
  excellent: 'Excellent',
  good: 'Good',
  'light-played': 'Light Played',
  played: 'Played',
  poor: 'Poor',
};

/** Cardmarket abbreviations, short enough to fit on a card. */
export const CONDITION_ABBREVIATIONS: Record<Condition, string> = {
  mint: 'MT',
  'near-mint': 'NM',
  excellent: 'EX',
  good: 'GD',
  'light-played': 'LP',
  played: 'PL',
  poor: 'PO',
};

export const DEFAULT_CONDITION: Condition = 'near-mint';

/**
 * Copy. A card in a given variant, language and condition, with its quantity. Two identical combinations form a single
 * copy.
 */
export interface Copy {
  id: string;
  cardId: string;
  setId: string;
  variant: Variant;
  language: Language;
  condition: Condition;
  quantity: number;
}

export type CopyInput = Omit<Copy, 'id'>;

function isSameCombination(a: CopyInput, b: CopyInput): boolean {
  return a.cardId === b.cardId && a.variant === b.variant && a.language === b.language && a.condition === b.condition;
}

/**
 * Adds to the collection. If the copy already exists with the same combination, its quantity goes up instead of
 * creating a duplicate.
 */
export function addCopy(copies: readonly Copy[], input: CopyInput, newId: () => string): Copy[] {
  if (input.quantity < 1) return [...copies];
  const existing = copies.find((copy) => isSameCombination(copy, input));
  if (existing) {
    return copies.map((copy) =>
      copy.id === existing.id ? { ...copy, quantity: copy.quantity + input.quantity } : copy,
    );
  }
  return [...copies, { ...input, id: newId() }];
}

/** Changes the quantity of a copy. At 0 the copy is removed. */
export function setCopyQuantity(copies: readonly Copy[], copyId: string, quantity: number): Copy[] {
  if (quantity < 1) return copies.filter((copy) => copy.id !== copyId);
  return copies.map((copy) => (copy.id === copyId ? { ...copy, quantity } : copy));
}

/** Removes a copy from the collection. */
export function removeCopy(copies: readonly Copy[], copyId: string): Copy[] {
  return copies.filter((copy) => copy.id !== copyId);
}

/**
 * A change to the collection. An add carries the id of the copy it may create, so the phone and whoever stores the
 * collection end up with the same result.
 */
export type CollectionChange =
  | { type: 'add'; id: string; input: CopyInput }
  | { type: 'set-quantity'; copyId: string; quantity: number }
  | { type: 'remove'; copyId: string };

/** Applies a change to the collection. */
export function applyCollectionChange(copies: readonly Copy[], change: CollectionChange): Copy[] {
  switch (change.type) {
    case 'add':
      return addCopy(copies, change.input, () => change.id);
    case 'set-quantity':
      return setCopyQuantity(copies, change.copyId, change.quantity);
    case 'remove':
      return removeCopy(copies, change.copyId);
  }
}

/** Total owned quantity per card, across every variant, language and condition. */
export function countOwnedQuantities(copies: readonly Copy[]): Map<string, number> {
  const quantities = new Map<string, number>();
  for (const copy of copies) quantities.set(copy.cardId, (quantities.get(copy.cardId) ?? 0) + copy.quantity);
  return quantities;
}

/** Key figures of the collection, meaning the number of copies (quantities included) and of distinct cards. */
export function summarizeCollection(copies: readonly Copy[]): { copyCount: number; distinctCardCount: number } {
  const copyCount = copies.reduce((sum, copy) => sum + copy.quantity, 0);
  return { copyCount, distinctCardCount: new Set(copies.map((copy) => copy.cardId)).size };
}

export function isCondition(value: unknown): value is Condition {
  return CONDITIONS.includes(value as Condition);
}

/**
 * Checks that received data (local storage, request) is a valid copy. Ids are present, values belong to the allowed
 * lists and the quantity is a whole number of at least 1.
 */
export function isCopy(value: unknown): value is Copy {
  if (typeof value !== 'object' || value === null) return false;
  const copy = value as Record<string, unknown>;
  return (
    typeof copy.id === 'string' &&
    typeof copy.cardId === 'string' &&
    typeof copy.setId === 'string' &&
    isVariant(copy.variant) &&
    isLanguage(copy.language) &&
    isCondition(copy.condition) &&
    Number.isInteger(copy.quantity) &&
    (copy.quantity as number) >= 1
  );
}
