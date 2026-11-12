// The tests write to the database named in MONGODB_TEST_URI. They run only against a database on this computer, so they
// can never touch the real one by mistake.
const uri = process.env.MONGODB_TEST_URI;

/** Whether an address names a single database on this computer. It is parsed, so a user name cannot fool the check. */
function isLocalAddress(value: string | undefined): value is string {
  if (!value?.startsWith('mongodb://')) return false;
  try {
    const { hostname, host } = new URL(value);
    return !host.includes(',') && (hostname === 'localhost' || hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

const isLocal = isLocalAddress(uri);

/** Why the database tests are skipped, or false when they can run. */
export const skipWithoutDatabase = isLocal ? false : 'MONGODB_TEST_URI must name a local MongoDB replica set';

if (isLocal) process.env.MONGODB_URI = uri;

/** Loads the database module only once the address is set, since it reads the address on import. */
export const loadDb = () => import('../src/db.js');
