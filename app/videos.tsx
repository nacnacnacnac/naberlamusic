import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, ScrollView, TouchableOpacity, RefreshControl, StatusBar, Alert } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { hybridPlaylistService } from '@/services/hybridPlaylistService';
import { Playlist } from '@/types/playlist';
import SwipeablePlaylistItem from '@/components/SwipeablePlaylistItem';

export default function PlaylistsScreen() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  // Sayfa focus olduğunda playlist'leri yenile
  useFocusEffect(
    React.useCallback(() => {
      loadPlaylists();
    }, [])
  );

  const loadPlaylists = async () => {
    try {
      setIsLoading(true);
      // Only show user's personal playlists in this screen
      const userPlaylists = await hybridPlaylistService.getUserPlaylists();
      console.log('📱 Loaded user playlists for videos screen:', userPlaylists.length);
      setPlaylists(userPlaylists);
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
      <ThemedView style={[styles.container, styles.darkContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ThemedView style={styles.centerContent}>
          <IconSymbol name="arrow.clockwise" size={48} color="#e0af92" />
          <ThemedText style={styles.loadingText}>Loading playlists...</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, styles.darkContainer]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color="#e0af92" />
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
            <IconSymbol name="plus" size={16} color="#e0af92" />
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
      
      {playlists.length === 0 ? (
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
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  playlistList: {
    padding: 20,
    paddingBottom: 40,
  },
  flatList: {
    flex: 1,
  },
});