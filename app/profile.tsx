import React from 'react';
import { StyleSheet, TouchableOpacity, Alert, ScrollView, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { authService } from '@/services/authService';
import { router } from 'expo-router';
import { useVimeo } from '@/contexts/VimeoContext';

export default function ProfileScreen() {
  const user = authService.getCurrentUser();
  const { resetAll } = useVimeo();
  
  // Admin check - only show debug/settings for uurcan@gmail.com
  const isAdmin = user?.email === 'uurcan@gmail.com';

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Stop any playing music and reset all state
              console.log('🎵 Stopping music and resetting state...');
              resetAll();
              
              await authService.signOut();
              
              // Navigate to login screen
              router.replace('/login');
            } catch (error) {
              console.error('❌ Sign out failed:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleSettings = () => {
    Alert.alert('Coming Soon', 'Settings will be available soon!');
  };

  if (!user) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ThemedView style={styles.container}>
          {/* Not Signed In Content */}
          <ThemedView style={styles.centerContent}>
            <Image
              source={require('@/assets/images/animation/heart.png')}
              style={styles.heartIcon}
              contentFit="contain"
            />
            <ThemedText style={styles.emptyTitle}>Not Signed In</ThemedText>
            <ThemedText style={styles.emptyText}>
              Please sign in to access your profile
            </ThemedText>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => router.replace('/login')}
            >
              <ThemedText style={styles.signInButtonText}>Sign In</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <ThemedView style={styles.container}>
        {/* Profile Content - Clean layout without header */}
        <ThemedView style={styles.centerContent}>
          <Image
            source={require('@/assets/images/animation/heart.png')}
            style={styles.heartIcon}
            contentFit="contain"
          />
          <ThemedText style={styles.emptyTitle}>Welcome back!</ThemedText>
          <ThemedText style={styles.emptyText}>
            {user.displayName || user.email}
          </ThemedText>
          
          {/* Admin Buttons - Only for uurcan@gmail.com */}
          {isAdmin && (
            <>
              {/* Debug API Button */}
              <TouchableOpacity 
                style={[styles.createPlaylistButton, styles.debugButton]}
                onPress={() => router.push('/debug-api')}
              >
                <IconSymbol name="wrench.and.screwdriver" size={20} color="#FFFFFF" />
                <ThemedText style={[styles.createPlaylistButtonText, styles.debugButtonText]}>
                  Debug API
                </ThemedText>
              </TouchableOpacity>

              {/* Admin Settings Button */}
              <TouchableOpacity 
                style={[styles.createPlaylistButton, styles.adminButton]}
                onPress={() => router.push('/admin-settings')}
              >
                <IconSymbol name="gear" size={20} color="#FFFFFF" />
                <ThemedText style={[styles.createPlaylistButtonText, styles.adminButtonText]}>
                  Admin Settings
                </ThemedText>
              </TouchableOpacity>

              {/* Settings Button */}
              <TouchableOpacity 
                style={[styles.createPlaylistButton, styles.settingsButton]}
                onPress={handleSettings}
              >
                <IconSymbol name="gearshape" size={20} color="#000000" />
                <ThemedText style={styles.createPlaylistButtonText}>
                  Settings
                </ThemedText>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity 
            style={[styles.createPlaylistButton, styles.signOutButton]}
            onPress={handleSignOut}
          >
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color="#ffffff" />
            <ThemedText style={[styles.createPlaylistButtonText, { color: '#ffffff' }]}>
              Sign Out
            </ThemedText>
          </TouchableOpacity>

          {/* App Info */}
          <ThemedView style={styles.appInfoBottom}>
            <ThemedText style={styles.appInfoText}>Naber LA v1.3.0</ThemedText>
            <ThemedView style={styles.madeWithContainer}>
              <ThemedText style={styles.madeWithText}>Made with </ThemedText>
              <Image
                source={require('@/assets/images/naberla.svg')}
                style={styles.naberlaIcon}
                contentFit="contain"
              />
            </ThemedView>
          </ThemedView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Tab bar için extra space
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60, // Safe area için üst boşluk
  },
  notLoggedIn: {
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
  signInButton: {
    backgroundColor: '#e0af92',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  signInButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  createPlaylistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0af92',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
  },
  createPlaylistButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  settingsButton: {
    backgroundColor: '#333333',
  },
  debugButton: {
    backgroundColor: '#8B5CF6', // Mor renk
  },
  debugButtonText: {
    color: '#FFFFFF',
  },
  adminButton: {
    backgroundColor: '#EF4444', // Kırmızı renk
  },
  adminButtonText: {
    color: '#FFFFFF',
  },
  signOutButton: {
    backgroundColor: '#ff6b6b',
  },
  appInfoBottom: {
    alignItems: 'center',
    marginTop: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#000000',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  profileContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileHeart: {
    width: 60,
    height: 60,
    marginBottom: 15,
    opacity: 0.9,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    marginBottom: 30,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#cccccc',
  },
  menuSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 15,
    fontWeight: '500',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingBottom: 100, // Tab bar için extra space
  },
  appInfoText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  madeWithContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8, // Hafif sağa kaydır
  },
  madeWithText: {
    fontSize: 12,
    color: '#666666',
  },
  naberlaIcon: {
    width: 40,
    height: 16,
    opacity: 0.7,
    marginLeft: -12,
  },
  heartIconSmall: {
    width: 16,
    height: 16,
    opacity: 0.8,
  },
});
