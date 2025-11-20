import * as firebaseApp from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD2MJ5ROsnXZRxTrDTxUww-Up3fWoSEd6Y",
  authDomain: "newaipos.firebaseapp.com",
  databaseURL: "https://newaipos-default-rtdb.firebaseio.com",
  projectId: "newaipos",
  storageBucket: "newaipos.firebasestorage.app",
  messagingSenderId: "471647125470",
  appId: "1:471647125470:web:2325848b55432c3609274f",
  measurementId: "G-1WD1KRE4KJ"
};

// Initialize Firebase
// Workaround for TS error: Module '"firebase/app"' has no exported member 'initializeApp'
// This allows the code to run even if TypeScript definitions are mismatched for firebase/app
const appModule = firebaseApp as any;
const initializeApp = appModule.initializeApp || appModule.default?.initializeApp;
const getApps = appModule.getApps || appModule.default?.getApps;
const getApp = appModule.getApp || appModule.default?.getApp;

// Check if apps are already initialized to prevent "App already exists" error during hot-reload
const app = (getApps && getApps().length > 0) ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getDatabase(app);