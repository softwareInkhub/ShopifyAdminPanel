import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from './logger';

// Initialize Firebase with better error handling
let firestoreDb: any = null;

async function initializeFirebase() {
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

    // Test connection with a simple operation
    await db.collection('test').doc('connection').set({
      timestamp: new Date(),
      status: 'connected'
    });
    logger.server.info(`Firebase connection verified in ${Date.now() - startTime}ms`);

    // Initialize sample data if not exists
    const ordersRef = await db.collection('orders').limit(1).get();
    const productsRef = await db.collection('products').limit(1).get();

    if (ordersRef.empty) {
      await db.collection('orders').add({
        customerEmail: 'test@example.com',
        totalPrice: 99.99,
        status: 'UNFULFILLED',
        createdAt: new Date(),
        currency: 'USD'
      });
      logger.server.info('Added sample order data');
    }

    if (productsRef.empty) {
      await db.collection('products').add({
        title: 'Sample Product',
        description: 'A test product',
        price: 49.99,
        status: 'ACTIVE',
        category: 'Test',
        createdAt: new Date()
      });
      logger.server.info('Added sample product data');
    }

    firestoreDb = db;
    return db;
  } catch (error) {
    logger.server.error(`Firebase initialization failed after ${Date.now() - startTime}ms`);
    logger.server.error(error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Initialize database connection
const dbPromise = initializeFirebase().catch(error => {
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