import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, RefreshControl, StatusBar, Alert } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { playlistService } from '@/services/playlistService';
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
      const allPlaylists = await playlistService.getPlaylists();
      setPlaylists(allPlaylists);
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
            onPress={() => router.push('/(tabs)/')}
          >
            <IconSymbol name="chevron.left" size={24} color="#e0af92" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>My Playlists</ThemedText>
        </ThemedView>
        <ThemedView style={styles.headerStats}>
          <ThemedText style={styles.playlistCount}>
            {playlists.length} playlist
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
          <ThemedText style={styles.emptyTitle}>No playlists yet</ThemedText>
          <ThemedText style={styles.emptyText}>
            Create playlists to organize your videos
          </ThemedText>
          <TouchableOpacity 
            style={styles.createPlaylistButton}
            onPress={handleCreatePlaylist}
          >
            <IconSymbol name="plus" size={20} color="white" />
            <ThemedText style={styles.createPlaylistButtonText}>
              Create Your First Playlist
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <FlatList
          data={playlists}
          renderItem={renderPlaylistItem}
          keyExtractor={(item) => item.id}
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
        />
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
    paddingTop: 60, // Safe area
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
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
    gap: 20, // Aralarında boşluk
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
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
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
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  playlistList: {
    padding: 20,
  },
});