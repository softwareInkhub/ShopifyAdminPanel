import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from './logger';

// Initialize Firebase with better error handling
let firestoreDb: any = null;

async function initializeFirestore() {
  try {
    const startTime = Date.now();
    logger.server.info('Starting Firebase initialization...');

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }

    // Parse and validate service account
    const serviceAccount: ServiceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    logger.server.info(`Service account parsed in ${Date.now() - startTime}ms`);

    // Initialize Firebase Admin
    const app = initializeApp({
      credential: cert(serviceAccount)
    });
    logger.server.info(`Firebase Admin initialized in ${Date.now() - startTime}ms`);

    // Initialize Firestore
    const db = getFirestore(app);
    logger.server.info(`Firestore instance created in ${Date.now() - startTime}ms`);

    // Verify collection access
    try {
      const ordersRef = db.collection('orders');
      const testQuery = await ordersRef.limit(1).get();
      logger.server.info(`Orders collection access verified: ${testQuery.size} documents found`);
    } catch (error) {
      logger.server.error('Failed to access orders collection:', error);
      throw new Error('Failed to access orders collection');
    }

    firestoreDb = db;
    return db;
  } catch (error) {
    logger.server.error('Firebase initialization failed');
    logger.server.error(error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Initialize database connection
const dbPromise = initializeFirestore().catch(error => {
  logger.server.error('Critical: Failed to initialize Firebase');
  process.exit(1);
});

// Export functions to safely access the database
export async function getDb() {
  if (firestoreDb) return firestoreDb;
  return await dbPromise;
}

// Export collection accessor function
export const db = {
  collection: async (name: string) => {
    const database = await getDb();
    return database.collection(name);
  }
};