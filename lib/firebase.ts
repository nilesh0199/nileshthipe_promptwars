import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Statically referenced environment variables (Next.js requires static references)
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

export const firebaseConfigured: boolean = Boolean(
  apiKey && authDomain && projectId && appId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (firebaseConfigured && typeof window !== "undefined") {
  try {
    app = getApps().length > 0
      ? getApp()
      : initializeApp({
          apiKey,
          authDomain,
          projectId,
          appId,
        });
    auth = getAuth(app);
    db = getFirestore(app);
  } catch {
    // Fail gracefully without crashing import
    app = null;
    auth = null;
    db = null;
  }
}

export { app, auth, db };
