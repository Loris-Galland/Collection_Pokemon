import { serverRequest } from '@/features/account/server-request';

/** Calls the wishes route with the session of the signed in account. */
export const requestWishes = serverRequest('/api/wishes');
