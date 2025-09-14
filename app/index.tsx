import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View, StyleSheet, Image } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  console.log('Index: Component rendering');
  const [isMounted, setIsMounted] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();

  // Wait for component to mount properly
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100); // Small delay to ensure Root Layout is ready
    
    return () => clearTimeout(timer);
  }, []);

  // Navigate based on authentication status
  useEffect(() => {
    if (isMounted && !isLoading) {
      if (isAuthenticated) {
        console.log('Index: User is authenticated, navigating to main app');
        router.replace('/(tabs)');
      } else {
        console.log('Index: User is not authenticated, navigating to login');
        router.replace('/login');
      }
    }
  }, [isMounted, isAuthenticated, isLoading]);

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
