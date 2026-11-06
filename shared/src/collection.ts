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

/** What makes two copies the same. Each combination exists only once in a collection. */
export type CopyCombination = Pick<Copy, 'cardId' | 'variant' | 'language' | 'condition'>;

export function combinationOf(input: CopyInput): CopyCombination {
  return { cardId: input.cardId, variant: input.variant, language: input.language, condition: input.condition };
}

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
  | { type: 'add-many'; entries: readonly { id: string; input: CopyInput }[] }
  | { type: 'set-quantity'; copyId: string; quantity: number }
  | { type: 'remove'; copyId: string };

/** Applies a change to the collection. */
export function applyCollectionChange(copies: readonly Copy[], change: CollectionChange): Copy[] {
  switch (change.type) {
    case 'add':
      return addCopy(copies, change.input, () => change.id);
    case 'add-many':
      return change.entries.reduce<Copy[]>((result, entry) => addCopy(result, entry.input, () => entry.id), [...copies]);
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

/** Every copy of one card, whatever its variant, language or condition. */
export function copiesOfCard(copies: readonly Copy[], cardId: string): Copy[] {
  return copies.filter((copy) => copy.cardId === cardId);
}

export function isCondition(value: unknown): value is Condition {
  return CONDITIONS.includes(value as Condition);
}

/** Longest id accepted from outside, so a request cannot fill the database with huge keys. */
export const MAX_ID_LENGTH = 64;

/** Highest quantity of a single copy. */
export const MAX_COPY_QUANTITY = 9999;

/** Most cards in one add-many, more than the largest set holds. */
export const MAX_ENTRIES_PER_CHANGE = 500;

// Ids made on the phone, and catalog ids as TCGdex writes them. The Unown cards are the only ones with "!" or "%".
const COPY_ID = /^[A-Za-z0-9._-]+$/;
const CATALOG_ID = /^[A-Za-z0-9._!%-]+$/;

const isId = (value: unknown, format = COPY_ID): value is string =>
  typeof value === 'string' && value.length <= MAX_ID_LENGTH && format.test(value);

const isCatalogId = (value: unknown): value is string => isId(value, CATALOG_ID);

const isQuantity = (value: unknown, min: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= MAX_COPY_QUANTITY;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** Checks that received data is a valid copy input. Values belong to the allowed lists and the quantity is at least 1. */
export function isCopyInput(value: unknown): value is CopyInput {
  if (!isRecord(value)) return false;
  return (
    isCatalogId(value.cardId) &&
    isCatalogId(value.setId) &&
    // A card id is its set id followed by its number.
    value.cardId.startsWith(`${value.setId}-`) &&
    isVariant(value.variant) &&
    isLanguage(value.language) &&
    isCondition(value.condition) &&
    isQuantity(value.quantity, 1)
  );
}

/** Checks that received data (local storage, request) is a valid copy. */
export function isCopy(value: unknown): value is Copy {
  return isRecord(value) && isId(value.id) && isCopyInput(value);
}

/** Checks that a change received from the phone is well formed before it touches the collection. */
export function isCollectionChange(value: unknown): value is CollectionChange {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case 'add':
      return isId(value.id) && isCopyInput(value.input);
    case 'add-many':
      return (
        Array.isArray(value.entries) &&
        value.entries.length > 0 &&
        value.entries.length <= MAX_ENTRIES_PER_CHANGE &&
        value.entries.every((entry: unknown) => isRecord(entry) && isId(entry.id) && isCopyInput(entry.input)) &&
        new Set(value.entries.map((entry: { id: string }) => entry.id)).size === value.entries.length
      );
    case 'set-quantity':
      return isId(value.copyId) && isQuantity(value.quantity, 0);
    case 'remove':
      return isId(value.copyId);
    default:
      return false;
  }
}
