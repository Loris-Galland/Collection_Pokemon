import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Card, CardSet } from './catalog.ts';
import { cardWithNumber, rankScanMatches, readPrintedNumbers, setsForPrintedNumber } from './scan.ts';

const set = (id: string, official: number, releaseDate: string): CardSet => ({
  id,
  name: id,
  releaseDate,
  cardCount: { official, total: official + 10 },
});

const card = (setId: string, localId: string, name: string): Card => ({
  id: `${setId}-${localId}`,
  setId,
  localId,
  name,
  variants: [],
});

describe('readPrintedNumbers', () => {
  it('reads a number and its total', () => {
    assert.deepEqual(readPrintedNumbers('Illus. Mitsuhiro Arita 006/165 ★'), [{ localId: '006', printedTotal: '165' }]);
  });

  it('reads letters that look like digits as digits', () => {
    assert.deepEqual(readPrintedNumbers('O06/l65'), [{ localId: '006', printedTotal: '165' }]);
  });

  it('keeps a prefix printed on both sides', () => {
    assert.deepEqual(readPrintedNumbers('TG05/TG30'), [{ localId: 'TG05', printedTotal: 'TG30' }]);
  });

  it('accepts spaces around the slash and secret numbers above the total', () => {
    assert.deepEqual(readPrintedNumbers('199 / 165'), [{ localId: '199', printedTotal: '165' }]);
  });

  it('finds nothing in text without a number', () => {
    assert.deepEqual(readPrintedNumbers('Pikachu PV 60 Électrique'), []);
  });

  it('lists each number once', () => {
    assert.equal(readPrintedNumbers('6/102 6/102').length, 1);
  });
});

describe('setsForPrintedNumber', () => {
  it('keeps the sets with that printed total, newest first', () => {
    const sets = [set('old', 165, '2015-01-01'), set('other', 102, '2016-01-01'), set('new', 165, '2023-06-16')];
    assert.deepEqual(
      setsForPrintedNumber(sets, { localId: '006', printedTotal: '165' }).map((found) => found.id),
      ['new', 'old'],
    );
  });

  it('reads the count of a total with a prefix', () => {
    const sets = [set('tg', 30, '2022-02-25')];
    assert.equal(setsForPrintedNumber(sets, { localId: 'TG05', printedTotal: 'TG30' }).length, 1);
  });
});

describe('cardWithNumber', () => {
  const cards = [card('a', '6', 'Dracaufeu'), card('a', 'TG05', 'Pikachu')];

  it('ignores leading zeros', () => {
    assert.equal(cardWithNumber(cards, { localId: '006', printedTotal: '165' })?.name, 'Dracaufeu');
  });

  it('compares a prefix without case', () => {
    assert.equal(cardWithNumber(cards, { localId: 'tg05', printedTotal: 'TG30' })?.name, 'Pikachu');
  });

  it('gives nothing for a number the set does not have', () => {
    assert.equal(cardWithNumber(cards, { localId: '7', printedTotal: '165' }), undefined);
  });
});

describe('rankScanMatches', () => {
  it('puts first the card whose name was read on the photo', () => {
    const matches = [
      { card: card('new', '6', 'Bulbizarre'), set: set('new', 165, '2023-06-16') },
      { card: card('old', '6', 'Dracaufeu'), set: set('old', 165, '2015-01-01') },
    ];
    assert.deepEqual(
      rankScanMatches(matches, 'DRACAUFEU PV 170 006/165').map((match) => match.card.name),
      ['Dracaufeu', 'Bulbizarre'],
    );
  });
});
