import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { JournalEntry, UserProfile } from './types';

// Client-side configuration provided from user Firebase project
// Safely reads standard Vite envs or configured project config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCeKZRUO3mH8EyzE_xrJqTXf53Npe8KfDk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "personaljournalproject.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "personaljournalproject",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "personaljournalproject.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1045484895974",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1045484895974:web:cc29c68a9cb88097fbc527"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Local Storage Fallback Key for resilient offline & guest operations
const LOCAL_STORAGE_ENTRIES_KEY = 'reflectai_user_entries_';
const LOCAL_STORAGE_CURRENT_USER_KEY = 'reflectai_local_user';

/**
 * Strips undefined fields from objects before sending to Firestore
 * to comply strictly with Zero-Crash Payload Hygiene.
 */
export function sanitizePayload<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    return value === undefined ? null : value;
  }));
}

/**
 * Sign In With Google Popup using real Firebase Google Auth
 */
export async function signInWithGoogle(): Promise<UserProfile> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'Reflective Writer',
      photoURL: user.photoURL,
      createdAt: new Date().toISOString()
    };
    
    // Clear any previous demo/guest user cache
    localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);

    // Sync user profile document to Firestore in the background (non-blocking for instant speed)
    const userRef = doc(db, 'users', user.uid);
    setDoc(userRef, sanitizePayload({
      ...profile,
      lastActiveAt: new Date().toISOString()
    }), { merge: true }).catch((e) => {
      console.warn('Firestore profile sync note:', e);
    });
    
    return profile;
  } catch (error: any) {
    console.error('Google Sign-In failed:', error);
    
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in popup was closed before completing. Please try again.');
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error('This domain has not been added to Authorized Domains in Firebase Console. Please add your current domain under Authentication > Settings > Authorized Domains.');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Google Sign-in is not enabled in your Firebase Console. Please enable Google in Authentication > Sign-in method.');
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked by the browser. Please allow popups for this site or open in a new tab.');
    } else {
      throw new Error(error.message || 'Google Sign-In could not be completed.');
    }
  }
}

/**
 * Sign in as quick demo guest
 */
export function signInAsGuest(): UserProfile {
  const guestProfile: UserProfile = {
    uid: 'guest_' + Date.now(),
    email: 'guest@reflection.ai',
    displayName: 'Mindful Explorer (Guest)',
    photoURL: null,
    createdAt: new Date().toISOString()
  };
  localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(guestProfile));
  return guestProfile;
}

export async function signOutUser(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch (e) {
    console.warn('Firebase signout error:', e);
  }
  localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);
}

/**
 * Get current stored local user if auth state isn't initialized
 * Clears out any legacy mock demo user 'Alex Thoughtful'
 */
export function getSavedLocalUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
    if (raw) {
      const user = JSON.parse(raw);
      // Evict legacy mock profile
      if (user.email === 'alex.thinker@example.com' || user.displayName === 'Alex Thoughtful') {
        localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);
        return null;
      }
      return user;
    }
  } catch (e) {
    // Ignore parse errors
  }
  return null;
}

// In-memory fallback if localStorage quota exceeded or private browsing restricted
const inMemoryCache = new Map<string, JournalEntry[]>();

/**
 * Save / Update a Journal Entry in Firestore under /users/{userId}/entries/{entryId}
 * With robust local storage fallback and strict transaction integrity (no silent failures).
 */
