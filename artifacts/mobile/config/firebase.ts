import { initializeApp, getApps, getApp } from "firebase/app";
// @ts-ignore
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your exact Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDm8_EGMh5aLHogftlHE2mbFAXpIicBlcE",
  authDomain: "splitwise-72d92.firebaseapp.com",
  projectId: "splitwise-72d92",
  storageBucket: "splitwise-72d92.firebasestorage.app",
  messagingSenderId: "26796493718",
  appId: "1:26796493718:web:0eaf60850ce94eed616bb7",
  measurementId: "G-PDQ8C62FKT"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Configure dynamic auth persistence to prevent warnings and persist logins across native sessions,
// wrapped in a try/catch block to prevent crashes during HMR / fast refresh reloads!
let auth: Auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error: any) {
    if (error.code === "auth/already-initialized" || error.message?.includes("already-initialized")) {
      auth = getAuth(app);
    } else {
      throw error;
    }
  }
}

const db = getFirestore(app);

// Safe Analytics call only for Web browsers (protects native app from crashes!)
if (Platform.OS === "web") {
  try {
    const { getAnalytics } = require("firebase/analytics");
    getAnalytics(app);
  } catch (err) {
    console.warn("Analytics initialization failed:", err);
  }
}

export { auth, db };
