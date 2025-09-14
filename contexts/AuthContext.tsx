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
      
      // Only update if there's a real change
      if (firebaseUser && firebaseUser.email !== user?.email) {
        console.log('✅ Firebase user authenticated, updating context');
        setUser(firebaseUser);
      } else if (!firebaseUser && user) {
        console.log('❌ Firebase user signed out, clearing context');
        setUser(null);
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
      
      // Step 1: Try to load user from AsyncStorage first (immediate restore)
      const storedUser = await authService.loadUserFromStorage();
      if (storedUser) {
        console.log('📦 Loaded user from storage:', storedUser.email);
        setUser(storedUser);
      } else {
        console.log('📦 No stored user found');
      }
      
      // Step 2: Mark as initialized and stop loading
      setIsInitialized(true);
      setIsLoading(false);
      
      console.log('✅ Auth initialization complete');
      
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
      
      await authService.signOut();
      setUser(null);
      
      console.log('✅ Sign-out successful');
      
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
