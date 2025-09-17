import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Image, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  console.log('Index: Component rendering');
  const [isMounted, setIsMounted] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  
  // Check for shared video parameter
  const params = useLocalSearchParams();
  const [sharedVideoId, setSharedVideoId] = useState<string | null>(null);
  
  // Get shared video ID from URL params
  useEffect(() => {
    if (Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      const vParam = urlParams.get('v');
      if (vParam) {
        console.log('🔗 Shared video detected in index:', vParam);
        setSharedVideoId(vParam);
      }
    }
    
    if (params.v) {
      console.log('🔗 Shared video from params:', params.v);
      setSharedVideoId(params.v as string);
    }
  }, [params.v]);

  // Wait for component to mount properly
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100); // Small delay to ensure Root Layout is ready
    
    return () => clearTimeout(timer);
  }, []);

  // Navigate based on authentication status and shared video
  useEffect(() => {
    if (isMounted && !isLoading) {
      // If there's a shared video, always go to main app (even if not authenticated)
      if (sharedVideoId) {
        console.log('🔗 Shared video detected, navigating to main app for guest viewing');
        router.replace('/(tabs)');
      } else if (isAuthenticated) {
        console.log('Index: User is authenticated, navigating to main app');
        router.replace('/(tabs)');
      } else {
        console.log('Index: User is not authenticated, navigating to login');
        router.replace('/login');
      }
    }
  }, [isMounted, isAuthenticated, isLoading, sharedVideoId]);

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
