/// <reference types="node" />
import type { CollectionChange, Copy, CopyInput } from '@collection/shared';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CollectionSourceError, type CollectionSource, type LoadedCollection } from './collection-source.ts';
import { createCollectionStore } from './collection-store.ts';

const input: CopyInput = {
  cardId: 'sv03.5-006',
  setId: 'sv03.5',
  variant: 'holo',
  language: 'fr',
  condition: 'near-mint',
  quantity: 1,
};
const saved: Copy = { ...input, id: 'saved', cardId: 'sv03.5-007' };

/** A source whose answers are given by hand, to control what happens while a change is being saved. */
function fakeSource(loaded: LoadedCollection = { copies: [saved], readOnly: false }) {
  const received: CollectionChange[] = [];
  const answers: { resolve: () => void; reject: (error: Error) => void }[] = [];
  const source: CollectionSource = {
    load: async () => loaded,
    apply: (change) =>
      new Promise((resolve, reject) => {
        received.push(change);
        answers.push({ resolve, reject });
      }),
  };
  return { source, received, answers };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

async function loadedStore(loaded?: LoadedCollection) {
  const fake = fakeSource(loaded);
  let nextId = 0;
  const store = createCollectionStore(fake.source, () => `new-${++nextId}`);
  await store.load();
  return { ...fake, store };
}

const ids = (copies: readonly Copy[]) => copies.map((copy) => copy.id);

describe('collection store', () => {
  it('shows a change at once and confirms it when the source answers', async () => {
    const { store, answers } = await loadedStore();
    store.add(input);
    assert.deepEqual(ids(store.getState().copies), ['saved', 'new-1']);
    assert.deepEqual(ids(store.getState().savedCopies), ['saved']);

    await settle();
    answers[0]?.resolve();
    await settle();
    assert.deepEqual(ids(store.getState().savedCopies), ['saved', 'new-1']);
    assert.equal(store.getState().saveError, undefined);
  });

  it('keeps the same list reference when a change is confirmed, so screens are not redrawn', async () => {
    const { store, answers } = await loadedStore();
    store.add(input);
    const shown = store.getState().copies;
    await settle();
    answers[0]?.resolve();
    await settle();
    assert.equal(store.getState().copies, shown);
  });

  it('sends changes one at a time and in order', async () => {
    const { store, received, answers } = await loadedStore();
    store.setQuantity('saved', 2);
    store.setQuantity('saved', 3);
    await settle();
    assert.equal(received.length, 1);

    answers[0]?.resolve();
    await settle();
    assert.deepEqual(received.at(-1), { type: 'set-quantity', copyId: 'saved', quantity: 3 });
  });

  it('undoes a refused change and keeps the ones after it', async () => {
    const { store, answers } = await loadedStore();
    store.add(input);
    store.setQuantity('saved', 5);
    await settle();

    answers[0]?.reject(new Error('refused'));
    await settle();
    assert.equal(store.getState().saveError, 'other');
    assert.deepEqual(ids(store.getState().copies), ['saved']);
    assert.equal(store.getState().copies[0]?.quantity, 5);

    answers[1]?.resolve();
    await settle();
    assert.equal(store.getState().savedCopies[0]?.quantity, 5);
  });

  it('clears the save error on request and on the next change', async () => {
    const { store, answers } = await loadedStore();
    store.remove('saved');
    await settle();
    answers[0]?.reject(new Error('refused'));
    await settle();
    assert.deepEqual(ids(store.getState().copies), ['saved']);

    store.dismissSaveError();
    assert.equal(store.getState().saveError, undefined);

    store.remove('saved');
    await settle();
    answers[1]?.reject(new Error('refused'));
    await settle();
    assert.equal(store.getState().saveError, 'other');

    store.setQuantity('saved', 2);
    assert.equal(store.getState().saveError, undefined);
  });

  it('ignores changes when the collection is read-only', async () => {
    const { store, received } = await loadedStore({ copies: [saved], readOnly: true });
    assert.equal(store.getState().status, 'read-only');
    store.add(input);
    await settle();
    assert.deepEqual(ids(store.getState().copies), ['saved']);
    assert.deepEqual(received, []);
  });

  it('becomes unavailable when loading fails, and can try again', async () => {
    let attempts = 0;
    const source: CollectionSource = {
      load: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('offline');
        return { copies: [saved], readOnly: false };
      },
      apply: async () => {},
    };
    const store = createCollectionStore(source, () => 'id');

    await store.load();
    assert.equal(store.getState().status, 'unavailable');

    await store.load();
    assert.equal(store.getState().status, 'ready');
    assert.deepEqual(ids(store.getState().copies), ['saved']);
  });

  it('loads only once when asked twice at the same time', async () => {
    let attempts = 0;
    const source: CollectionSource = {
      load: async () => {
        attempts += 1;
        return { copies: [], readOnly: false };
      },
      apply: async () => {},
    };
    const store = createCollectionStore(source, () => 'id');
    await Promise.all([store.load(), store.load()]);
    assert.equal(attempts, 1);
  });
});

