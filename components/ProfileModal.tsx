import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Alert, Image } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CustomIcon } from '@/components/ui/CustomIcon';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

interface ProfileModalProps {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, signOut, signIn, isAuthenticated } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSignOut = async () => {
    if (!signOut) {
      console.error('❌ signOut function is not available');
      return;
    }

    try {
      await signOut();
      onClose();
      // Index sayfasında kalıyoruz, login'e yönlendirmiyoruz
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      console.log('🔍 Google Sign-In from profile...');
      await signIn('google');
      onClose();
    } catch (error: any) {
      console.error('❌ Google sign-in error:', error);
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Failed to sign in with Google');
      } else {
        Alert.alert('Google Sign In Failed', error.message || 'Failed to sign in with Google');
      }
    }
  };

  const handleAppleSignIn = async () => {
    try {
      console.log('🍎 Apple Sign-In from profile...');
      await signIn('apple');
      onClose();
    } catch (error: any) {
      console.error('❌ Apple sign-in error:', error);
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Failed to sign in with Apple');
      } else {
        Alert.alert('Apple Sign In Failed', error.message || 'Failed to sign in with Apple');
      }
    }
  };


  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!signOut) {
      console.error('❌ signOut function is not available');
      return;
    }

    try {
      await signOut(); // For now, just sign out - implement actual deletion later
      onClose();
    } catch (error) {
      console.error('❌ Account deletion failed:', error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Image 
            source={require('@/assets/images/ok_right.png')}
            style={{ width: 22, height: 22, tintColor: '#e0af92' }}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Profile</ThemedText>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isAuthenticated && user ? (
          <>
            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <ExpoImage
                source={require('@/assets/images/animation/heart.png')}
                style={styles.heartIcon}
                contentFit="contain"
              />
              <ThemedText style={styles.welcomeTitle}>Welcome back!</ThemedText>
              <ThemedText style={styles.welcomeText}>
                {(() => {
                  // Önce displayName'i kontrol et
                  if (user.displayName && user.displayName.trim()) {
                    return user.displayName.split(' ')[0];
                  }
                  
                  // displayName yoksa email'den isim çıkar
                  if (user.email) {
                    const emailName = user.email.split('@')[0];
                    // Nokta ve alt çizgi gibi karakterleri temizle
                    const cleanName = emailName.replace(/[._-]/g, '');
                    // İlk harfi büyük yap
                    return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                  }
                  
                  return 'User';
                })()}
              </ThemedText>
            </View>

            {/* Menu Items - Yan yana butonlar */}
            <View style={styles.menuSection}>
              {!showDeleteConfirm ? (
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={[styles.menuButton, styles.signOutButton, styles.halfWidthButton]}
                    onPress={handleSignOut}
                    activeOpacity={0.7}
                  >
                    <CustomIcon name="logout" size={20} color="#000000" />
                    <ThemedText style={[styles.menuButtonText, { color: '#000000' }]}>
                      Sign Out
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.menuButton, styles.deleteAccountButton, styles.halfWidthButton]}
                    onPress={handleDeleteClick}
                    activeOpacity={0.7}
                  >
                    <CustomIcon name="trash" size={20} color="#666666" />
                    <ThemedText style={[styles.menuButtonText, { color: '#666666' }]}>
                      Delete
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.deleteConfirmContainer}>
                  <View style={styles.deleteMessageContainer}>
                    <TouchableOpacity 
                      style={[styles.menuButton, styles.deleteAccountButton, styles.deleteSlideButton]}
                      disabled
                    >
                      <CustomIcon name="trash" size={20} color="#666666" />
                      <ThemedText style={[styles.menuButtonText, { color: '#666666' }]}>
                        Delete
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.confirmButtonsContainer}>
                    <TouchableOpacity 
                      style={[styles.menuButton, styles.confirmButton, styles.yesButton]}
                      onPress={handleDeleteConfirm}
                      activeOpacity={0.7}
                    >
                      <ThemedText style={[styles.menuButtonText, styles.confirmButtonText, { color: '#666666' }]}>
                        Yes
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.menuButton, styles.confirmButton, styles.noButton]}
                      onPress={handleDeleteCancel}
                      activeOpacity={0.7}
                    >
                      <ThemedText style={[styles.menuButtonText, styles.confirmButtonText, { color: '#e0af92' }]}>
                        No
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* App Info */}
            <View style={styles.appInfo}>
              <ThemedText style={styles.appInfoText}>Naber LA v1.6.0</ThemedText>
              <View style={styles.madeWithContainer}>
                <ThemedText style={styles.madeWithText}>Made with </ThemedText>
                <ExpoImage
                  source={require('@/assets/images/animation/heart.png')}
                  style={styles.heartIconSmall}
                  contentFit="contain"
                />
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Guest Mode */}
            <View style={styles.guestSection}>
              <ExpoImage
                source={require('@/assets/images/animation/heart.png')}
                style={styles.heartIcon}
                contentFit="contain"
              />
                   <ThemedText style={styles.guestTitle}>Welcome to Naber LA</ThemedText>
                   <ThemedText style={styles.guestText}>
                     Sign in to create playlists and access personalized features
                   </ThemedText>
              
              {/* Google Sign-In Button */}
              <TouchableOpacity
                style={[styles.signInButton, styles.googleSignInButton]}
                onPress={handleGoogleSignIn}
                activeOpacity={0.7}
              >
                {Platform.OS === 'web' ? (
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      backgroundColor: 'white',
                      mask: 'url(/images/google.svg) no-repeat center',
                      maskSize: 'contain',
                      WebkitMask: 'url(/images/google.svg) no-repeat center',
                      WebkitMaskSize: 'contain',
                      marginRight: '8px',
                    }}
                  />
                ) : (
                  <ExpoImage
                    source={require('@/assets/images/google.svg')}
                    style={styles.signInIcon}
                    contentFit="contain"
                  />
                )}
                <ThemedText style={styles.signInButtonText}>Sign in with Google</ThemedText>
              </TouchableOpacity>

              {/* Apple Sign-In Button - Only on iOS */}
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.signInButton, styles.appleSignInButton]}
                  onPress={handleAppleSignIn}
                  activeOpacity={0.7}
                >
                  <CustomIcon name="apple" size={20} color="#ffffff" />
                  <ThemedText style={[styles.signInButtonText, { color: '#ffffff' }]}>
                    Sign in with Apple
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e0af92',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(224, 175, 146, 0.1)',
  },
  headerRight: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  guestSection: {
    alignItems: 'center',
    paddingTop: 40,
  },
  heartIcon: {
    width: 60,
    height: 60,
    marginBottom: 15,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  guestText: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  menuSection: {
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0af92',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 20,
    marginBottom: 0,
  },
  halfWidthButton: {
    flex: 1,
    paddingHorizontal: 10, // Daha dar
    marginHorizontal: 5, // Kenarlardan boşluk
  },
  menuButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  signOutButton: {
    backgroundColor: '#e0af92', // Vurgu rengi
  },
  deleteAccountButton: {
    backgroundColor: 'transparent', // Şeffaf arka plan
    borderWidth: 2, // Çerçeve
    borderColor: '#666666', // Koyu gri çerçeve
  },
  deleteConfirmContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteMessageContainer: {
    flex: 1,
  },
  deleteSlideButton: {
    opacity: 0.7,
  },
  confirmButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 60,
    backgroundColor: 'transparent', // Şeffaf arka plan
    borderWidth: 2, // Çerçeve
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    marginLeft: 0, // marginLeft'i sıfırla
  },
  yesButton: {
    borderColor: '#666666', // Koyu gri çerçeve
  },
  noButton: {
    borderColor: '#e0af92', // Vurgu rengi çerçeve
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0af92',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  signInIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  googleSignInButton: {
    backgroundColor: '#e0af92',
  },
  appleSignInButton: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#333333',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 20,
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
  },
  madeWithText: {
    fontSize: 12,
    color: '#666666',
  },
  naberlaIcon: {
    width: 40,
    height: 16,
    opacity: 0.7,
    marginLeft: 4,
  },
  heartIconSmall: {
    width: 16,
    height: 16,
    opacity: 0.8,
    marginRight: 4,
  },
});
