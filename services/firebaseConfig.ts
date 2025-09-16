import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Conditional import for Google Sign-In (only for native platforms)
let GoogleSignin: any = null;
if (Platform.OS !== 'web') {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
}

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDv3rEVz9UYSsVWhOR87hWBIzpesJz-7FA",
  authDomain: "naber-la-471413.firebaseapp.com",
  projectId: "naber-la-471413",
  storageBucket: "naber-la-471413.firebasestorage.app",
  messagingSenderId: "127637606270",
  appId: "1:127637606270:web:efa3f9a0b640b2d6b7ed2f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
let auth;
try {
  if (Platform.OS === 'web') {
    // Web uses default persistence (localStorage)
    auth = getAuth(app);
    console.log('🔥 Firebase Auth initialized for web with localStorage persistence');
  } else {
    // Native uses AsyncStorage persistence
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
    console.log('🔥 Firebase Auth initialized with AsyncStorage persistence');
  }
} catch (error) {
  // If already initialized, get existing auth instance
  auth = getAuth(app);
  console.log('🔥 Firebase Auth already initialized, using existing instance');
}

// Configure Google Sign-In (only for native platforms)
if (GoogleSignin) {
  GoogleSignin.configure({
    webClientId: '127637606270-aj62m58jl803s8latldmfi9lvd47msr9.apps.googleusercontent.com',
    iosClientId: '127637606270-kluqqf4t7pbanr138cvj1bq2b2bhb8jb.apps.googleusercontent.com',
    offlineAccess: true,
    forceCodeForRefreshToken: true,
    profileImageSize: 120,
  });
}

// Initialize Firestore
const db = getFirestore(app);
console.log('🔥 Firestore initialized');

export { auth, db, GoogleAuthProvider, GoogleSignin };
