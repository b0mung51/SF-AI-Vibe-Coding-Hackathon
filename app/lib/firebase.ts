import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, setPersistence, browserLocalPersistence, deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import type { User } from '@/app/types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:demo',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Set persistence to ensure auth state survives page refreshes
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting auth persistence:', error);
});

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
// Force Google to show account selector by setting prompt to 'select_account'
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const username = user.email?.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || `user${Date.now()}`;

      const userData: Partial<User> = {
        id: user.uid,
        email: user.email!,
        displayName: user.displayName || 'User',
        username,
        photoURL: user.photoURL || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { user: userData, isNewUser: true };
    } else {
      await updateDoc(userRef, {
        updatedAt: serverTimestamp(),
      });

      return { user: userSnap.data() as User, isNewUser: false };
    }
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const deleteAccount = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }

    // Re-authenticate the user before deletion for security
    try {
      console.log('Re-authenticating user for account deletion...');
      await reauthenticateWithPopup(user, googleProvider);
    } catch (reauthError: any) {
      if (reauthError.code === 'auth/popup-closed-by-user') {
        throw new Error('Authentication cancelled. Account deletion requires recent authentication.');
      }
      throw new Error('Re-authentication failed. Please try signing out and back in, then try deleting your account again.');
    }

    // Delete user document from Firestore
    const userRef = doc(db, 'users', user.uid);
    await deleteDoc(userRef);

    // Clear all local storage and session storage
    localStorage.clear();
    sessionStorage.clear();

    // Clear IndexedDB (where Firebase might store data)
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name && db.name.includes('firebase')) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    }

    // Delete the Firebase Auth user account (this will also sign them out)
    await deleteUser(user);

    console.log('Account successfully deleted');
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};

export default app;
