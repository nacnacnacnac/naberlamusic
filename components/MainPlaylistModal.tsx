import CreatePlaylistModal from '@/components/CreatePlaylistModal';
import { ThemedText } from '@/components/ThemedText';
import { CustomIcon } from '@/components/ui/CustomIcon';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { firestoreService } from '@/services/firestoreService';
import { hybridPlaylistService } from '@/services/hybridPlaylistService';
import { Image as ExpoImage } from 'expo-image';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Animated, Image, Platform, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

// CSS animasyonunu kaldırdık - React Animated kullanıyoruz

interface MainPlaylistModalProps {
  onClose: () => void;
  userPlaylists: any[];
  expandedPlaylists: Set<string>;
  onTogglePlaylistExpansion: (playlistId: string) => void;
  onPlayVideo: (video: any, playlistContext?: {playlistId: string, playlistName: string}) => void;
  currentVideo: any;
  onRefresh: () => void;
  refreshing: boolean;
  refreshTrigger?: number;
  onCreatePlaylist?: (videoId?: string, videoTitle?: string) => void;
  initialView?: 'main' | 'selectPlaylist' | 'createPlaylist' | 'profile';
  disableAutoSwitch?: boolean;
  autoCloseOnPlay?: boolean; // Şarkı çalınca modal'ı otomatik kapat
}

