import { openDB, IDBPDatabase } from 'idb';

interface CacheDB {
  orders: {
    key: string;
    value: any;
    expiry: number;
  };
}

const DB_NAME = 'shopify-admin-db';
const STORE_NAME = 'orders';
const DB_VERSION = 1;

export async function initDB() {
  return openDB<CacheDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

let dbPromise: Promise<IDBPDatabase<CacheDB>>;

export function useIndexedDB() {
  const getDB = () => {
    if (!dbPromise) {
      dbPromise = initDB();
    }
    return dbPromise;
  };

  const set = async (key: string, value: any, ttl = 30 * 60 * 1000) => {
    const db = await getDB();
    const expiry = Date.now() + ttl;
    await db.put(STORE_NAME, { value, expiry }, key);
  };

  const get = async (key: string) => {
    const db = await getDB();
    const data = await db.get(STORE_NAME, key);
    if (!data) return null;
    if (data.expiry < Date.now()) {
      await db.delete(STORE_NAME, key);
      return null;
    }
    return data.value;
  };

  const clear = async () => {
    const db = await getDB();
    await db.clear(STORE_NAME);
  };

  return { set, get, clear };
}
