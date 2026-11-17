// Reading the number printed at the bottom of a card, from the text found on a photo of it.

import type { Card, CardSet } from './catalog.ts';
import { normalizeSearchText } from './search.ts';

/** A number as printed on a card, for example 006/165, TG05/TG30 or 180/165 for a secret card. */
export interface PrintedNumber {
  /** The number of the card, "006" or "TG05". */
  localId: string;
  /** The total printed after the slash, "165" or "TG30". */
  printedTotal: string;
}

// Letters a photo often reads in place of digits.
const DIGIT_LOOKALIKES: Record<string, string> = {
  o: '0',
  O: '0',
  D: '0',
  i: '1',
  I: '1',
  l: '1',
  L: '1',
  S: '5',
  s: '5',
  B: '8',
  Z: '2',
};

const PRINTED_NUMBER = /([A-Za-z]{0,3})\s?([0-9OoIlDSBZ]{1,3})\s*\/\s*([A-Za-z]{0,3})\s?([0-9OoIlDSBZ]{1,3})(?![0-9])/g;

const toDigits = (text: string) => text.replace(/[OoIlLDSsBZi]/g, (char) => DIGIT_LOOKALIKES[char] ?? char);

/** Without the same prefix on the other side of the slash, letters before a number are a misread digit or noise. */
function withoutPrefix(prefix: string, digits: string): string {
  const prefixAsDigits = toDigits(prefix);
  return /^\d+$/.test(prefixAsDigits) ? `${prefixAsDigits}${digits}`.slice(-3) : digits;
}

/**
 * Finds the printed numbers in the text read on a photo. Letters that look like digits count as digits, so "O06/165"
 * reads as 006/165. A prefix kept on both sides, as in TG05/TG30, stays a prefix.
 */
export function readPrintedNumbers(text: string): PrintedNumber[] {
  const found = new Map<string, PrintedNumber>();
  for (const [, idPrefix = '', idDigits = '', totalPrefix = '', totalDigits = ''] of text.matchAll(PRINTED_NUMBER)) {
    const total = toDigits(totalDigits);
    const digits = toDigits(idDigits);
    if (!/^\d+$/.test(total) || !/^\d+$/.test(digits) || Number(total) === 0) continue;
    const sharedPrefix = idPrefix.length > 0 && idPrefix.toUpperCase() === totalPrefix.toUpperCase();
    const localId = sharedPrefix ? `${idPrefix.toUpperCase()}${digits}` : withoutPrefix(idPrefix, digits);
    const printedTotal = sharedPrefix ? `${totalPrefix.toUpperCase()}${total}` : withoutPrefix(totalPrefix, total);
    found.set(`${localId}/${printedTotal}`, { localId, printedTotal });
  }
  return [...found.values()];
}

/** The number of cards a printed total announces, 165 for "165" and 30 for "TG30". */
const totalCount = (printedTotal: string) => Number(printedTotal.replace(/^[A-Z]+/, ''));

/** Sets whose printed total matches the number, newest first. Several sets can share a total. */
export function setsForPrintedNumber(sets: readonly CardSet[], number: PrintedNumber): CardSet[] {
  const count = totalCount(number.printedTotal);
  return sets
    .filter((set) => set.cardCount.official === count)
    .sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''));
}

/** "006", "06" and "6" are the same number, and the prefix is compared without case. */
const comparableLocalId = (localId: string) => {
  const [, prefix = '', digits = ''] = /^([A-Za-z]*)(\d*)$/.exec(localId) ?? [];
  return `${prefix.toUpperCase()}${digits.replace(/^0+(?=.)/, '')}`;
};

/** The card of a set that carries this number, if any. */
export function cardWithNumber(cards: readonly Card[], number: PrintedNumber): Card | undefined {
  const wanted = comparableLocalId(number.localId);
  return cards.find((card) => comparableLocalId(card.localId) === wanted);
}

export interface ScanMatch {
  card: Card;
  set: CardSet;
}

/**
 * Orders the cards that carry a number read on the photo. A card whose name was also read comes first, since it is
 * almost certainly the one. Otherwise the newest set comes first, as the order of the matches says.
 */
export function rankScanMatches(matches: readonly ScanMatch[], text: string): ScanMatch[] {
  const read = ` ${normalizeSearchText(text)} `;
  const named = (match: ScanMatch) => read.includes(` ${normalizeSearchText(match.card.name)} `);
  return [...matches.filter(named), ...matches.filter((match) => !named(match))];
}
