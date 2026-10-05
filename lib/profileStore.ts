import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { updateProfile as firebaseUpdateProfile, type User } from "firebase/auth";
import { db, auth } from "./firebase";
import {
  buildProfileDoc,
  resolveDisplayName,
  type ProfileDoc,
  type ProfileInput,
} from "./profile";

function getFirestoreDb() {
  if (!db) {
    throw new Error("Firestore is not configured or unavailable.");
  }
  return db;
}

/**
 * Fetches the user's profile document from Firestore.
 */
export async function getProfile(uid: string): Promise<ProfileDoc | null> {
  const firestore = getFirestoreDb();
  const docRef = doc(firestore, "profiles", uid);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    return null;
  }

  const data = snap.data();
  return {
    displayName: data.displayName || "",
    age: typeof data.age === "number" ? data.age : null,
    profession: typeof data.profession === "string" ? data.profession : null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Saves profile data to Firestore with merge.
 * Sets `createdAt` only on initial creation and `updatedAt` on every save.
 * Also synchronizes `auth.currentUser.displayName` if the current user matches `uid`.
 */
export async function saveProfile(
  uid: string,
  values: ProfileInput
): Promise<void> {
  const firestore = getFirestoreDb();
  const docRef = doc(firestore, "profiles", uid);
  const cleanDoc = buildProfileDoc(values);

  const snap = await getDoc(docRef);
  const isNew = !snap.exists();

  const dataToSave: Record<string, unknown> = {
    displayName: cleanDoc.displayName,
    age: cleanDoc.age,
    profession: cleanDoc.profession,
    updatedAt: serverTimestamp(),
  };

  if (isNew) {
    dataToSave.createdAt = serverTimestamp();
  }

  await setDoc(docRef, dataToSave, { merge: true });

  // Synchronize auth user displayName so the Header updates immediately
  if (auth && auth.currentUser && auth.currentUser.uid === uid && cleanDoc.displayName) {
    try {
      await firebaseUpdateProfile(auth.currentUser, {
        displayName: cleanDoc.displayName,
      });
    } catch {
      // Non-fatal if auth profile sync fails
    }
  }
}

/**
 * Creates a default profile on first sign-in if no profile document exists yet.
 */
export async function ensureProfile(user: User): Promise<void> {
  if (!user || !user.uid) return;
  try {
    const existing = await getProfile(user.uid);
    if (!existing) {
      const fallbackName = resolveDisplayName({
        authName: user.displayName,
        email: user.email,
      });
      await saveProfile(user.uid, {
        displayName: fallbackName,
      });
    }
  } catch {
    // Graceful fallback: profile creation shouldn't block login
  }
}
