import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is not set');

/** Shared by the requests of a running function. It connects on first use, so a cold start stays quick. */
export const mongoClient = new MongoClient(uri);

export const db = mongoClient.db('holo');
