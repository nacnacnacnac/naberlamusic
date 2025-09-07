import React, { useEffect, useState } from 'react';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';

export default function Index() {
  console.log('Index: Component rendering');
  const { isSignedIn, isLoading: authLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  
  console.log('Index: Auth - isLoading:', authLoading, 'isSignedIn:', isSignedIn);

  // Wait for component to mount properly
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100); // Small delay to ensure Root Layout is ready
    
    return () => clearTimeout(timer);
  }, []);

  // Navigate only after component is mounted and auth is ready
  useEffect(() => {
    if (isMounted && !authLoading) {
      if (isSignedIn) {
        console.log('Index: User signed in, navigating to tabs');
        router.replace('/(tabs)');
      } else {
        console.log('Index: User not signed in, navigating to login');
        router.replace('/login');
      }
    }
  }, [isSignedIn, authLoading, isMounted]);

  // Show loading with animated gif while determining state
  return (
    <View style={styles.loadingContainer}>
      <Image 
        source={require('@/assets/images/loading.gif')}
        style={styles.loadingGif}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingGif: {
    width: 80,
    height: 80,
  },
});
