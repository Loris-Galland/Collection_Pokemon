import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSearchIndex, normalizeSearchText, searchIndex, type SearchableCard } from './search.ts';

const cards: SearchableCard[] = [
  { name: 'Dracaufeu EX', localId: '011', setName: 'Étincelles Déferlantes' },
  { name: 'M-Dracaufeu EX', localId: '012', setName: 'Offensive Vapeur' },
  { name: 'Dracaufeu', localId: '006', setName: 'Écarlate et Violet 151' },
  { name: 'Salamèche', localId: '004', setName: 'Écarlate et Violet 151' },
  { name: 'Évoli', localId: '133', setName: 'Évolutions' },
  { name: 'M. Mime', localId: '122', setName: 'Base' },
];
const index = createSearchIndex(cards, (card) => card);
const names = (query: string) => searchIndex(index, query).map((card) => card.name);

describe('normalizeSearchText', () => {
  it('ignores case, accents and punctuation', () => {
    assert.equal(normalizeSearchText('  Salamèche '), 'salameche');
    assert.equal(normalizeSearchText('M. Mime'), 'm mime');
    assert.equal(normalizeSearchText('M-Dracaufeu'), 'm dracaufeu');
  });
});

describe('searchIndex', () => {
  it('finds a name typed without its accents', () => {
    assert.deepEqual(names('salameche'), ['Salamèche']);
    assert.deepEqual(names('evoli'), ['Évoli']);
  });

  it('finds a name typed with accents it does not have', () => {
    assert.deepEqual(names('drâcaufeu'), ['Dracaufeu', 'Dracaufeu EX', 'M-Dracaufeu EX']);
  });

  it('puts the closest names first', () => {
    assert.deepEqual(names('dracaufeu'), ['Dracaufeu', 'Dracaufeu EX', 'M-Dracaufeu EX']);
  });

  it('keeps the order of the index between equal matches', () => {
    const newestFirst = createSearchIndex(
      [
        { name: 'Pikachu', localId: '1', setName: 'Récente' },
        { name: 'Pikachu', localId: '2', setName: 'Ancienne' },
      ],
      (card) => card,
    );
    assert.deepEqual(
      searchIndex(newestFirst, 'pikachu').map((card) => card.setName),
      ['Récente', 'Ancienne'],
    );
  });

  it('narrows with the set name', () => {
    assert.deepEqual(names('dracaufeu 151'), ['Dracaufeu']);
  });

  it('narrows with the number, with or without zeros or the set size', () => {
    assert.deepEqual(names('dracaufeu 6'), ['Dracaufeu']);
    assert.deepEqual(names('dracaufeu 006'), ['Dracaufeu']);
    assert.deepEqual(names('006/165'), ['Dracaufeu']);
  });

  it('needs every word to match', () => {
    assert.deepEqual(names('dracaufeu mewtwo'), []);
  });

  it('accepts words in any order', () => {
    assert.deepEqual(names('ex dracaufeu'), ['Dracaufeu EX', 'M-Dracaufeu EX']);
  });

  it('matches a set word from its start only', () => {
    assert.deepEqual(names('ase'), []);
  });

  it('finds nothing for an empty query', () => {
    assert.deepEqual(names('  -  '), []);
  });
});
