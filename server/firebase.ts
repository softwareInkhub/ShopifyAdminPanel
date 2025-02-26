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

    // Test connection
    await db.collection('test').doc('connection').set({
      timestamp: new Date(),
      status: 'connected'
    });
    logger.server.info(`Firebase connection verified in ${Date.now() - startTime}ms`);

    // Initialize sample data if not exists
    const ordersRef = db.collection('orders');
    const productsRef = db.collection('products');

    // Check if collections are empty
    const [ordersSnapshot, productsSnapshot] = await Promise.all([
      ordersRef.limit(1).get(),
      productsRef.limit(1).get()
    ]);

    // Add sample orders if empty
    if (ordersSnapshot.empty) {
      const sampleOrders = Array.from({ length: 50 }, (_, i) => ({
        customerEmail: `customer${i + 1}@example.com`,
        customerName: `Customer ${i + 1}`,
        totalPrice: Math.round(Math.random() * 1000 * 100) / 100,
        tax: Math.round(Math.random() * 100 * 100) / 100,
        status: ['UNFULFILLED', 'FULFILLED', 'CANCELLED'][Math.floor(Math.random() * 3)],
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        currency: 'USD',
        items: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => ({
          title: `Product ${j + 1}`,
          quantity: Math.floor(Math.random() * 5) + 1,
          price: Math.round(Math.random() * 200 * 100) / 100
        })),
        notes: Math.random() > 0.5 ? `Sample order notes for order ${i + 1}` : undefined,
        shippingAddress: {
          street: `${i + 100} Main St`,
          city: 'Sample City',
          state: 'ST',
          zip: '12345'
        },
        billingAddress: {
          street: `${i + 100} Main St`,
          city: 'Sample City',
          state: 'ST',
          zip: '12345'
        },
        paymentMethod: 'Credit Card',
        fulfillmentStatus: 'Pending',
        tags: ['sample', `tag-${i}`],
        metadata: {
          source: 'sample_data',
          version: '1.0'
        }
      }));

      for (const order of sampleOrders) {
        await ordersRef.add(order);
      }
      logger.server.info('Added sample order data');
    }

    // Add sample products if empty
    if (productsSnapshot.empty) {
      const sampleProducts = Array.from({ length: 30 }, (_, i) => ({
        title: `Sample Product ${i + 1}`,
        description: `A test product with ID ${i + 1}`,
        price: Math.round(Math.random() * 500 * 100) / 100,
        status: ['ACTIVE', 'DRAFT', 'ARCHIVED'][Math.floor(Math.random() * 3)],
        category: ['Electronics', 'Clothing', 'Books', 'Home'][Math.floor(Math.random() * 4)],
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      }));

      for (const product of sampleProducts) {
        await productsRef.add(product);
      }
      logger.server.info('Added sample product data');
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