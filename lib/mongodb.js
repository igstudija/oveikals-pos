import { MongoClient } from 'mongodb';

const dbName = process.env.MONGODB_DB || 'oveikals_pos';

// Lazily create the client so importing this module never throws at build time
// (only when a request actually needs the database at runtime).
function getClientPromise() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  if (!global._mongoClientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI);
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

export async function getDb() {
  const c = await getClientPromise();
  return c.db(dbName);
}

export async function getCollections() {
  const db = await getDb();
  return {
    slides: db.collection('slides'),
    images: db.collection('images'),
    settings: db.collection('settings'),
  };
}
