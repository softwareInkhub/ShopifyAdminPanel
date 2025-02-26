import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Parse the service account JSON from environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);

// Initialize Firebase Admin with service account and performance options
initializeApp({
  credential: cert(serviceAccount),
  ignoreUndefinedProperties: true, // Improves write performance
});

const db = getFirestore();

// Configure Firestore settings for better performance
db.settings({
  ignoreUndefinedProperties: true,
  cacheSizeBytes: 1073741824 // 1GB cache size
});

// Create composite indexes for better query performance
async function createIndexes() {
  try {
    // Products collection indexes
    await db.collection('products').doc('__indexes__').set({
      status_price: {
        fields: ['status', 'price'],
        queryScope: 'COLLECTION'
      },
      category_createdAt: {
        fields: ['category', 'createdAt'],
        queryScope: 'COLLECTION'
      }
    });

    // Orders collection indexes
    await db.collection('orders').doc('__indexes__').set({
      status_date: {
        fields: ['status', 'createdAt'],
        queryScope: 'COLLECTION'
      },
      customerEmail_date: {
        fields: ['customerEmail', 'createdAt'],
        queryScope: 'COLLECTION'
      }
    });

    console.log('Firebase indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

// Initialize indexes
createIndexes();

export { db };