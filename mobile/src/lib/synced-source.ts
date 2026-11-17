// Where some data of the account lives: on the phone for a visitor, on our server for an account. The collection and the
// wishes are both kept this way, and only their shape and their changes differ.

import { createChangeQueue, type QueuedChange, type ServerRequest, type Stored } from './change-queue.ts';

/** What is left after the source tried to send the changes made offline. */
export interface SyncReport<F extends string> {
  /** Changes kept on the phone that the server does not have yet. */
  unsentCount: number;
  /** Why the server refused one of them, if it did. A refused change is dropped, except when the session has ended. */
  refused?: F;
}

/** Where the data is kept. `load` and `apply` reject when the source could not do the work. */
export interface SyncedSource<S, C, F extends string> {
  load(): Promise<S>;
  /** Keeps a change. A source with a server only queues it, and `sync` sends it. */
  apply(change: C): Promise<void>;
  sync(): Promise<SyncReport<F>>;
}

/** Applies a change to the data, the way the server does. */
export type ApplyChange<S, C> = (state: S, change: C) => S;

/** Data that lives on the phone only, for a visitor. It has nothing to send. */
export function createLocalSource<S, C>(
  stored: Stored<S>,
  empty: S,
  applyChange: ApplyChange<S, C>,
): SyncedSource<S, C, never> {
  let current = empty;
  return {
    async load() {
      current = (await stored.read()) ?? empty;
      return current;
    },
    async apply(change) {
      const next = applyChange(current, change);
      await stored.write(next);
      current = next;
    },
    sync: async () => ({ unsentCount: 0 }),
  };
}

/** A batch of data saved on the phone before it moved to the server, and what is left once the batch has arrived. */
export interface UploadBatch<S, C> extends QueuedChange<C> {
  rest: S | undefined;
}

export interface ServerSourceOptions<S, C, R extends string> {
  request: ServerRequest;
  /** The data as last shown, changes not yet sent included. It is shown when the server cannot be reached. */
  cache: Stored<S>;
  /** What the account saved on this phone before its data moved to the server. It is sent once. */
  local: Stored<S>;
  /** The changes made while the server could not be reached. */
  outbox: Stored<readonly QueuedChange<C>[]>;
  newChangeId: () => string;
  applyChange: ApplyChange<S, C>;
  /** Reads the data in the answer of the server, or undefined when it is not in the expected shape. */
  readBody: (body: unknown) => S | undefined;
  /** Why the server refused a change, read from its answer. */
  refusalOf: (response: Response) => Promise<R>;
  /**
   * Splits the data saved on the phone into changes the server accepts. Each batch keeps the same change id however
   * often it is sent, so the server never counts it twice.
   */
  uploadBatches: (saved: S) => UploadBatch<S, C>[];
}

const warn = (what: string) => (error: unknown) => console.warn(`Could not ${what}`, error);

/**
 * Data of a signed in account, kept on our server. A change is first kept on the phone with its own id, then sent.
 * Without a network it waits there and leaves when the server can be reached again. The server applies an id only once,
 * so sending a change again is harmless.
 */
export function createServerSource<S, C, R extends string>(
  options: ServerSourceOptions<S, C, R>,
): SyncedSource<S, C, R | 'signed-out'> {
  const { request, cache, local, outbox, newChangeId, applyChange, readBody, refusalOf, uploadBatches } = options;
  let current: S | undefined;

  const queue = createChangeQueue<C, R>({
    outbox,
    request,
    refusalOf,
    // The old data goes first, since a queued change may be about it. A refused batch is dropped, since sending it
    // again would be refused again, and the reason is given like any refusal.
    before: async (send) => {
      const saved = await local.read();
      if (saved === undefined) return true;
      for (const batch of uploadBatches(saved)) {
        const result = await send(batch);
        if (result === 'unreachable' || result === 'signed-out') return false;
        if (result !== 'sent') queue.noteRefusal(result);
        await (batch.rest === undefined ? local.remove() : local.write(batch.rest));
      }
      await local.remove();
      return true;
    },
  });

  async function readServer(): Promise<S> {
    const response = await request({ method: 'GET' });
    if (!response.ok) throw new Error(`The server answered ${response.status}`);
    const data = readBody(await response.json());
    if (data === undefined) throw new Error('The server answered in an unknown format');
    return data;
  }

  const keep = (data: S) => cache.write(data).catch(warn('keep the data for offline use'));

  return {
    async load() {
      await queue.load();
      await queue.drain();
      try {
        // What the server has, plus what it does not have yet.
        const server = await readServer();
        const fresh = queue.entries().reduce<S>((data, entry) => applyChange(data, entry.change), server);
        current = fresh;
        keep(fresh);
        return fresh;
      } catch (error) {
        const known = (await cache.read()) ?? (await local.read());
        if (known === undefined) throw error;
        current = known;
        return known;
      }
    },
    async apply(change) {
      if (current === undefined) throw new Error('The source must be loaded before it is changed');
      // Without the queue the change would be lost when the app closes, so it is not accepted at all.
      await queue.add({ changeId: newChangeId(), change });
      const next = applyChange(current, change);
      current = next;
      keep(next);
    },
    async sync() {
      await queue.drain();
      return { unsentCount: queue.entries().length, refused: queue.takeRefusal() };
    },
  };
}
