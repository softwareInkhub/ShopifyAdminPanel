import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from './logger';

// Initialize Firebase with better error handling
function initializeFirebase() {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }

    // Parse and validate service account
    const serviceAccount: ServiceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    // Validate required fields
    const requiredFields = ['project_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);

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

    logger.server.info('Firestore settings configured successfully');
    return db;
  } catch (error) {
    logger.server.error('Failed to initialize Firebase');
    throw error;
  }
}

// Initialize database connection
const db = initializeFirebase();

export { db };