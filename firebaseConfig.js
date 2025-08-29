// Firebase v9+ Web SDK for React Native/Expo
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth, 
  getReactNativePersistence,
  connectAuthEmulator
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyCrslnoNWtu5V_CFJh2dXkZ5hkta54sutE",
  authDomain: "rheuma-app-1e933.firebaseapp.com",
  projectId: "rheuma-app-1e933",
  storageBucket: "rheuma-app-1e933.firebasestorage.app",
  messagingSenderId: "451850054864",
  appId: "1:451850054864:ios:6434b372e09ae80ee542d5"
};

// Firebaseアプリの初期化（重複初期化を防止）
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// 認証の初期化
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // 既に初期化されている場合
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    throw error;
  }
}

// Firestoreの初期化
const db = getFirestore(app);

export { auth, db };
