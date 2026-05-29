import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USERS_KEY = "splitwise_users";
const CURRENT_USER_KEY = "splitwise_current_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(CURRENT_USER_KEY).then((raw) => {
      if (raw) setUser(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, _password: string) => {
      const raw = await AsyncStorage.getItem(USERS_KEY);
      const users: (User & { password: string })[] = raw
        ? JSON.parse(raw)
        : [];
      if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("An account with this email already exists.");
      }
      const newUser: User & { password: string } = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: _password,
      };
      await AsyncStorage.setItem(
        USERS_KEY,
        JSON.stringify([...users, newUser])
      );
      const me: User = { id: newUser.id, name: newUser.name, email: newUser.email };
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(me));
      setUser(me);
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    const users: (User & { password: string })[] = raw ? JSON.parse(raw) : [];
    const found = users.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase().trim() &&
        u.password === password
    );
    if (!found) throw new Error("Invalid email or password.");
    const me: User = { id: found.id, name: found.name, email: found.email };
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(me));
    setUser(me);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
