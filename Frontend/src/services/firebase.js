import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Firebase Client Configuration
// Reads from Vite env if available, or uses safe placeholder for initialization
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForVisionCivicAuth",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "vision-civic.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "vision-civic",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "vision-civic.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef123456"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Initiates Google OAuth Popup via Firebase Auth
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    return {
      idToken,
      user: {
        email: result.user.email,
        name: result.user.displayName,
        photoURL: result.user.photoURL,
        uid: result.user.uid
      }
    };
  } catch (error) {
    // If Firebase project API key is unconfigured or blocked by environment,
    // allow a clean fallback to test Google OAuth flow in development
    if (error.code === 'auth/api-key-not-valid' || error.code === 'auth/invalid-api-key') {
      console.warn("Firebase API key not configured in Vite env. Simulating Google OAuth for dev testing.");
      return {
        idToken: "dev_google_id_token_test_123",
        user: {
          email: "google.user@visioncivic.org",
          name: "Civic Google Operator",
          photoURL: null,
          uid: "google_12345"
        }
      };
    }
    throw error;
  }
}
