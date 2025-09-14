import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { authService, User } from '@/services/authService';
import { router } from 'expo-router';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (method: 'google' | 'apple' | 'developer') => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const isAuthenticated = user !== null;

  // Initialize auth state on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  // Firebase auth state listener - only after initialization
  useEffect(() => {
    if (!isInitialized) return;

    console.log('🔥 Setting up Firebase auth listener...');
    const unsubscribe = authService.onAuthStateChanged((firebaseUser) => {
      console.log('🔥 Firebase auth state changed:', firebaseUser?.email || 'null');
      console.log('🔍 [DEBUG] Current context user:', user?.email || 'null');
      console.log('🔍 [DEBUG] Comparison - Firebase:', firebaseUser?.email, 'vs Context:', user?.email);
      
      // Only update if there's a real change
      if (firebaseUser && firebaseUser.email !== user?.email) {
        console.log('✅ Firebase user authenticated, updating context');
        setUser(firebaseUser);
      } else if (!firebaseUser && user) {
        // Check if user was loaded from AsyncStorage (warning sign)
        console.log('🔍 Checking if this is a real logout or Firebase not ready...');
        console.log('🔍 [DEBUG] User exists in context but Firebase is null');
        console.log('🔍 [DEBUG] This could be: 1) Real logout 2) Firebase not ready 3) Development reload');
        
        // Don't clear user immediately - this might be Firebase not being ready yet
        // In development mode, Firebase auth state can be delayed
        console.log('⏳ Keeping user from AsyncStorage, Firebase auth may restore later');
        console.log('💡 If this is a real logout, user will be cleared by explicit signOut call');
      } else {
        console.log('🔍 [DEBUG] No action needed - states match or both null');
      }
    });

    return unsubscribe;
  }, [isInitialized, user?.email]);

  // Handle navigation based on auth state - REMOVED AUTO REDIRECT
  // Users can now stay on current page when logging in/out
  // Login/logout actions are available on index and playlist pages
  useEffect(() => {
    if (!isLoading && isInitialized) {
      console.log('🧭 Auth state updated - isAuthenticated:', isAuthenticated, 'user:', user?.email);
      // No automatic navigation - let users stay where they are
    }
  }, [isAuthenticated, isLoading, isInitialized]);

  const initializeAuth = async () => {
    try {
      console.log('🔐 Initializing auth state...');
      console.log('🔐 [DEBUG] App startup - checking auth state');
      
      // Step 1: Check Firebase auth state first (more reliable)
      const firebaseUser = authService.getCurrentUser();
      console.log('🔥 [DEBUG] Firebase getCurrentUser result:', firebaseUser?.email || 'null');
      
      let storedUser = null;
      
      if (firebaseUser) {
        console.log('🔥 Firebase user already authenticated:', firebaseUser.email);
        setUser(firebaseUser);
      } else {
        // Step 2: Try to load user from AsyncStorage as fallback
        console.log('📦 [DEBUG] Checking AsyncStorage...');
        storedUser = await authService.loadUserFromStorage();
        console.log('📦 [DEBUG] AsyncStorage result:', storedUser?.email || 'null');
        
        if (storedUser) {
          console.log('📦 Loaded user from storage:', storedUser.email);
          console.log('⚠️ [WARNING] User loaded from storage but Firebase auth not ready');
          console.log('⚠️ [WARNING] API calls may fail until Firebase auth restores');
          setUser(storedUser);
        } else {
          console.log('📦 No stored user found');
        }
      }
      
      // Step 3: Mark as initialized and stop loading
      setIsInitialized(true);
      setIsLoading(false);
      
      const finalUser = firebaseUser || storedUser;
      console.log('✅ Auth initialization complete - final user:', finalUser?.email || 'null');
      console.log('🔍 [DEBUG] Final state - Firebase:', firebaseUser?.email || 'null', 'Storage:', storedUser?.email || 'null');
      
    } catch (error) {
      console.error('❌ Auth initialization failed:', error);
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  const signIn = async (method: 'google' | 'apple' | 'developer') => {
    try {
      setIsLoading(true);
      
      let user: User;
      
      switch (method) {
        case 'google':
          user = await authService.signInWithGoogle();
          break;
        case 'apple':
          user = await authService.signInWithApple();
          break;
        case 'developer':
          user = await authService.signInAsDeveloper();
          break;
        default:
          throw new Error('Invalid sign-in method');
      }
      
      console.log('✅ Sign-in successful:', user.email);
      
      // Keep music playing - don't interrupt user experience
      // Music will continue playing after sign-in
      
      setUser(user);
      
      // No automatic navigation - user stays on current page
      
    } catch (error) {
      console.error('❌ Sign-in failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      
      console.log('🚪 Explicit sign out - clearing all auth state');
      await authService.signOut();
      setUser(null);
      
      console.log('✅ Sign-out successful - user cleared from context and storage');
      
      // No automatic navigation - user stays on current page
      
    } catch (error) {
      console.error('❌ Sign-out failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const storedUser = await authService.loadUserFromStorage();
      setUser(storedUser);
    } catch (error) {
      console.error('❌ Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