const MainPlaylistModal = forwardRef<any, MainPlaylistModalProps>(({
  onClose,
  userPlaylists,
  expandedPlaylists,
  onTogglePlaylistExpansion,
  onPlayVideo,
  currentVideo,
  onRefresh,
  refreshing,
  refreshTrigger,
  onCreatePlaylist,
  initialView = 'main',
  disableAutoSwitch = false,
  autoCloseOnPlay = false
}, ref) => {
  const { user, displayName, signOut, signIn, isAuthenticated } = useAuth();
  const playlistScrollRef = useRef<ScrollView>(null);
  const [hoveredVideo, setHoveredVideo] = React.useState<string | null>(null);
  const [currentView, setCurrentView] = React.useState<'main' | 'selectPlaylist' | 'createPlaylist' | 'profile'>(initialView);
  const [selectedVideoForPlaylist, setSelectedVideoForPlaylist] = React.useState<any>(null);
  const [userPlaylistsForSelection, setUserPlaylistsForSelection] = React.useState<any[]>([]);
  const [deletedPlaylistIds, setDeletedPlaylistIds] = React.useState<Set<string>>(new Set());
  const [deletingPlaylistId, setDeletingPlaylistId] = React.useState<string | null>(null);
  const [fadingVideos, setFadingVideos] = React.useState<Set<string>>(new Set());
  const fadeAnimations = useRef<{[key: string]: Animated.Value}>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  
  // Shimmer animasyonu için
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  // Shimmer animasyonunu başlat - performans optimized
  React.useEffect(() => {
    const startShimmer = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnimation, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: false, // Web'de background için false gerekli
          }),
          Animated.delay(2000), // Daha uzun bekleme - daha az sıklık
        ])
      ).start();
    };
    startShimmer();
    
    // Component unmount olduğunda animasyonu durdur
    return () => {
      shimmerAnimation.stopAnimation();
    };
  }, [shimmerAnimation]);

  // Auto-switch to main view when user signs in (only if they were in profile for sign-in)
  const [hasAutoSwitched, setHasAutoSwitched] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);
  
  // Expose resetToMain method to parent
  useImperativeHandle(ref, () => ({
    resetToMain: () => {
      setCurrentView('main');
      setHasAutoSwitched(false);
      setIsInitialized(false); // Reset initialization flag
    }
  }));
  
  // Update currentView when initialView changes
  React.useEffect(() => {
    setCurrentView(initialView);
    setIsInitialized(true);
  }, [initialView]);
  

  // Track previous authentication state to detect sign-in
  const [wasAuthenticated, setWasAuthenticated] = React.useState(isAuthenticated);
  
  React.useEffect(() => {
    // Only auto-switch if user just signed in (was not authenticated, now is) AND auto-switch is not disabled
    if (!wasAuthenticated && isAuthenticated && currentView === 'profile' && !hasAutoSwitched && !disableAutoSwitch) {
      console.log('✅ User just signed in, switching to main playlist view');
      setCurrentView('main');
      setHasAutoSwitched(true);
    }
    setWasAuthenticated(isAuthenticated);
  }, [isAuthenticated, currentView, hasAutoSwitched, wasAuthenticated, disableAutoSwitch]);

  // Reset modal state when it closes
  const handleModalClose = () => {
    setCurrentView('main');
    setHasAutoSwitched(false);
    onClose();
  };

  // Profile functions
  const handleSignOut = async () => {
    if (!signOut) {
      console.error('❌ signOut function is not available');
      return;
    }

    try {
      await signOut();
      setCurrentView('main');
      setHasAutoSwitched(false); // Reset auto-switch flag for next sign-in
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      console.log('🔍 Google Sign-In from profile...');
      await signIn('google');
      // After successful sign in, automatically go to main playlist view
      setCurrentView('main');
    } catch (error: any) {
      console.error('❌ Google sign-in error:', error);
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Failed to sign in with Google');
      } else {
        // Alert.alert('Google Sign In Failed', error.message || 'Failed to sign in with Google');
      }
    }
  };

  const handleAppleSignIn = async () => {
    try {
      console.log('🍎 Apple Sign-In from profile...');
      await signIn('apple');
      // After successful sign in, automatically go to main playlist view
      setCurrentView('main');
    } catch (error: any) {
      console.error('❌ Apple sign-in error:', error);
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Failed to sign in with Apple');
      } else {
        // Alert.alert('Apple Sign In Failed', error.message || 'Failed to sign in with Apple');
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
      setCurrentView('main');
    } catch (error) {
      console.error('❌ Account deletion failed:', error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  // refreshTrigger değiştiğinde playlist'leri yenile
  React.useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      // Clear deleted playlist IDs when refreshing
      setDeletedPlaylistIds(new Set());
      onRefresh();
    }
  }, [refreshTrigger]);

  const handleAddToUserPlaylist = async (playlist: any) => {
    if (!selectedVideoForPlaylist) return;

    try {
      // Create synthetic video object
      const syntheticVideo = {
        id: selectedVideoForPlaylist.id,
        name: selectedVideoForPlaylist.title,
        title: selectedVideoForPlaylist.title,
        description: '',
        duration: 0,
        thumbnail: selectedVideoForPlaylist.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=',
        videoUrl: '',
        embedUrl: `https://player.vimeo.com/video/${selectedVideoForPlaylist.id}`,
        createdAt: '',
        plays: 0,
        likes: 0,
        embed: {
          html: `<iframe src="https://player.vimeo.com/video/${selectedVideoForPlaylist.id}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
        },
        pictures: {
          sizes: [{ link: selectedVideoForPlaylist.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=' }]
        }
      };

      await hybridPlaylistService.addVideoToPlaylist(playlist.id, syntheticVideo);
      
      // Başarılı, ana view'a dön ve refresh et
      setCurrentView('main');
      onRefresh();
    } catch (error: any) {
      console.error('Error adding video to playlist:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to add video to playlist');
      }
    }
  };

  // Profile View
  if (currentView === 'profile') {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileHeaderLeft}>
            <View style={styles.profileHeaderIconContainer}>
              <Image
                source={require('@/assets/images/profile2.png')}
                style={styles.profileHeaderIcon}
                resizeMode="contain"
              />
            </View>
            <ThemedText style={styles.profileHeaderTitle}>Profile</ThemedText>
          </View>
          <View style={styles.profileHeaderRight}>
            <TouchableOpacity 
              style={styles.profileBackButton}
              onPress={() => setCurrentView('main')}
              activeOpacity={0.7}
            >
              <Image 
                source={require('@/assets/images/ok_left.png')}
                style={{ width: 20, height: 20, tintColor: '#e0af92' }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.profileMainContent}>
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
                <ThemedText style={styles.welcomeUserText}>
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

              {/* Menu Items - Alt alta butonlar */}
              <View style={styles.menuSection}>
                {!showDeleteConfirm ? (
                  <View style={styles.buttonColumn}>
                    <TouchableOpacity 
                      style={[styles.menuButton, styles.signOutButton, styles.fullWidthButton]}
                      onPress={handleSignOut}
                      activeOpacity={0.7}
                    >
                      <CustomIcon name="logout" size={20} color="#000000" />
                      <ThemedText style={[styles.menuButtonText, { color: '#000000' }]}>
                        Sign Out
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.menuButton, styles.deleteAccountButton, styles.fullWidthButton]}
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
              {/* LA Bebe Mode */}
              <View style={styles.guestSection}>
                <ExpoImage
                  source={require('@/assets/images/animation/heart.png')}
                  style={styles.heartIcon}
                  contentFit="contain"
                />
                <View style={styles.guestTitleContainer}>
                  <ThemedText style={styles.guestTitleWhite}>Welcome to</ThemedText>
                  <ThemedText style={styles.guestTitle}>Naber LA</ThemedText>
                </View>
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
                        backgroundColor: '#000000',
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
                  <ThemedText style={[styles.signInButtonText, { color: '#000000' }]}>Sign in with Google</ThemedText>
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

  // Create Playlist View
  if (currentView === 'createPlaylist') {
    return (
      <CreatePlaylistModal
        onClose={() => setCurrentView('main')}
        onSuccess={() => {
          setCurrentView('main');
          onRefresh();
        }}
        videoId={selectedVideoForPlaylist?.id}
        videoTitle={selectedVideoForPlaylist?.title}
      />
    );
  }

  // Select Playlist View
  if (currentView === 'selectPlaylist' && selectedVideoForPlaylist) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setCurrentView('main')}
            activeOpacity={0.7}
          >
            <Image 
              source={require('@/assets/images/ok_left.png')}
              style={{ width: 20, height: 20, tintColor: '#e0af92' }}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Add to Playlist</ThemedText>
          <View style={styles.headerRight} />
        </View>

        {/* Video Info */}
        <View style={styles.videoInfoSection}>
          <ExpoImage 
            source={{ uri: selectedVideoForPlaylist.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij7wn46xPC90ZXh0Pjwvc3ZnPg==' }}
            style={styles.selectedVideoThumbnail}
            contentFit="cover"
          />
          <View style={styles.selectedVideoInfo}>
            <ThemedText style={styles.selectedVideoTitle} numberOfLines={2}>
              {selectedVideoForPlaylist.title}
            </ThemedText>
          </View>
        </View>

        {/* Playlists */}
        <ScrollView style={styles.selectPlaylistScroll} showsVerticalScrollIndicator={false}>
          {/* Create New Playlist */}
          <TouchableOpacity 
            style={styles.createNewPlaylistItem}
            onPress={() => {
              setCurrentView('createPlaylist');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.createPlaylistIcon}>
              <CustomIcon name="plus" size={20} color="#e0af92" />
            </View>
            <View style={styles.createPlaylistInfo}>
              <ThemedText style={styles.createPlaylistTitle}>Create New Playlist</ThemedText>
              <ThemedText style={styles.createPlaylistSubtitle}>Create a new playlist for this video</ThemedText>
            </View>
            <Image 
              source={require('@/assets/images/ok_right.png')}
              style={{ width: 16, height: 16, tintColor: '#666666' }}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* User Playlists */}
          {userPlaylistsForSelection.map((playlist) => (
            <TouchableOpacity
              key={playlist.id}
              style={styles.selectPlaylistItem}
              onPress={() => handleAddToUserPlaylist(playlist)}
              activeOpacity={0.7}
            >
              <View style={styles.selectPlaylistIcon}>
                <CustomIcon name="heart" size={20} color="#e0af92" />
              </View>
              <View style={styles.selectPlaylistInfo}>
                <ThemedText style={styles.selectPlaylistName} numberOfLines={1}>
                  {playlist.name}
                </ThemedText>
                <ThemedText style={styles.selectPlaylistCount}>
                  {playlist.videos?.length || 0} video{(playlist.videos?.length || 0) !== 1 ? 's' : ''}
                </ThemedText>
              </View>
              <CustomIcon name="plus" size={16} color="#666666" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Handle playlist deletion
  const handleDeletePlaylist = async (playlistId: string, playlistName: string) => {
    try {
      console.log('🗑️ Deleting playlist:', playlistId, playlistName);
      
      // Show deleting state
      setDeletingPlaylistId(playlistId);
      
      await hybridPlaylistService.deletePlaylist(playlistId);
      
      // Immediately hide from UI
      setDeletedPlaylistIds(prev => {
        const newSet = new Set([...prev, playlistId]);
        console.log('🔍 Updated deletedPlaylistIds:', Array.from(newSet));
        return newSet;
      });
      setDeletingPlaylistId(null);
      
      // Force refresh with cache bypass
      setTimeout(async () => {
        try {
          // Force a complete refresh by calling the service directly
          const currentUser = authService.getCurrentUser();
          if (currentUser?.uid) {
            await firestoreService.getUserPlaylists(currentUser.uid);
          }
        } catch (error) {
          console.error('❌ Error in forced refresh:', error);
        }
        // Clear deleted IDs before refresh to show fresh data
        setDeletedPlaylistIds(new Set());
        
        // Force clear any cached data that might contain the deleted playlist
        await hybridPlaylistService.clearAllCaches();
        
        onRefresh();
      }, 500); // Increased delay to ensure Firestore consistency
      
    } catch (error) {
      console.error('❌ Error deleting playlist:', error);
      setDeletingPlaylistId(null);
      if (Platform.OS === 'web') {
        window.alert(`Failed to delete playlist: ${error.message}`);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Profile Section - Always show, content changes based on auth status */}
      <TouchableOpacity 
        onPress={() => {
          console.log('👤 Profile section clicked, current view:', currentView);
          setCurrentView('profile');
        }}
        activeOpacity={0.7}
      >
        <View style={styles.profileSection}>
          {/* Shimmer overlay */}
          <Animated.View
            style={[
              styles.shimmerOverlay,
              {
                transform: [{
                  translateX: shimmerAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-400, 400], // Soldan sağa kayma
                  })
                }],
                opacity: shimmerAnimation.interpolate({
                  inputRange: [0, 0.3, 0.7, 1],
                  outputRange: [0, 1, 1, 0], // Yumuşak fade in/out
                })
              }
            ]}
          />
        <View style={styles.profileLeft}>
          <View style={styles.profileIconContainer}>
            <Image
              source={require('@/assets/images/profile2.png')}
              style={styles.profileAvatarRound}
              resizeMode="contain"
            />
          </View>
          <ThemedText style={[
            styles.welcomeText, 
            { color: '#666666' } // Hem LA Bebe hem de kullanıcı adı için koyu gri
          ]}>
            {isAuthenticated && user ? (
              (() => {
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
              })()
            ) : 'LA Bebe'}
          </ThemedText>
        </View>
        <View style={styles.profileRight}>
          <TouchableOpacity 
            style={styles.closeButtonInProfile}
            onPress={handleModalClose}
            activeOpacity={0.7}
          >
            <Image 
              source={require('@/assets/images/ok_left.png')}
              style={{ width: 20, height: 20, tintColor: '#e0af92' }}
              resizeMode="contain"
            />
           </TouchableOpacity>
         </View>
        </View>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <ThemedText style={styles.headerTitle}>Playlists</ThemedText>
        <TouchableOpacity 
          style={styles.headerRight}
          onPress={() => {
            console.log('➕ Plus button pressed - isAuthenticated:', isAuthenticated);
            if (isAuthenticated) {
              setCurrentView('createPlaylist');
            } else {
              setCurrentView('profile');
            }
          }}
          activeOpacity={0.7}
        >
          <CustomIcon name="plus" size={20} color="#e0af92" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        ref={playlistScrollRef}
        style={styles.playlistArea}
        contentContainerStyle={styles.playlistScrollContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e0af92"
            colors={['#e0af92']}
          />
        }
      >
        {/* Background Loading State - Always visible when no playlists */}
        {userPlaylists.length === 0 && (
          <View style={styles.backgroundLoadingContainer}>
            {Platform.OS === 'web' ? (
              <div style={{ 
                textAlign: 'center',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1
              }}>
                <img 
                  src="/loading.gif" 
                  style={{
                    width: '60px',
                    height: '60px',
                    marginBottom: '15px',
                    display: 'block',
                    margin: '0 auto 15px auto'
                  }}
                  alt="Loading..."
                />
                <div style={{ 
                  color: 'white', 
                  fontSize: '16px',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontWeight: '500'
                }}>
                  Loading playlists...
                </div>
              </div>
            ) : (
              <>
                <ExpoImage 
                  source={require('@/assets/loading.gif')} 
                  style={styles.backgroundLoadingGif}
                  contentFit="contain"
                />
                <ThemedText style={styles.backgroundLoadingText}>
                  Loading playlists...
                </ThemedText>
              </>
            )}
          </View>
        )}

        {/* Admin Panel Playlists */}
        {userPlaylists.filter(playlist => {
          const isDeleted = deletedPlaylistIds.has(playlist.id);
          if (isDeleted) {
            console.log('🔍 Filtering out deleted playlist:', playlist.id, playlist.name);
          }
          return !isDeleted;
        }).sort((a, b) => {
          // "NABER LA AI" playlist always comes first in admin playlists
          if (a.name === 'NABER LA AI' && b.name !== 'NABER LA AI') return -1;
          if (b.name === 'NABER LA AI' && a.name !== 'NABER LA AI') return 1;
          
          // Keep original order for other playlists
          return 0;
        }).map((playlist, playlistIndex) => {
          const isLastPlaylist = playlistIndex === userPlaylists.length - 1;
          return (
          <View key={playlist.id} style={styles.userPlaylistContainer}>
            <View 
              style={[
                styles.playlistHeaderContainer,
                Platform.OS === 'web' && { className: 'playlist-header-container' }
              ]}
            >
              <TouchableOpacity 
                style={styles.playlistHeader}
                onPress={() => onTogglePlaylistExpansion(playlist.id)}
                activeOpacity={0.7}
              >
                <View style={styles.playlistTitleContainer}>
                  <ExpoImage 
                    source={require('@/assets/images/playlist.svg')}
                    style={styles.playlistHeaderIcon}
                    contentFit="contain"
                  />
                  <ThemedText style={styles.playlistTitle}>{playlist.name}</ThemedText>
                </View>
                
                <View style={styles.playlistRightActions}>
                  {/* Inline Toast - Show when deleting */}
                  {deletingPlaylistId === playlist.id && (
                    <View style={styles.inlineToast}>
                      <ThemedText style={styles.toastText}>Deleting...</ThemedText>
                    </View>
                  )}
                  
                  {/* Delete Button - Only for user playlists, in circle before arrow */}
                  {!playlist.isAdminPlaylist && (
                    <TouchableOpacity 
                      style={[
                        styles.deletePlaylistButtonCircle,
                        Platform.OS === 'web' && { 
                          className: 'playlist-delete-button'
                        }
                      ]}
                      onPress={(e) => {
                        e.stopPropagation(); // Prevent playlist expansion
                        handleDeletePlaylist(playlist.id, playlist.name);
                      }}
                      activeOpacity={0.7}
                      disabled={deletingPlaylistId === playlist.id}
                    >
                      <ThemedText style={styles.minusText}>−</ThemedText>
                    </TouchableOpacity>
                  )}
                  
                  <Image 
                    source={expandedPlaylists.has(playlist.id) 
                      ? require('@/assets/images/ok_down.png')
                      : require('@/assets/images/ok_right.png')
                    }
                    style={{ 
                      width: 22, // 18'den 22'ye büyüttük
                      height: 22, 
                      tintColor: expandedPlaylists.has(playlist.id) ? "#e0af92" : "#666666" 
                    }}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
            </View>
            
            {expandedPlaylists.has(playlist.id) && (
              <ScrollView 
                style={[
                  styles.userPlaylistScroll,
                  expandedPlaylists.size === 1 && styles.userPlaylistScrollExpanded
                ]}
                showsVerticalScrollIndicator={false}
                scrollEnabled={true}
                nestedScrollEnabled={true}
              >
                {playlist.videos && playlist.videos.length > 0 ? (
                  <>
                    {playlist.videos.map((playlistVideo: any, index: number) => {
                      const videoKey = `${playlist.id}-${playlistVideo.vimeo_id || playlistVideo.id}`;
                      
                      // Don't render videos that are being deleted
                      if (fadingVideos.has(videoKey)) {
                        return null;
                      }
                      
                      // Initialize fade animation if not exists
                      if (!fadeAnimations.current[videoKey]) {
                        fadeAnimations.current[videoKey] = new Animated.Value(1);
                      }
                      
                      return (
                        <Animated.View
                          key={`${playlist.id}-${playlistVideo.id}`}
                          style={[
                            styles.playlistItem,
                            ((currentVideo?.id && playlistVideo.id && currentVideo.id === playlistVideo.id) || 
                             (currentVideo?.id && playlistVideo.vimeo_id && currentVideo.id === playlistVideo.vimeo_id) ||
                             (currentVideo?.vimeo_id && playlistVideo.id && currentVideo.vimeo_id === playlistVideo.id) ||
                             (currentVideo?.vimeo_id && playlistVideo.vimeo_id && currentVideo.vimeo_id === playlistVideo.vimeo_id)) && styles.currentPlaylistItem,
                            {
                              opacity: fadeAnimations.current[videoKey]
                            }
                          ]}
                          onMouseEnter={() => Platform.OS === 'web' && setHoveredVideo(`${playlist.id}-${playlistVideo.id}`)}
                          onMouseLeave={() => Platform.OS === 'web' && setHoveredVideo(null)}
                        >
                        <TouchableOpacity
                          style={styles.videoTouchable}
                          onPress={() => {
                            // Use vimeo_id if available, otherwise try to find by UUID
                            const vimeoIdToUse = playlistVideo.vimeo_id || playlistVideo.id;
                            const syntheticVideo = {
                              id: vimeoIdToUse,
                              name: playlistVideo.title,
                              title: playlistVideo.title,
                              description: '',
                              duration: playlistVideo.duration || 0,
                              thumbnail: playlistVideo.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=',
                              videoUrl: '',
                              embedUrl: `https://player.vimeo.com/video/${vimeoIdToUse}`,
                              createdAt: '',
                              plays: 0,
                              likes: 0,
                              embed: {
                                html: `<iframe src="https://player.vimeo.com/video/${vimeoIdToUse}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
                              },
                              pictures: {
                                sizes: [{ link: playlistVideo.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=' }]
                              }
                            };
                            
                            onPlayVideo(syntheticVideo, {
                              playlistId: playlist.id,
                              playlistName: playlist.name
                            });
                            
                            // Auto-close modal if enabled
                            if (autoCloseOnPlay) {
                              console.log('🎵 Auto-closing MainPlaylistModal after song selection');
                              setTimeout(() => {
                                onClose();
                              }, 500); // Kısa delay - video yüklenmeye başlayana kadar
                            }
                          }}
                          activeOpacity={0.7}
                        >
                        <ExpoImage 
                          source={{ uri: playlistVideo.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjU2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiM5OTkiPvCfjrE8L3RleHQ+PC9zdmc+' }}
                          style={styles.videoThumbnail}
                          contentFit="cover"
                        />
                        <View style={styles.videoInfo}>
                          {/* Artist Name - Extract from title (before " - ") */}
                          {playlistVideo.title.includes(' - ') ? (
                            <>
                              <ThemedText 
                                style={[
                                  styles.videoArtist,
                                  ((currentVideo?.id && playlistVideo.id && currentVideo.id === playlistVideo.id) || 
                                   (currentVideo?.id && playlistVideo.vimeo_id && currentVideo.id === playlistVideo.vimeo_id) ||
                                   (currentVideo?.vimeo_id && playlistVideo.id && currentVideo.vimeo_id === playlistVideo.id) ||
                                   (currentVideo?.vimeo_id && playlistVideo.vimeo_id && currentVideo.vimeo_id === playlistVideo.vimeo_id)) && styles.currentVideoArtist
                                ]} 
                                numberOfLines={1}
                              >
                                {playlistVideo.title.split(' - ')[0]}
                              </ThemedText>
                              <ThemedText 
                                style={[
                                  styles.videoSongName,
                                  ((currentVideo?.id && playlistVideo.id && currentVideo.id === playlistVideo.id) || 
                                   (currentVideo?.id && playlistVideo.vimeo_id && currentVideo.id === playlistVideo.vimeo_id) ||
                                   (currentVideo?.vimeo_id && playlistVideo.id && currentVideo.vimeo_id === playlistVideo.id) ||
                                   (currentVideo?.vimeo_id && playlistVideo.vimeo_id && currentVideo.vimeo_id === playlistVideo.vimeo_id)) && styles.currentVideoSongName
                                ]} 
                                numberOfLines={1}
                              >
                                {playlistVideo.title.split(' - ').slice(1).join(' - ')}
                              </ThemedText>
                            </>
                          ) : (
                            <ThemedText 
                              style={[
                                styles.videoTitle,
                                ((currentVideo?.id && playlistVideo.id && currentVideo.id === playlistVideo.id) || 
                                 (currentVideo?.id && playlistVideo.vimeo_id && currentVideo.id === playlistVideo.vimeo_id) ||
                                 (currentVideo?.vimeo_id && playlistVideo.id && currentVideo.vimeo_id === playlistVideo.id) ||
                                 (currentVideo?.vimeo_id && playlistVideo.vimeo_id && currentVideo.vimeo_id === playlistVideo.vimeo_id)) && styles.currentVideoTitle
                              ]} 
                              numberOfLines={2}
                            >
                              {playlistVideo.title}
                            </ThemedText>
                          )}
                        </View>
                        </TouchableOpacity>
                        
                        {/* + Button (Admin playlists) or - Button (User playlists) */}
                        {(Platform.OS !== 'web' || hoveredVideo === `${playlist.id}-${playlistVideo.id}`) && (
                          <TouchableOpacity
                            style={[
                              styles.addToPlaylistButton,
                              !playlist.isAdminPlaylist && styles.removeFromPlaylistButton // Gri background for user playlists
                            ]}
                            onPress={async () => {
                              const vimeoIdToUse = playlistVideo.vimeo_id || playlistVideo.id;
                              
                              if (playlist.isAdminPlaylist) {
                                // Admin playlist: Show add to user playlist modal
                                setSelectedVideoForPlaylist({
                                  id: vimeoIdToUse,
                                  title: playlistVideo.title,
                                  thumbnail: playlistVideo.thumbnail
                                });
                                
                                // User playlist'leri yükle
                                try {
                                  const userPlaylists = await hybridPlaylistService.getUserPlaylists();
                                  setUserPlaylistsForSelection(userPlaylists);
                                } catch (error) {
                                  console.error('Error loading user playlists:', error);
                                  setUserPlaylistsForSelection([]);
                                }
                                
                                setCurrentView('selectPlaylist');
                              } else {
                                // User playlist: Remove from playlist with fade animation
                                const videoKey = `${playlist.id}-${vimeoIdToUse}`;
                                
                                // Initialize fade animation if not exists
                                if (!fadeAnimations.current[videoKey]) {
                                  fadeAnimations.current[videoKey] = new Animated.Value(1);
                                }
                                
                                // Add to fading videos set
                                setFadingVideos(prev => new Set([...prev, videoKey]));
                                
                                // Start fade out animation
                                Animated.timing(fadeAnimations.current[videoKey], {
                                  toValue: 0,
                                  duration: 300,
                                  useNativeDriver: true,
                                }).start(async () => {
                                  // After animation, remove from backend
                                  try {
                                    await hybridPlaylistService.removeVideoFromPlaylist(playlist.id, vimeoIdToUse);
                                    
                                    // Remove from fading videos to hide the element immediately
                                    setFadingVideos(prev => {
                                      const newSet = new Set(prev);
                                      newSet.delete(videoKey);
                                      return newSet;
                                    });
                                    
                                    // Force refresh with delay for Firestore consistency
                                    setTimeout(() => {
                                      // Clear fading videos and animations before refresh to prevent empty spaces
                                      setFadingVideos(new Set());
                                      // Reset fade animation for this video
                                      if (fadeAnimations.current[videoKey]) {
                                        fadeAnimations.current[videoKey].setValue(1);
                                      }
                                      onRefresh(); // Refresh to show updated playlist
                                    }, 500);
                                  } catch (error) {
                                    console.error('❌ Error removing video from playlist:', error);
                                    // If error, fade back in
                                    Animated.timing(fadeAnimations.current[videoKey], {
                                      toValue: 1,
                                      duration: 200,
                                      useNativeDriver: true,
                                    }).start();
                                    setFadingVideos(prev => {
                                      const newSet = new Set(prev);
                                      newSet.delete(videoKey);
                                      return newSet;
                                    });
                                    if (Platform.OS === 'web') {
                                      window.alert('Failed to remove video from playlist');
                                    }
                                  }
                                });
                              }
                            }}
                            activeOpacity={0.8}
                          >
                            {playlist.isAdminPlaylist ? (
                              <CustomIcon 
                                name="plus" 
                                size={16} 
                                color="#e0af92" 
                              />
                            ) : (
                              <ThemedText style={{
                                fontSize: 20,
                                fontWeight: 'bold',
                                color: '#333333',
                                textAlign: 'center',
                                lineHeight: 16,
                              }}>
                                −
                              </ThemedText>
                            )}
                          </TouchableOpacity>
                        )}
                        </Animated.View>
                      );
                    })}
                    
                    {/* Spacer for last playlist */}
                    {isLastPlaylist && <View style={styles.lastPlaylistSpacer} />}
                  </>
                ) : (
                  <View style={styles.emptyPlaylistContainer}>
                    <ThemedText style={styles.emptyPlaylistText}>No videos in this playlist</ThemedText>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#0a0a0a', // Base background
    borderBottomWidth: 1,
    borderBottomColor: '#0a0a0a', // Diğer playlist'ler kadar koyu çizgi
    position: 'relative', // Overlay için
    overflow: 'hidden', // Shimmer'ın dışarı taşmasını engelle
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 800, // Çok çok geniş gradient
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'linear-gradient(90deg, transparent 0%, transparent 20%, rgba(32,32,32,0.1) 35%, rgba(32,32,32,0.3) 50%, rgba(32,32,32,0.1) 65%, transparent 80%, transparent 100%)',
    } : {
      backgroundColor: 'rgba(32, 32, 32, 0.1)', // Native fallback - neredeyse siyah gri
    }),
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    minWidth: 200, // Sabit minimum genişlik - büyüyüp küçülme efektini önler
  },
  closeButtonInProfile: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#101010', // Daha koyu gri
  },
  profileAvatar: {
    width: 32,
    height: 32,
  },
  profileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#101010', // Daha koyu gri
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarRound: {
    width: 24,
    height: 24,
  },
  profileRight: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 40,
  },
  welcomeText: {
    fontSize: 16,
    color: '#e0af92',
    fontWeight: '500',
  },
  profileMainContent: {
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
  heartIconSmall: {
    width: 16,
    height: 16,
    marginLeft: 4,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e0af92',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeUserText: {
    fontSize: 20,
    color: '#ffffff',
    textAlign: 'center',
  },
  guestTitleContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  guestTitleWhite: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e0af92',
    textAlign: 'center',
  },
  guestText: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  menuSection: {
    marginBottom: 40,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  buttonColumn: {
    flexDirection: 'column',
    gap: 15,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 50,
  },
  halfWidthButton: {
    flex: 1,
  },
  fullWidthButton: {
    width: '100%',
  },
  signOutButton: {
    backgroundColor: '#e0af92',
  },
  deleteAccountButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333333',
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteConfirmContainer: {
    gap: 15,
  },
  deleteMessageContainer: {
    alignItems: 'center',
  },
  deleteSlideButton: {
    width: '100%',
    opacity: 0.6,
  },
  confirmButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  confirmButton: {
    flex: 1,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  yesButton: {
    borderColor: '#666666',
  },
  noButton: {
    borderColor: '#e0af92',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 15,
    minHeight: 50,
  },
  googleSignInButton: {
    backgroundColor: '#e0af92',
  },
  appleSignInButton: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#333333',
  },
  signInIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  appInfoText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  madeWithContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  madeWithText: {
    fontSize: 14,
    color: '#666666',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#0a0a0a', // Tutarlı koyu çizgi
    backgroundColor: '#000000', // Siyah background
  },
  profileHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  profileBackButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#101010', // Daha koyu gri
  },
  profileHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff', // Beyaz renk
    textAlign: 'left',
  },
  profileHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 40,
  },
  profileHeaderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#101010', // Daha koyu gri
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderIcon: {
    width: 24,
    height: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  loadingGif: {
    width: 50,
    height: 50,
    marginBottom: 15,
  },
  loadingText: {
    fontSize: 16,
    color: '#e0af92',
    textAlign: 'center',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: '500',
  },
  backgroundLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  backgroundLoadingGif: {
    width: 60,
    height: 60,
    marginBottom: 15,
  },
  backgroundLoadingText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#0a0a0a', // Diğer playlist'ler kadar koyu çizgi
    backgroundColor: '#000000', // Siyah background
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e0af92',
    flex: 1,
    textAlign: 'left',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(224, 175, 146, 0.1)',
  },
  headerRight: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#101010', // Daha koyu gri - closeButtonInProfile ile aynı
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  playlistScrollContainer: {
    paddingBottom: 300, // Tüm platformlarda çok fazla padding
    minHeight: '100%', // Minimum yükseklik garanti et
  },
  userPlaylistContainer: {
    marginTop: 0,
  },
  playlistHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#0a0a0a', // Gerçekten koyu gri çizgi
  },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#000000',
    flex: 1,
  },
  deletePlaylistButton: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#000000',
  },
  deletePlaylistButtonInline: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
    borderRadius: 4,
  },
  playlistRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deletePlaylistButtonCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  minusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
  },
  expandButtonCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineToast: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  toastText: {
    fontSize: 12,
    color: '#e0af92',
    fontWeight: '500',
  },
  playlistTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playlistHeaderIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
    tintColor: '#e0af92',
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  userPlaylistScroll: {
    maxHeight: 500,
    backgroundColor: '#000000',
  },
  userPlaylistScrollExpanded: {
    maxHeight: 600,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0a0a0a', // Gerçekten koyu gri çizgi
    backgroundColor: '#000000',
    position: 'relative',
  },
  videoTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addToPlaylistButton: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#333333', // Koyu gri çerçeve
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  currentPlaylistItem: {
    backgroundColor: '#000000',
    borderLeftWidth: 3,
    borderLeftColor: '#e0af92',
  },
  videoThumbnail: {
    width: 60,
    height: 34,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: '#000000',
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
    marginBottom: 4,
    lineHeight: 18,
  },
  currentVideoTitle: {
    color: '#e0af92',
  },
  videoArtist: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
    marginBottom: 2,
    lineHeight: 16,
  },
  currentVideoArtist: {
    color: '#e0af92',
  },
  videoSongName: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666666', // Koyu gri
    lineHeight: 14,
  },
  currentVideoSongName: {
    color: '#999999', // Current şarkı için biraz daha açık gri
  },
  videoDuration: {
    fontSize: 12,
    color: '#999999',
  },
  emptyPlaylistContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyPlaylistText: {
    color: '#666666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  lastPlaylistSpacer: {
    height: 100,
  },
  // Select Playlist Styles
  videoInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#0a0a0a', // Gerçekten koyu gri çizgi
  },
  selectedVideoThumbnail: {
    width: 60,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#333333',
    marginRight: 12,
  },
  selectedVideoInfo: {
    flex: 1,
  },
  selectedVideoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  selectPlaylistScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  createNewPlaylistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0a0a0a', // Gerçekten koyu gri çizgi
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 10,
  },
  createPlaylistIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#e0af92',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  createPlaylistInfo: {
    flex: 1,
  },
  createPlaylistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  createPlaylistSubtitle: {
    fontSize: 14,
    color: '#888888',
  },
  selectPlaylistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0a0a0a', // Gerçekten koyu gri çizgi
  },
  selectPlaylistIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectPlaylistInfo: {
    flex: 1,
  },
  selectPlaylistName: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 4,
  },
  selectPlaylistCount: {
    fontSize: 14,
    color: '#888888',
  },
  removeFromPlaylistButton: {
    backgroundColor: 'transparent',
    borderColor: '#333333',
  },
});

export default MainPlaylistModal;
