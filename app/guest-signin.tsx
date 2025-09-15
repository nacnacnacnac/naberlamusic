import React from 'react';
import { StyleSheet, TouchableOpacity, StatusBar, Platform, Alert } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { CustomIcon } from '@/components/ui/CustomIcon';
import { useAuth } from '@/contexts/AuthContext';

export default function GuestSignInScreen() {
  const { videoId, videoTitle, action } = useLocalSearchParams<{
    videoId: string;
    videoTitle: string;
    action: string;
  }>();
  
  const { signIn } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      console.log('🔍 Google Sign-In from guest screen...');
      const user = await signIn('google');
      console.log('✅ Google sign-in completed:', user);
      
      // After successful sign-in, navigate to the intended action
      if (action === 'playlist' && videoId && videoTitle) {
        router.replace({
          pathname: '/create-playlist',
          params: { videoId, videoTitle }
        });
      } else {
        router.back();
      }
    } catch (error: any) {
      console.error('❌ Google sign-in error:', error);
      Alert.alert(
        'Google Sign In Failed',
        error.message || 'Failed to sign in with Google'
      );
    }
  };

  const handleAppleSignIn = async () => {
    try {
      console.log('🍎 Apple Sign-In from guest screen...');
      const user = await signIn('apple');
      console.log('✅ Apple sign-in completed:', user);
      
      // After successful sign-in, navigate to the intended action
      if (action === 'playlist' && videoId && videoTitle) {
        router.replace({
          pathname: '/create-playlist',
          params: { videoId, videoTitle }
        });
      } else {
        router.back();
      }
    } catch (error: any) {
      console.error('❌ Apple sign-in error:', error);
      Alert.alert(
        'Apple Sign In Failed',
        error.message || 'Failed to sign in with Apple'
      );
    }
  };


  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <ThemedView style={styles.container}>
        {/* Header */}
        <ThemedView style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <CustomIcon name="chevron-left" size={24} color="#e0af92" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Sign In Required</ThemedText>
        </ThemedView>

        {/* Content */}
        <ThemedView style={styles.centerContent}>
          <Image
            source={require('@/assets/images/animation/heart.png')}
            style={styles.heartIcon}
            contentFit="contain"
          />
          <ThemedText style={styles.emptyTitle}>Create Playlists</ThemedText>
          <ThemedText style={styles.emptyText}>
            Sign in to create and manage your personal playlists
          </ThemedText>
          
          {videoTitle && (
            <ThemedView style={styles.videoInfo}>
              <IconSymbol name="music.note" size={16} color="#e0af92" />
              <ThemedText style={styles.videoTitle} numberOfLines={1}>
                {videoTitle}
              </ThemedText>
            </ThemedView>
          )}
          
          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={[styles.signInButton, styles.googleSignInButton]}
            onPress={handleGoogleSignIn}
          >
            <Image
              source={require('@/assets/images/google.svg')}
              style={styles.signInIcon}
              contentFit="contain"
            />
            <ThemedText style={styles.signInButtonText}>Sign in with Google</ThemedText>
          </TouchableOpacity>

          {/* Apple Sign-In Button - Only on iOS */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.signInButton, styles.appleSignInButton]}
              onPress={handleAppleSignIn}
            >
              <IconSymbol name="apple.logo" size={20} color="#ffffff" />
              <ThemedText style={[styles.signInButtonText, { color: '#ffffff' }]}>
                Sign in with Apple
              </ThemedText>
            </TouchableOpacity>
          )}

        </ThemedView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#000000',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  heartIcon: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 18,
  },
  videoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(224, 175, 146, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 30,
    maxWidth: '100%',
  },
  videoTitle: {
    color: '#e0af92',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
    minWidth: 280,
    justifyContent: 'center',
  },
  signInButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  signInIcon: {
    width: 20,
    height: 20,
  },
  googleSignInButton: {
    backgroundColor: '#e0af92',
  },
  appleSignInButton: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#333333',
  },
});
