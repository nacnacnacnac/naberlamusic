import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  // Try to initialize auth with React Native persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  console.log('🔥 Firebase Auth initialized with AsyncStorage persistence');
} catch (error) {
  // If already initialized, get existing auth instance
  auth = getAuth(app);
  console.log('🔥 Firebase Auth already initialized, using existing instance');
}

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '127637606270-bn9m33t2gqfrhrqa7r9t4prrgdievflf.apps.googleusercontent.com',
  iosClientId: '127637606270-kluqqf4t7pbanr138cvj1bq2b2bhb8jb.apps.googleusercontent.com',
  offlineAccess: true, // Enable offline access
  hostedDomain: '', // Specify the G Suite domain (if any)
  forceCodeForRefreshToken: true, // Force code for refresh token
  accountName: '', // Specify account name
  googleServicePlistPath: '', // Path to GoogleService-Info.plist
  openIdNonce: '', // OpenID nonce
  profileImageSize: 120, // Profile image size
});

export { auth, GoogleAuthProvider, GoogleSignin };
