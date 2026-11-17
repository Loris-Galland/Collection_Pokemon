import { serverRequest } from '@/features/account/server-request';

/** Calls the collection route with the session of the signed in account. */
export const requestCollection = serverRequest('/api/collection');
