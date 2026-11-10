/// <reference types="node" />
import { MAX_ENTRIES_PER_CHANGE, type CollectionChange, type Copy } from '@collection/shared';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CollectionSourceError } from './collection-source.ts';
import {
  RETRY_DELAYS_MS,
  createServerCollectionSource,
  type CollectionRequest,
  type StoredCopies,
} from './server-collection-source.ts';

const copy = (index: number): Copy => ({
  id: `copy-${String(index).padStart(4, '0')}`,
  cardId: `sv03.5-${index}`,
  setId: 'sv03.5',
  variant: 'normal',
  language: 'fr',
  condition: 'near-mint',
  quantity: 1,
});

function memory(initial?: Copy[]): StoredCopies & { value: Copy[] | undefined } {
  const stored = {
    value: initial,
    read: async () => stored.value,
    write: async (copies: readonly Copy[]) => void (stored.value = [...copies]),
    remove: async () => void (stored.value = undefined),
  };
  return stored;
}

interface Sent {
  changeId: string;
  change: CollectionChange;
}

/** A server that answers with the given responses in turn, then with success. `null` stands for no network. */
function fakeServer(answers: (Response | null)[] = [], copies: Copy[] = []) {
  const sent: Sent[] = [];
  const request: CollectionRequest = async (call) => {
    if (call.method === 'POST') sent.push(call.body as Sent);
    const answer = answers.shift();
    if (answer === null) throw new TypeError('Network request failed');
    if (answer) return answer;
    return call.method === 'GET' ? Response.json({ copies }) : new Response(null, { status: 204 });
  };
  return { request, sent };
}

const refusal = (status: number, error?: string) => Response.json({ error }, { status });

function sourceWith(server: ReturnType<typeof fakeServer>, options: { cache?: Copy[]; local?: Copy[] } = {}) {
  const cache = memory(options.cache);
  const local = memory(options.local);
  const waits: number[] = [];
  let nextId = 0;
  const source = createServerCollectionSource({
    request: server.request,
    cache,
    local,
    newChangeId: () => `change-${++nextId}`,
    wait: async (ms) => void waits.push(ms),
  });
  return { source, cache, local, waits };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('loading from the server', () => {
  it('shows the collection of the server and keeps it for offline use', async () => {
    const { source, cache } = sourceWith(fakeServer([], [copy(1)]));
    assert.deepEqual(await source.load(), { copies: [copy(1)], readOnly: false });
    await settle();
    assert.deepEqual(cache.value, [copy(1)]);
  });

  it('shows the last known collection read-only when offline', async () => {
    const { source } = sourceWith(fakeServer([null]), { cache: [copy(1)] });
    assert.deepEqual(await source.load(), { copies: [copy(1)], readOnly: true });
  });

  it('shows the copies saved on the phone read-only when offline and nothing was read before', async () => {
    const { source } = sourceWith(fakeServer([null, null, null, null]), { local: [copy(2)] });
    assert.deepEqual(await source.load(), { copies: [copy(2)], readOnly: true });
  });

  it('fails when offline with nothing to show', async () => {
    const { source } = sourceWith(fakeServer([null]));
    await assert.rejects(source.load(), CollectionSourceError);
  });
});

describe('sending the collection saved on the phone', () => {
  it('sends it once in batches the server accepts, then forgets it', async () => {
    const saved = Array.from({ length: MAX_ENTRIES_PER_CHANGE + 2 }, (_, index) => copy(index));
    const server = fakeServer();
    const { source, local } = sourceWith(server, { local: saved });
    await source.load();

    assert.deepEqual(
      server.sent.map((sent) => sent.changeId),
      ['upload-copy-0000', `upload-copy-0${MAX_ENTRIES_PER_CHANGE}`],
    );
    const [first] = server.sent;
    assert.equal(first?.change.type === 'add-many' && first.change.entries.length, MAX_ENTRIES_PER_CHANGE);
    const { id, ...input } = copy(0);
    assert.deepEqual(first?.change.type === 'add-many' && first.change.entries[0], { id, input });
    assert.equal(local.value, undefined);
  });

  it('keeps what did not arrive, and sends it again later with the same change id', async () => {
    const saved = Array.from({ length: MAX_ENTRIES_PER_CHANGE + 2 }, (_, index) => copy(index));
    // The second batch never gets an answer, three times in a row.
    const server = fakeServer([undefined as never, null, null, null]);
    const { source, local } = sourceWith(server, { local: saved });
    await source.load();
    assert.equal(local.value?.length, 2, 'the first batch has left the phone');

    await source.load();
    const ids = server.sent.map((sent) => sent.changeId);
    assert.equal(ids.at(-1), ids.at(-2), 'the batch keeps its change id');
    assert.equal(local.value, undefined);
  });
});

describe('saving a change', () => {
  const change: CollectionChange = { type: 'remove', copyId: 'copy-0001' };

  it('sends the change with a change id and updates the offline copy', async () => {
    const server = fakeServer([], [copy(1)]);
    const { source, cache } = sourceWith(server);
    await source.load();
    await source.apply(change);
    await settle();
    assert.deepEqual(server.sent, [{ changeId: 'change-1', change }]);
    assert.deepEqual(cache.value, []);
  });

  it('tries again with the same change id while the server cannot be reached', async () => {
    const server = fakeServer([null, null]);
    const { source, waits } = sourceWith(server);
    await source.apply(change);
    assert.deepEqual(
      server.sent.map((sent) => sent.changeId),
      ['change-1', 'change-1', 'change-1'],
    );
    assert.deepEqual(waits, RETRY_DELAYS_MS);
  });

  it('gives up as offline after the last try', async () => {
    const { source } = sourceWith(fakeServer([null, null, null]));
    await assert.rejects(source.apply(change), { reason: 'offline' });
  });

  it('tries again when the server fails', async () => {
    const server = fakeServer([refusal(500)]);
    const { source } = sourceWith(server);
    await source.apply(change);
    assert.equal(server.sent.length, 2);
  });

  it('never tries a refused change again, and says why it was refused', async () => {
    const cases: [Response, string][] = [
      [refusal(409, 'collection_full'), 'full'],
      [refusal(401, 'unauthorized'), 'signed-out'],
      [refusal(409, 'id_taken'), 'other'],
      [refusal(400, 'invalid_change'), 'other'],
      [refusal(429, 'too_many_requests'), 'other'],
    ];
    for (const [response, reason] of cases) {
      const server = fakeServer([response]);
      const { source } = sourceWith(server);
      await assert.rejects(source.apply(change), { reason });
      assert.equal(server.sent.length, 1, reason);
    }
  });
});
