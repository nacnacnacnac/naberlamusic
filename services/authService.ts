import { auth, GoogleAuthProvider, GoogleSignin } from './firebaseConfig';
import { signInWithCredential, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

class AuthService {
  private currentUser: User | null = null;
  
  /**
   * Development bypass - creates a fake user for simulator testing
   */
  async signInAsDeveloper(): Promise<User> {
    console.log('🧑‍💻 Development bypass - signing in as fake user');
    const fakeUser: User = {
      uid: 'dev-user-123',
      email: 'developer@naberla.com',
      displayName: 'Developer User',
      photoURL: null,
    };
    
    this.currentUser = fakeUser;
    await this.saveUserToStorage(fakeUser);
    console.log('✅ Development sign-in successful');
    return fakeUser;
  }

  /**
   * Google Sign-In with Firebase
   */
  async signInWithGoogle(): Promise<User> {
    try {
      console.log('🔐 Starting Google Sign-In...');
      
      // Force sign out first to clear any cached state
      try {
        await GoogleSignin.signOut();
        console.log('🧹 Cleared previous Google Sign-In state');
      } catch (e) {
        console.log('ℹ️ No previous sign-in to clear');
      }
      
      // Check if device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Get user info from Google
      console.log('📱 Google Sign-In dialog opening...');
      const result = await GoogleSignin.signIn();
      console.log('✅ Google Sign-In result:', { 
        hasIdToken: !!result.data?.idToken, 
        user: result.data?.user?.email,
        fullResult: result 
      });
      
      const idToken = result.data?.idToken;
      if (!idToken) {
        throw new Error('No idToken received from Google Sign-In');
      }
      
      // Create Firebase credential
      console.log('🔑 Creating Firebase credential...');
      const googleCredential = GoogleAuthProvider.credential(idToken);
      
      // Sign in with Firebase
      console.log('🔥 Signing in to Firebase...');
      const userCredential = await signInWithCredential(auth, googleCredential);
      
      const user: User = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
      };
      
      this.currentUser = user;
      await this.saveUserToStorage(user);
      
      console.log('✅ Google Sign-In successful:', user.email);
      return user;
      
    } catch (error) {
      console.error('❌ Google Sign-In failed:', error);
      throw error;
    }
  }

  /**
   * Apple Sign-In with Firebase
   */
  async signInWithApple(): Promise<User> {
    try {
      console.log('🍎 Starting Apple Sign-In...');
      console.log('🔍 Platform:', Platform.OS);
      console.log('🔍 Platform Version:', Platform.Version);
      
      // Check if Apple Authentication is available
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign-In is only available on iOS devices');
      }
      
      console.log('🔍 Checking Apple Authentication availability...');
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      console.log('🔍 Apple Authentication available:', isAvailable);
      
      if (!isAvailable) {
        // More detailed error information
        console.log('🔍 Device info:', {
          platform: Platform.OS,
          version: Platform.Version,
          isAvailable: isAvailable
        });
        throw new Error(`Apple Sign-In is not available on this device. Platform: ${Platform.OS}, Version: ${Platform.Version}`);
      }
      
      // Request Apple authentication
      console.log('📱 Apple Sign-In dialog opening...');
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      console.log('✅ Apple Sign-In result:', { 
        hasIdentityToken: !!appleCredential.identityToken,
        user: appleCredential.user,
        email: appleCredential.email 
      });
      
      const { identityToken, nonce } = appleCredential;
      if (!identityToken) {
        throw new Error('No identity token received from Apple Sign-In');
      }
      
      // Create Firebase credential for Apple
      console.log('🔑 Creating Firebase credential...');
      const { OAuthProvider } = require('firebase/auth');
      const provider = new OAuthProvider('apple.com');
      const appleAuthCredential = provider.credential({
        idToken: identityToken,
        rawNonce: nonce,
      });
      
      // Sign in with Firebase
      console.log('🔥 Signing in to Firebase...');
      const userCredential = await signInWithCredential(auth, appleAuthCredential);
      
      // Create user object with Apple data
      const displayName = appleCredential.fullName 
        ? `${appleCredential.fullName.givenName || ''} ${appleCredential.fullName.familyName || ''}`.trim()
        : userCredential.user.displayName;
      
      const user: User = {
        uid: userCredential.user.uid,
        email: appleCredential.email || userCredential.user.email,
        displayName: displayName || 'Apple User',
        photoURL: userCredential.user.photoURL,
      };
      
      this.currentUser = user;
      await this.saveUserToStorage(user);
      
      console.log('✅ Apple Sign-In successful:', user.email);
      return user;
      
    } catch (error) {
      console.error('❌ Apple Sign-In failed:', error);
      throw error;
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      await GoogleSignin.signOut();
      await signOut(auth);
      await AsyncStorage.removeItem('user');
      this.currentUser = null;
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      throw error;
    }
  }

  /**
   * Get current user (check Firebase auth first)
   */
  getCurrentUser(): User | null {
    // Check Firebase auth state first
    const firebaseUser = auth.currentUser;
    console.log('🔍 [DEBUG] Firebase auth.currentUser:', firebaseUser?.email || 'null');
    
    if (firebaseUser) {
      const user: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      };
      this.currentUser = user;
      console.log('✅ [DEBUG] Firebase user found, returning:', user.email);
      return user;
    }
    
    // Fallback to cached user
    console.log('🔍 [DEBUG] No Firebase user, checking cached user:', this.currentUser?.email || 'null');
    return this.currentUser;
  }

  /**
   * Check if user is signed in
   */
  isSignedIn(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Load user from storage
   */
  async loadUserFromStorage(): Promise<User | null> {
    try {
      console.log('📖 [DEBUG] Loading user from AsyncStorage...');
      const userData = await AsyncStorage.getItem('user');
      console.log('📖 [DEBUG] Raw AsyncStorage data:', userData ? 'exists' : 'null');
      
      if (userData) {
        this.currentUser = JSON.parse(userData);
        console.log('✅ [DEBUG] User loaded from AsyncStorage:', this.currentUser.email);
        return this.currentUser;
      }
      console.log('📖 [DEBUG] No user data in AsyncStorage');
      return null;
    } catch (error) {
      console.error('❌ Failed to load user from storage:', error);
      return null;
    }
  }

  /**
   * Save user to storage
   */
  private async saveUserToStorage(user: User): Promise<void> {
    try {
      console.log('💾 [DEBUG] Saving user to AsyncStorage:', user.email);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      console.log('✅ [DEBUG] User saved to AsyncStorage successfully');
    } catch (error) {
      console.error('❌ Failed to save user to storage:', error);
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const user: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        this.currentUser = user;
        this.saveUserToStorage(user);
        callback(user);
      } else {
        this.currentUser = null;
        AsyncStorage.removeItem('user');
        callback(null);
      }
    });
  }
}

export const authService = new AuthService();
