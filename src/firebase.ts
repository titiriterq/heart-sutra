import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Log configuration for debugging (excluding API key)
console.log("Firebase Config:", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  databaseId: firebaseConfig.firestoreDatabaseId
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with the provided database ID if it exists
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Test connection
async function testConnection() {
  try {
    // Try to get a document to verify connection and permissions
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test successful.");
  } catch (error) {
    if (error instanceof Error) {
      console.error("Firestore connection test failed:", error.message);
      if (error.message.includes('the client is offline')) {
        console.error("Please check your network connection or Firebase configuration.");
      }
      if (error.message.includes('Missing or insufficient permissions')) {
        console.error("Security rules are still blocking access. Please ensure rules are deployed to the correct database.");
      }
    }
  }
}
testConnection();