describe('adding several copies', () => {
  it('saves them as one change and redraws once', async () => {
    const applied: CollectionChange[] = [];
    let id = 0;
    const store = createCollectionStore(
      { load: async () => ({ copies: [], readOnly: false }), apply: async (change) => void applied.push(change) },
      () => `id-${++id}`,
    );
    await store.load();
    let redraws = 0;
    store.subscribe(() => redraws++);

    store.addMany([input, { ...input, cardId: 'sv03.5-007' }, { ...input, cardId: 'sv03.5-008' }]);

    assert.equal(store.getState().copies.length, 3);
    assert.equal(redraws, 1, 'the screen redraws once for the whole selection');
    await new Promise((resolve) => setTimeout(resolve));
    assert.equal(applied.length, 1, 'the source writes once');
    assert.equal(store.getState().savedCopies.length, 3);
  });

  it('undoes the whole selection when it cannot be saved', async () => {
    const store = createCollectionStore(
      { load: async () => ({ copies: [], readOnly: false }), apply: async () => { throw new Error('refused'); } },
      () => 'id',
    );
    await store.load();

    store.addMany([input, { ...input, cardId: 'sv03.5-007' }]);
    await new Promise((resolve) => setTimeout(resolve));

    assert.equal(store.getState().copies.length, 0);
    assert.equal(store.getState().saveError, 'other');
  });
});

describe('losing the network', () => {
  it('says why a change failed and becomes read-only when offline', async () => {
    const { store, answers } = await loadedStore();
    store.add(input);
    await settle();
    answers[0]?.reject(new CollectionSourceError('offline'));
    await settle();
    assert.equal(store.getState().saveError, 'offline');
    assert.equal(store.getState().status, 'read-only');
    assert.deepEqual(ids(store.getState().copies), ['saved']);
  });

  it('stays ready when the collection is full', async () => {
    const { store, answers } = await loadedStore();
    store.add(input);
    await settle();
    answers[0]?.reject(new CollectionSourceError('full'));
    await settle();
    assert.equal(store.getState().saveError, 'full');
    assert.equal(store.getState().status, 'ready');
  });

  it('becomes ready again when a new load reaches the source', async () => {
    let online = false;
    const source: CollectionSource = {
      load: async () => ({ copies: [saved], readOnly: !online }),
      apply: async () => {},
    };
    const store = createCollectionStore(source, () => 'id');
    await store.load();
    assert.equal(store.getState().status, 'read-only');

    online = true;
    const statuses: string[] = [];
    store.subscribe(() => statuses.push(store.getState().status));
    await store.load();
    assert.equal(store.getState().status, 'ready');
    assert.deepEqual(statuses, ['ready'], 'the collection on screen does not flash a loader');
  });

  it('keeps the collection on screen when a new load fails', async () => {
    let attempts = 0;
    const source: CollectionSource = {
      load: async () => {
        attempts += 1;
        if (attempts > 1) throw new Error('offline');
        return { copies: [saved], readOnly: true };
      },
      apply: async () => {},
    };
    const store = createCollectionStore(source, () => 'id');
    await store.load();
    await store.load();
    assert.equal(store.getState().status, 'read-only');
    assert.deepEqual(ids(store.getState().copies), ['saved']);
  });

  it('does not load again while changes are being saved', async () => {
    let loads = 0;
    const fake = fakeSource();
    const source: CollectionSource = { ...fake.source, load: async () => (loads++, { copies: [saved], readOnly: false }) };
    const store = createCollectionStore(source, () => 'new');
    await store.load();
    store.add(input);
    await store.load();
    assert.equal(loads, 1);
    assert.deepEqual(ids(store.getState().copies), ['saved', 'new']);
  });
});
