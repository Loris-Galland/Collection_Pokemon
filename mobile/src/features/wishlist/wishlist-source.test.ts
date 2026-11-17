/// <reference types="node" />
import { MAX_WISHES_PER_IMPORT, type Wish, type WishlistChange, type Wishes } from '@collection/shared';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { QueuedChange, ServerRequest, Stored } from '../../lib/change-queue.ts';
import { createLocalWishlistSource, createServerWishlistSource } from './wishlist-source.ts';

const list = { id: 'list-a', name: 'Feu', createdAt: '2026-11-17T10:00:00.000Z' };
const wish = (index: number): Wish => ({
  cardId: `sv01-${index}`,
  setId: 'sv01',
  wishlistId: 'list-a',
  addedAt: `2026-11-17T10:00:${String(index % 60).padStart(2, '0')}.000Z`,
});

function memory<T>(initial?: T): Stored<T> & { value: T | undefined } {
  const stored = {
    value: initial,
    read: async () => stored.value,
    write: async (value: T) => void (stored.value = structuredClone(value)),
    remove: async () => void (stored.value = undefined),
  };
  return stored;
}

/** A server that applies nothing and answers in turn, then with success. `null` stands for no network. */
function fakeServer(answers: (Response | null)[] = [], wishes: Wishes = { wishlists: [list], wishes: [] }) {
  const sent: QueuedChange<WishlistChange>[] = [];
  let online = true;
  const request: ServerRequest = async (call) => {
    if (call.method === 'POST') sent.push(call.body as QueuedChange<WishlistChange>);
    if (!online) throw new TypeError('Network request failed');
    const answer = answers.shift();
    if (answer === null) throw new TypeError('Network request failed');
    if (answer) return answer;
    return call.method === 'GET' ? Response.json(wishes) : new Response(null, { status: 204 });
  };
  return { request, sent, answers, setOnline: (value: boolean) => void (online = value) };
}

function sourceWith(server: ReturnType<typeof fakeServer>, local?: Wishes) {
  const cache = memory<Wishes>();
  const saved = memory<Wishes>(local);
  const outbox = memory<readonly QueuedChange<WishlistChange>[]>();
  let next = 0;
  const source = createServerWishlistSource({
    request: server.request,
    cache,
    local: saved,
    outbox,
    newChangeId: () => `change-${++next}`,
  });
  return { source, cache, saved, outbox };
}

const addWish: WishlistChange = { type: 'add-wish', wish: wish(1) };

describe('wishes of a visitor', () => {
  it('keeps each change on the phone', async () => {
    const stored = memory<Wishes>();
    const source = createLocalWishlistSource(stored);
    await source.load();
    await source.apply({ type: 'create-list', wishlist: list });
    await source.apply(addWish);
    assert.equal(stored.value?.wishes.length, 1);
  });
});

describe('wishes of an account', () => {
  it('shows the wishes of the server', async () => {
    const { source } = sourceWith(fakeServer([], { wishlists: [list], wishes: [wish(1)] }));
    assert.equal((await source.load()).wishes.length, 1);
  });

  it('sends the wishes saved on the phone once, in batches, with the lists first', async () => {
    const saved: Wishes = {
      wishlists: [list],
      wishes: Array.from({ length: MAX_WISHES_PER_IMPORT + 3 }, (_, index) => wish(index)),
    };
    const server = fakeServer();
    const { source, saved: local } = sourceWith(server, saved);
    await source.load();
    assert.equal(server.sent.length, 2);
    const [first, second] = server.sent.map((entry) => entry.change);
    assert.equal(first?.type === 'import' && first.wishlists.length, 1);
    assert.equal(second?.type === 'import' && second.wishlists.length, 0);
    assert.equal(second?.type === 'import' && second.wishes.length, 3);
    assert.equal(local.value, undefined);
  });

  it('keeps changes made offline and sends them when the network is back', async () => {
    const server = fakeServer();
    const { source, cache } = sourceWith(server);
    await source.load();
    server.setOnline(false);
    await source.apply(addWish);
    assert.deepEqual(await source.sync(), { unsentCount: 1, refused: undefined });
    assert.equal(cache.value?.wishes.length, 1);

    server.setOnline(true);
    assert.deepEqual(await source.sync(), { unsentCount: 0, refused: undefined });
    assert.deepEqual(server.sent.at(-1), { changeId: 'change-1', change: addWish });
  });

  it('says why the server refused a change', async () => {
    const server = fakeServer();
    const { source } = sourceWith(server);
    await source.load();
    server.answers.push(Response.json({ error: 'too_many_wishes' }, { status: 409 }));
    await source.apply(addWish);
    assert.deepEqual(await source.sync(), { unsentCount: 0, refused: 'too-many-wishes' });
  });
});
