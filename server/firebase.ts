import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Parse the service account JSON from environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);

// Initialize Firebase Admin with service account
initializeApp({
  credential: cert(serviceAccount)
});

export const db = getFirestore();