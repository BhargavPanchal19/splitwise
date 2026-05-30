import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { auth } from "../config/firebase";
import {
  fetchUserProfile,
  saveUserProfile,
} from "@/services/firestoreStore";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  friendCode?: string;
  photoURL?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (name: string, phone: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileDetails: (name: string, phone: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Synchronize authentication state on app launch and user state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const profile = await fetchUserProfile(firebaseUser.uid);
          setUser((prev) => {
            if (profile) return profile;
            if (prev && prev.id === firebaseUser.uid && prev.phone) {
              return prev;
            }
            return {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || "User",
              email: firebaseUser.email || "",
            };
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Error setting user state:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Real Firebase Sign Up
  const signUp = useCallback(
    async (name: string, phone: string, email: string, _password: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email, _password);
      
      // Update display name in Firebase Auth profile
      await updateProfile(cred.user, { displayName: name.trim() });

      const me: User = {
        id: cred.user.uid,
        name: name.trim(),
        email: cred.user.email || email.toLowerCase().trim(),
        phone: phone.trim(),
      };
      
      await saveUserProfile(me);

      setUser(me);
    },
    []
  );

  // Real Firebase Sign In
  const signIn = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const profile = await fetchUserProfile(cred.user.uid);
    const me: User =
      profile ?? {
        id: cred.user.uid,
        name: cred.user.displayName || "User",
        email: cred.user.email || email.toLowerCase().trim(),
      };
    setUser(me);
  }, []);

  // Real Firebase Sign Out
  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    setUser(null);
  }, []);

  const updateProfileDetails = useCallback(
    async (name: string, phone: string) => {
      if (!auth.currentUser) return;

      // 1. Update Firebase Auth displayName
      await updateProfile(auth.currentUser, { displayName: name.trim() });

      // 2. Prepare user object
      const updatedUser: User = {
        id: auth.currentUser.uid,
        name: name.trim(),
        email: auth.currentUser.email || user?.email || "",
        phone: phone.trim(),
        friendCode: user?.friendCode,
      };

      // 3. Save to Firestore
      await saveUserProfile(updatedUser);

      // 4. Update local state
      setUser(updatedUser);
    },
    [user]
  );

  const value = React.useMemo(
    () => ({ user, loading, signUp, signIn, signOut, updateProfileDetails }),
    [user, loading, signUp, signIn, signOut, updateProfileDetails]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