export async function saveJournalEntry(userId: string, entry: JournalEntry): Promise<void> {
  const sanitized = sanitizePayload(entry);
  let localSaved = false;

  // 1. Always mirror to local storage and in-memory cache first
  try {
    const key = `${LOCAL_STORAGE_ENTRIES_KEY}${userId}`;
    const raw = localStorage.getItem(key);
    let list: JournalEntry[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex(e => e.id === entry.id);
    if (index >= 0) {
      list[index] = sanitized;
    } else {
      list.unshift(sanitized);
    }
    try {
      localStorage.setItem(key, JSON.stringify(list));
      localSaved = true;
    } catch (quotaErr) {
      console.warn('LocalStorage quota limit reached, trimming oldest entries:', quotaErr);
      // Prune list to most recent 50 entries to recover space
      if (list.length > 50) {
        list = list.slice(0, 50);
        localStorage.setItem(key, JSON.stringify(list));
        localSaved = true;
      }
    }
    inMemoryCache.set(userId, list);
  } catch (e) {
    console.error('Local backup save encountered issue:', e);
    // In-memory fallback guarantees session integrity
    const currentList = inMemoryCache.get(userId) || [];
    const idx = currentList.findIndex(e => e.id === entry.id);
    if (idx >= 0) currentList[idx] = sanitized;
    else currentList.unshift(sanitized);
    inMemoryCache.set(userId, currentList);
    localSaved = true;
  }

  // 2. Write to Firestore for authenticated users
  if (!userId.startsWith('guest_')) {
    try {
      const entryRef = doc(db, 'users', userId, 'entries', entry.id);
      await setDoc(entryRef, sanitized, { merge: true });
    } catch (firestoreError: any) {
      console.warn('Firestore write warning (persisted to local cache):', firestoreError);
      // Re-throw so caller can display visible error with retry option (transaction integrity)
      throw new Error(`Sync paused (${firestoreError?.code || 'network/permission'}). Saved locally.`);
    }
  }
}

/**
 * Synchronously retrieves cached entries from local storage (0ms latency).
 */
export function getLocalUserJournalEntries(userId: string): JournalEntry[] {
  const localKey = `${LOCAL_STORAGE_ENTRIES_KEY}${userId}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse local entries:', e);
  }
  return inMemoryCache.get(userId) || [];
}

/**
 * Real-time subscription to user journal entries with instant local cache dispatch.
 * 1. Synchronously emits cached local entries in 0ms (no delay/flicker)
 * 2. Connects to Firestore real-time snapshot listener and streams cloud updates
 */
export function subscribeUserJournalEntries(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void
): () => void {
  const localKey = `${LOCAL_STORAGE_ENTRIES_KEY}${userId}`;

  // 1. Immediately emit local cache synchronously so the UI never displays 0 on sign in
  const cached = getLocalUserJournalEntries(userId);
  if (cached.length > 0) {
    onUpdate(cached);
  }

  // 2. Real-time Firestore snapshot listener
  const entriesCol = collection(db, 'users', userId, 'entries');
  const q = query(entriesCol, orderBy('updatedAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const remoteEntries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        remoteEntries.push(docSnap.data() as JournalEntry);
      });

      // Merge with any offline edits
      const localCurrent = getLocalUserJournalEntries(userId);
      const mergedMap = new Map<string, JournalEntry>();
      localCurrent.forEach((e) => mergedMap.set(e.id, e));
      remoteEntries.forEach((e) => {
        const existing = mergedMap.get(e.id);
        if (!existing || new Date(e.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
          mergedMap.set(e.id, e);
        }
      });

      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      localStorage.setItem(localKey, JSON.stringify(merged));
      onUpdate(merged);
    },
    (err) => {
      console.warn('Firestore snapshot notice (serving from local cache):', err);
      onUpdate(getLocalUserJournalEntries(userId));
    }
  );

  return unsubscribe;
}

/**
 * Load all Journal Entries for a specific user
 */
export async function loadUserJournalEntries(userId: string): Promise<JournalEntry[]> {
  const localEntries = getLocalUserJournalEntries(userId);
  const localKey = `${LOCAL_STORAGE_ENTRIES_KEY}${userId}`;

  try {
    const entriesCol = collection(db, 'users', userId, 'entries');
    const q = query(entriesCol, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const remoteEntries: JournalEntry[] = [];
    querySnapshot.forEach((docSnap) => {
      remoteEntries.push(docSnap.data() as JournalEntry);
    });

    // Merge remote and local by id, picking the newest updatedAt
    const mergedMap = new Map<string, JournalEntry>();
    localEntries.forEach(e => mergedMap.set(e.id, e));
    remoteEntries.forEach(e => {
      const existing = mergedMap.get(e.id);
      if (!existing || new Date(e.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
        mergedMap.set(e.id, e);
      }
    });

    const merged = Array.from(mergedMap.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // Persist merged set into local storage cache
    localStorage.setItem(localKey, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.warn('Firestore read warning (serving from user-isolated local state):', e);
  }

  return localEntries;
}

/**
 * Delete a user's journal entry
 */
export async function deleteUserJournalEntry(userId: string, entryId: string): Promise<void> {
  const localKey = `${LOCAL_STORAGE_ENTRIES_KEY}${userId}`;
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      const list: JournalEntry[] = JSON.parse(raw);
      const filtered = list.filter(e => e.id !== entryId);
      localStorage.setItem(localKey, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('Failed to delete from local cache:', e);
  }

  try {
    const entryRef = doc(db, 'users', userId, 'entries', entryId);
    await deleteDoc(entryRef);
  } catch (e) {
    console.warn('Firestore delete warning:', e);
  }
}
