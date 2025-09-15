import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, ScrollView, TouchableOpacity, RefreshControl, StatusBar, Alert, Platform, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect, Stack } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { CustomIcon } from '@/components/ui/CustomIcon';
import { hybridPlaylistService } from '@/services/hybridPlaylistService';
import { Playlist } from '@/types/playlist';
import SwipeablePlaylistItem from '@/components/SwipeablePlaylistItem';
import { useAuth } from '@/contexts/AuthContext';

export default function PlaylistsScreen() {
  const { user, isAuthenticated, signIn } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  // Only reload playlists if they're empty (cache-first approach)
  useFocusEffect(
    React.useCallback(() => {
      if (playlists.length === 0) {
        loadPlaylists();
      }
    }, [playlists.length])
  );

  const handleGoogleSignIn = async () => {
    try {
      console.log('🔍 Google Sign-In from playlists...');
      const user = await signIn('google');
      console.log('✅ Google sign-in completed:', user);
      // Note: Playlists will auto-refresh via cache mechanism
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
      console.log('🍎 Apple Sign-In from playlists...');
      const user = await signIn('apple');
      console.log('✅ Apple sign-in completed:', user);
      // Note: Playlists will auto-refresh via cache mechanism
    } catch (error: any) {
      console.error('❌ Apple sign-in error:', error);
      Alert.alert(
        'Apple Sign In Failed',
        error.message || 'Failed to sign in with Apple'
      );
    }
  };

  const loadPlaylists = async () => {
    try {
      setIsLoading(true);
      // Web'de local storage'dan playlist'leri yükle, native'de user playlists
      if (Platform.OS === 'web') {
        // Web için local storage'dan playlist'leri al
        const localPlaylists = await hybridPlaylistService.getUserPlaylists();
        console.log('🌐 Loaded local playlists for web:', localPlaylists.length);
        setPlaylists(localPlaylists);
      } else {
        // Native için normal user playlists
        const userPlaylists = await hybridPlaylistService.getUserPlaylists();
        console.log('📱 Loaded user playlists for videos screen:', userPlaylists.length);
        setPlaylists(userPlaylists);
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
      Alert.alert('Hata', 'Playlist\'ler yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPlaylists();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreatePlaylist = () => {
    router.push({
      pathname: '/create-playlist',
      params: { videoId: '', videoTitle: '' }
    });
  };

  const handlePlaylistPress = (playlist: Playlist) => {
    router.push({
      pathname: '/playlist-detail',
      params: { playlistId: playlist.id }
    });
  };

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <SwipeablePlaylistItem
      playlist={item}
      onPress={() => handlePlaylistPress(item)}
      onDelete={() => loadPlaylists()} // Refresh playlist'leri
    />
  );

  // Loading durumu
  if (isLoading && playlists.length === 0) {
    return (
      <View style={[styles.container, styles.darkContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ThemedView style={styles.centerContent}>
          <IconSymbol name="arrow.clockwise" size={48} color="#e0af92" />
          <ThemedText style={styles.loadingText}>Loading playlists...</ThemedText>
        </ThemedView>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.darkContainer]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <CustomIcon name="chevron-left" size={24} color="#e0af92" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>My Playlists</ThemedText>
        </ThemedView>
        <ThemedView style={styles.headerStats}>
          <ThemedText style={styles.playlistCount}>
            {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
          </ThemedText>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={handleCreatePlaylist}
          >
            <CustomIcon name="plus" size={16} color="#e0af92" />
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
      
      {false ? ( // Web'de authentication bypass
        <ThemedView style={styles.centerContent}>
          <Image 
            source={require('@/assets/images/playlist.svg')}
            style={styles.playlistIcon}
            contentFit="contain"
          />
          <ThemedText style={styles.emptyTitle}>My Playlists</ThemedText>
          <ThemedText style={styles.emptyText}>
            Sign in to create and manage your personal playlists
          </ThemedText>
          
          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={[styles.createPlaylistButton, styles.googleSignInButton]}
            onPress={handleGoogleSignIn}
          >
            <Image
              source={require('@/assets/images/google.svg')}
              style={styles.signInIcon}
              contentFit="contain"
            />
            <ThemedText style={styles.createPlaylistButtonText}>Sign in with Google</ThemedText>
          </TouchableOpacity>

          {/* Apple Sign-In Button - Only on iOS */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.createPlaylistButton, styles.appleSignInButton]}
              onPress={handleAppleSignIn}
            >
              <IconSymbol name="apple.logo" size={20} color="#ffffff" />
              <ThemedText style={[styles.createPlaylistButtonText, { color: '#ffffff' }]}>
                Sign in with Apple
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      ) : (Platform.OS !== 'web' && playlists.length === 0) ? (
        <ThemedView style={styles.centerContent}>
          <Image 
            source={require('@/assets/images/playlist.svg')}
            style={styles.playlistIcon}
            contentFit="contain"
          />
          <ThemedText style={styles.emptyTitle}>Looks a little quiet.</ThemedText>
          <ThemedText style={styles.emptyText}>
            Create awesome playlist to organize your music
          </ThemedText>
          <TouchableOpacity 
            style={styles.createPlaylistButton}
            onPress={handleCreatePlaylist}
          >
            <IconSymbol name="plus" size={20} color="#000000" />
            <ThemedText style={styles.createPlaylistButtonText}>
              Create Your Playlist
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <View style={styles.contentArea}>
          <ScrollView
            style={styles.flatList}
            contentContainerStyle={styles.playlistList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#e0af92']}
                tintColor="#e0af92"
              />
            }
          >
            {playlists.map((item) => (
              <React.Fragment key={item.id}>
                {renderPlaylistItem({ item })}
              </React.Fragment>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? '100vh' : undefined,
  },
  darkContainer: {
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50, // Safe area azaltıldı
    paddingBottom: 15, // Alt padding de azaltıldı
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a', // Daha koyu gri çizgi
    flexShrink: 0, // Header sabit boyutta kalsın
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 5, // My Playlists ve ok daha yakın
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end', // Sağa hizala
    gap: 10, // + iconu biraz daha yanaşsın
  },
  playlistCount: {
    color: '#e0af92',
    fontSize: 16,
  },
  createButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  playlistIcon: {
    width: 80,
    height: 80,
  },
  loadingText: {
    color: '#e0af92',
    fontSize: 18,
    marginTop: 20,
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
    color: '#666666', // Koyu gri
    fontSize: 14, // Küçültüldü
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 18, // Line height da küçültüldü
  },
  createPlaylistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0af92',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  createPlaylistButtonText: {
    color: '#000000', // Siyah yazı
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  signInIcon: {
    width: 20,
    height: 20,
  },
  googleSignInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0af92',
    marginBottom: 15,
  },
  appleSignInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 15,
  },
  webSignInMessage: {
    alignItems: 'center',
    marginTop: 20,
  },
  webSignInText: {
    color: '#999999',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  backToMainButton: {
    backgroundColor: '#e0af92',
    marginTop: 10,
  },
  playlistList: {
    padding: 20,
    paddingBottom: 40,
  },
  flatList: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#000000',
    minHeight: Platform.OS === 'web' ? '80vh' : undefined,
  },
});