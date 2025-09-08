import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View, StyleSheet, Image } from 'react-native';

export default function Index() {
  console.log('Index: Component rendering');
  const [isMounted, setIsMounted] = useState(false);

  // Wait for component to mount properly
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100); // Small delay to ensure Root Layout is ready
    
    return () => clearTimeout(timer);
  }, []);

  // Navigate to login page first (no auth needed, just for UI flow)
  useEffect(() => {
    if (isMounted) {
      console.log('Index: Navigating to login page');
      router.replace('/login');
    }
  }, [isMounted]);

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
