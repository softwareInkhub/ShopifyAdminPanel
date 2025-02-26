import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from './logger';

// Initialize Firebase with better error handling
async function initializeFirebase() {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }

    // Parse and validate service account
    const serviceAccount: ServiceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    // Validate required fields
    const requiredFields = ['project_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field as keyof ServiceAccount]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields in service account: ${missingFields.join(', ')}`);
    }

    logger.server.info('Firebase service account validated successfully');

    // Initialize Firebase Admin
    initializeApp({
      credential: cert(serviceAccount)
    });
    logger.server.info('Firebase Admin initialized successfully');

    // Initialize Firestore with settings
    const db = getFirestore();
    db.settings({
      ignoreUndefinedProperties: true,
      timestampsInSnapshots: true
    });

    // Verify connection by attempting to access collections
    const [ordersRef, productsRef] = await Promise.all([
      db.collection('orders').limit(1).get(),
      db.collection('products').limit(1).get()
    ]);

    logger.server.info(`Firebase collections verified - Orders: ${ordersRef.size}, Products: ${productsRef.size}`);

    // Initialize sample data if collections are empty
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

    return db;
  } catch (error) {
    logger.server.error('Failed to initialize Firebase');
    throw error;
  }
}

// Initialize database connection
const db = initializeFirebase();

export { db };