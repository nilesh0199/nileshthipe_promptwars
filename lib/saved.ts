import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  limit,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  buildAnalysisDoc,
  sanitizeForFirestore,
  type BuildAnalysisDocParams,
  type AnalysisDoc,
} from "./savedDoc";

export interface SavedAnalysisRecord extends AnalysisDoc {
  id: string;
  createdAt: Timestamp | { toMillis: () => number } | null;
  updatedAt: Timestamp | { toMillis: () => number } | null;
}

export interface UpdateAnalysisParams {
  triage?: Record<string, string>;
  notes?: string;
  certaintyAfter?: number | null;
}

function getFirestoreDb() {
  if (!db) {
    throw new Error("Firestore is not configured or unavailable.");
  }
  return db;
}

/**
 * Saves a new analysis document to the "analyses" Firestore collection.
 * Purely client-side write protected by owner-only security rules.
 */
export async function saveAnalysis(
  uid: string,
  payload: BuildAnalysisDocParams
): Promise<string> {
  const firestore = getFirestoreDb();
  const baseDoc = buildAnalysisDoc(uid, payload);

  const docToSave = {
    ...baseDoc,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(firestore, "analyses"), docToSave);
  return docRef.id;
}

/**
 * Updates mutable fields (triage, personal notes, post-reflection certainty) on an existing analysis.
 */
export async function updateAnalysis(
  id: string,
  updates: UpdateAnalysisParams
): Promise<void> {
  const firestore = getFirestoreDb();
  const docRef = doc(firestore, "analyses", id);

  const cleanedUpdates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.triage !== undefined) {
    cleanedUpdates.triage = sanitizeForFirestore(updates.triage);
  }
  if (updates.notes !== undefined) {
    cleanedUpdates.notes = updates.notes;
  }
  if (updates.certaintyAfter !== undefined) {
    cleanedUpdates.certaintyAfter =
      updates.certaintyAfter === null ? null : updates.certaintyAfter;
  }

  await updateDoc(docRef, cleanedUpdates);
}

/**
 * Extracts a numeric timestamp from varied Firestore timestamp representations.
 */
function extractMillis(ts: unknown): number {
  if (!ts) return 0;
  if (typeof ts === "object" && ts !== null && "toMillis" in ts && typeof (ts as { toMillis: () => number }).toMillis === "function") {
    return (ts as { toMillis: () => number }).toMillis();
  }
  if (typeof ts === "object" && ts !== null && "seconds" in ts && typeof (ts as { seconds: number }).seconds === "number") {
    return (ts as { seconds: number }).seconds * 1000;
  }
  if (ts instanceof Date) {
    return ts.getTime();
  }
  if (typeof ts === "number") {
    return ts;
  }
  return 0;
}

/**
 * Lists analyses belonging to the given user ID.
 * Queries with where("uid", "==", uid) and limit(100), and sorts by createdAt descending IN CLIENT CODE
 * to avoid needing a composite Firestore index.
 */
export async function listAnalyses(uid: string): Promise<SavedAnalysisRecord[]> {
  const firestore = getFirestoreDb();
  const analysesRef = collection(firestore, "analyses");
  const q = query(analysesRef, where("uid", "==", uid), limit(100));

  const querySnapshot = await getDocs(q);
  const results: SavedAnalysisRecord[] = [];

  querySnapshot.forEach((documentSnap) => {
    const data = documentSnap.data() as Omit<SavedAnalysisRecord, "id">;
    results.push({
      ...data,
      id: documentSnap.id,
    });
  });

  // Client-side sort descending by createdAt
  results.sort((a, b) => extractMillis(b.createdAt) - extractMillis(a.createdAt));

  return results;
}

/**
 * Fetches a single analysis document by ID.
 */
export async function getAnalysis(id: string): Promise<SavedAnalysisRecord | null> {
  const firestore = getFirestoreDb();
  const docRef = doc(firestore, "analyses", id);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    return null;
  }

  const data = snap.data() as Omit<SavedAnalysisRecord, "id">;
  return {
    ...data,
    id: snap.id,
  };
}

/**
 * Deletes a single analysis document by ID.
 */
export async function deleteAnalysis(id: string): Promise<void> {
  const firestore = getFirestoreDb();
  const docRef = doc(firestore, "analyses", id);
  await deleteDoc(docRef);
}

/**
 * Batched deletion of all saved analyses belonging to a specific user.
 */
export async function deleteAllAnalyses(uid: string): Promise<void> {
  const firestore = getFirestoreDb();
  const analysesRef = collection(firestore, "analyses");
  const q = query(analysesRef, where("uid", "==", uid), limit(500));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return;
  }

  const batch = writeBatch(firestore);
  querySnapshot.forEach((documentSnap) => {
    batch.delete(documentSnap.ref);
  });

  await batch.commit();
}
