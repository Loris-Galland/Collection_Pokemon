/// <reference types="node" />
import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import { cardImageUrl, fetchCard, fetchSet, fetchSets, searchCards } from './tcgdex.ts';

const ASSETS = 'https://assets.tcgdex.net';
const cardCount = { official: 2, total: 2 };

/** Answers each TCGdex path from a table, and with a 404 for anything else. */
function mockApi(routes: Record<string, unknown>) {
  const requested: string[] = [];
  mock.method(globalThis, 'fetch', async (url: string) => {
    const path = url.replace('https://api.tcgdex.net/v2/', '');
    requested.push(path);
    const body = routes[path];
    return { ok: body !== undefined, status: body === undefined ? 404 : 200, json: async () => body } as Response;
  });
  return requested;
}

afterEach(() => mock.restoreAll());

describe('missing pictures', () => {
  it('fills the cards and the logo of a set from the other language', async () => {
    mockApi({
      'fr/sets/a': {
        id: 'a',
        name: 'A',
        cardCount,
        cards: [
          { id: 'a-1', localId: '1', name: 'Un', image: `${ASSETS}/fr/x/a/1` },
          { id: 'a-2', localId: '2', name: 'Deux' },
        ],
      },
      'en/sets/a': {
        id: 'a',
        name: 'A',
        logo: `${ASSETS}/en/x/a/logo`,
        cardCount,
        cards: [
          { id: 'a-1', localId: '1', name: 'One', image: `${ASSETS}/en/x/a/1` },
          { id: 'a-2', localId: '2', name: 'Two', image: `${ASSETS}/en/x/a/2` },
        ],
      },
    });

    const { set, cards } = await fetchSet('fr', 'a');

    assert.equal(cards[0].imageUrl, `${ASSETS}/fr/x/a/1`, 'a picture in the right language stays');
    assert.equal(cards[1].imageUrl, `${ASSETS}/en/x/a/2`);
    assert.equal(cards[1].name, 'Deux', 'only the picture comes from the other language');
    assert.equal(set.logoUrl, `${ASSETS}/en/x/a/logo.webp`);
  });

  it('keeps showing the set when the other language has nothing', async () => {
    mockApi({
      'fr/sets/b': { id: 'b', name: 'B', cardCount, cards: [{ id: 'b-1', localId: '1', name: 'Un' }] },
    });

    const { cards } = await fetchSet('fr', 'b');

    assert.equal(cards[0].imageUrl, undefined);
  });

  it('refuses a fallback picture from another host', async () => {
    mockApi({
      'fr/sets/c': { id: 'c', name: 'C', cardCount, cards: [{ id: 'c-1', localId: '1', name: 'Un' }] },
      'en/sets/c': { id: 'c', name: 'C', cardCount, cards: [{ id: 'c-1', localId: '1', name: 'One', image: 'https://evil.example/1' }] },
    });

    const { cards } = await fetchSet('fr', 'c');

    assert.equal(cards[0].imageUrl, undefined);
  });

  it('asks nothing more when a set is complete', async () => {
    const requested = mockApi({
      'en/sets/d': {
        id: 'd',
        name: 'D',
        logo: `${ASSETS}/en/x/d/logo`,
        symbol: `${ASSETS}/univ/x/d/symbol`,
        cardCount,
        cards: [{ id: 'd-1', localId: '1', name: 'One', image: `${ASSETS}/en/x/d/1` }],
      },
    });

    await fetchSet('en', 'd');

    assert.deepEqual(requested, ['en/sets/d']);
  });

  it('fills the logos of the set list', async () => {
    mockApi({
      'fr/sets': [{ id: 'e', name: 'E', cardCount }],
      'en/sets': [{ id: 'e', name: 'E', logo: `${ASSETS}/en/x/e/logo`, cardCount }],
    });

    const [set] = await fetchSets('fr');

    assert.equal(set.logoUrl, `${ASSETS}/en/x/e/logo.webp`);
  });

  it('still lists the sets when the other language fails', async () => {
    mockApi({ 'fr/sets': [{ id: 'f', name: 'F', cardCount }] });

    const sets = await fetchSets('fr');

    assert.equal(sets.length, 1);
  });

  it('fills the picture of a single card', async () => {
    mockApi({
      'fr/cards/g-1': { id: 'g-1', localId: '1', name: 'Un', set: { id: 'g', name: 'G', cardCount } },
      'en/cards/g-1': { id: 'g-1', localId: '1', name: 'One', image: `${ASSETS}/en/x/g/1` },
    });

    const { card } = await fetchCard('fr', 'g-1');

    assert.equal(card.imageUrl, `${ASSETS}/en/x/g/1`);
    assert.equal(card.name, 'Un');
  });

  it('fills the pictures of search results', async () => {
    mockApi(searchCatalog);

    const { cards } = await searchCards('fr', 'Deux');

    assert.equal(cards[0].imageUrl, `${ASSETS}/en/x/old/2`);
  });
});

