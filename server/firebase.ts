import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase with better error handling
function initializeFirebase() {
  // Parse and validate service account
  let serviceAccount;
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    // Validate required fields
    const requiredFields = ['project_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields in service account: ${missingFields.join(', ')}`);
    }

    console.log('Firebase service account validated successfully');
  } catch (error) {
    console.error('Failed to parse or validate FIREBASE_SERVICE_ACCOUNT:', error);
    throw error;
  }

  // Initialize Firebase Admin
  try {
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }

  // Initialize Firestore with settings
  const db = getFirestore();
  try {
    db.settings({
      ignoreUndefinedProperties: true,
      cacheSizeBytes: 1073741824 // 1GB cache size
    });
    console.log('Firestore settings configured successfully');
    return db;
  } catch (error) {
    console.error('Failed to configure Firestore settings:', error);
    throw error;
  }
}

// Initialize database connection
const db = initializeFirebase();

// Create composite indexes for better query performance
async function createIndexes() {
  try {
    // Products collection indexes
    const productsIndexRef = db.collection('products').doc('collection_indexes');
    await productsIndexRef.set({
      status_price: {
        fields: ['status', 'price'],
        queryScope: 'COLLECTION'
      },
      category_createdAt: {
        fields: ['category', 'createdAt'],
        queryScope: 'COLLECTION'
      }
    }, { merge: true });

    // Orders collection indexes
    const ordersIndexRef = db.collection('orders').doc('collection_indexes');
    await ordersIndexRef.set({
      status_date: {
        fields: ['status', 'createdAt'],
        queryScope: 'COLLECTION'
      },
      customerEmail_date: {
        fields: ['customerEmail', 'createdAt'],
        queryScope: 'COLLECTION'
      }
    }, { merge: true });

    console.log('Firebase indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
    // Don't throw here - indexes are important but not critical for operation
  }
}

// Initialize indexes
createIndexes().catch(console.error);

export { db };