describe('pictures from the bundled table', () => {
  it('fills a set no TCGdex language has pictures for', async () => {
    mockApi({
      'fr/sets/30th-c': { id: '30th-c', name: 'Collection Classique', cardCount, cards: [{ id: '30th-c-001', localId: '001', name: 'Dracaufeu' }] },
      'en/sets/30th-c': { id: '30th-c', name: 'Classic Collection', cardCount, cards: [{ id: '30th-c-001', localId: '001', name: 'Charizard' }] },
    });

    const { set, cards } = await fetchSet('fr', '30th-c');

    assert.equal(cards[0].imageUrl, 'https://images.scrydex.com/pokemon/me55c-4/small');
    assert.ok(set.logoUrl?.startsWith('https://images.scrydex.com/'));
  });

  it('replaces a logo TCGdex announces without having', async () => {
    mockApi({
      'fr/sets/me05': { id: 'me05', name: 'Nuit Noire', logo: `${ASSETS}/fr/me/me05/logo`, symbol: `${ASSETS}/univ/me/me05/symbol`, cardCount, cards: [] },
    });

    const { set } = await fetchSet('fr', 'me05');

    assert.equal(set.logoUrl, `${ASSETS}/en/me/me05/logo.webp`);
  });
});

describe('TCG Pocket', () => {
  it('leaves its sets out of the list', async () => {
    mockApi({ 'en/sets': [{ id: 'A1', name: 'Genetic Apex', cardCount }, { id: 'sv01', name: 'Scarlet', cardCount }] });

    const sets = await fetchSets('en');

    assert.deepEqual(sets.map((set) => set.id), ['sv01']);
  });
});

describe('cardImageUrl', () => {
  it('adds the quality and the format to a TCGdex address', () => {
    assert.equal(cardImageUrl(`${ASSETS}/fr/x/1`, 'high'), `${ASSETS}/fr/x/1/high.webp`);
  });

  it('finds the large picture of a table address', () => {
    assert.equal(cardImageUrl('https://images.scrydex.com/pokemon/me55c-4/small', 'low'), 'https://images.scrydex.com/pokemon/me55c-4/small');
    assert.equal(cardImageUrl('https://images.scrydex.com/pokemon/me55c-4/small', 'high'), 'https://images.scrydex.com/pokemon/me55c-4/large');
    assert.equal(cardImageUrl('https://images.pokemontcg.io/sm35/1.png', 'high'), 'https://images.pokemontcg.io/sm35/1_hires.png');
  });
});

const searchCatalog = {
  'fr/cards': [
    { id: 'old-1', localId: '1', name: 'Salamèche', image: `${ASSETS}/fr/x/old/1` },
    { id: 'old-2', localId: '2', name: 'Deux' },
    { id: 'new-1', localId: '1', name: 'Salamèche', image: `${ASSETS}/fr/x/new/1` },
    { id: 'A1-009', localId: '009', name: 'Salamèche', image: `${ASSETS}/fr/tcgp/A1/009` },
  ],
  'fr/sets': [
    { id: 'old', name: 'Ancienne', cardCount },
    { id: 'new', name: 'Récente', cardCount },
  ],
  'en/cards': [
    { id: 'old-1', localId: '1', name: 'Charmander' },
    { id: 'old-2', localId: '2', name: 'Two', image: `${ASSETS}/en/x/old/2` },
    { id: 'new-1', localId: '1', name: 'Charmander' },
  ],
  'en/sets': [
    { id: 'old', name: 'Old', cardCount },
    { id: 'new', name: 'New', cardCount },
  ],
  'en/sets/old': { id: 'old', name: 'Old', cardCount, cards: [{ id: 'old-2', localId: '2', name: 'Two', image: `${ASSETS}/en/x/old/2` }] },
};

describe('searchCards', () => {
  it('ignores accents, shows the newest sets first and leaves TCG Pocket out', async () => {
    mockApi(searchCatalog);

    const { cards, total } = await searchCards('fr', 'salameche');

    assert.equal(total, 2);
    assert.deepEqual(cards.map((card) => card.id), ['new-1', 'old-1']);
    assert.equal(cards[0].setId, 'new');
  });

  it('finds a card by its name in the other language and keeps the catalog language', async () => {
    mockApi(searchCatalog);

    const { cards } = await searchCards('fr', 'charmander');

    assert.deepEqual(cards.map((card) => card.name), ['Salamèche', 'Salamèche']);
  });

  it('narrows with the set name', async () => {
    mockApi(searchCatalog);

    const { cards } = await searchCards('fr', 'salameche ancienne');

    assert.deepEqual(cards.map((card) => card.id), ['old-1']);
  });

  it('finds nothing when no language knows the name', async () => {
    mockApi(searchCatalog);

    const { cards, total } = await searchCards('fr', 'zzzz');

    assert.equal(total, 0);
    assert.deepEqual(cards, []);
  });
});

describe('prices that belong to another card', () => {
  // TCGdex gave the three Mega Rayquaza ex of Delta Reign the price of the plain one.
  const pricedCard = (localId: string) => ({
    id: `me06-${localId}`,
    localId,
    name: 'Méga-Rayquaza-ex',
    image: `${ASSETS}/fr/me/me06/${localId}`,
    variants: { holo: true },
    set: { id: 'me06', name: 'Règne Delta', cardCount },
    pricing: { cardmarket: { idProduct: 918912, avg: 7.49, trend: 4.43, avg30: 4.42 } },
  });

  it('keeps the price of the base print', async () => {
    mockApi({ 'fr/cards/me06-084': pricedCard('084') });
    const { prices } = await fetchCard('fr', 'me06-084');
    // No 7 day average here, so the price is the 30 day one.
    assert.equal(prices[0]?.amount, 4.42);
  });

  it('shows no price for a rarer print linked to the same Cardmarket product', async () => {
    mockApi({ 'fr/cards/me06-138': pricedCard('138') });
    const { prices, trends } = await fetchCard('fr', 'me06-138');
    assert.deepEqual(prices, []);
    assert.deepEqual(trends, []);
  });
});
