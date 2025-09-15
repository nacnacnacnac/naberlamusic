import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CustomIcon } from '@/components/ui/CustomIcon';
import { hybridPlaylistService } from '@/services/hybridPlaylistService';
import { Playlist } from '@/types/playlist';
import SwipeablePlaylistItem from '@/components/SwipeablePlaylistItem';

interface PlaylistModalProps {
  onClose: () => void;
  onCreatePlaylist?: (videoId?: string, videoTitle?: string) => void;
  refreshTrigger?: number; // Playlist'leri yenilemek için trigger
}

export default function PlaylistModal({ onClose, onCreatePlaylist, refreshTrigger }: PlaylistModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  useEffect(() => {
    loadPlaylists();
  }, []);

  // refreshTrigger değiştiğinde playlist'leri yenile
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadPlaylists();
    }
  }, [refreshTrigger]);

  const loadPlaylists = async () => {
    try {
      setIsLoading(true);
      // Web için local storage'dan playlist'leri al
      const localPlaylists = await hybridPlaylistService.getUserPlaylists();
      console.log('🌐 Loaded local playlists for modal:', localPlaylists.length);
      setPlaylists(localPlaylists);
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
    if (Platform.OS === 'web' && onCreatePlaylist) {
      onCreatePlaylist('', '');
    } else {
      router.push({
        pathname: '/create-playlist',
        params: { videoId: '', videoTitle: '' }
      });
      onClose();
    }
  };

  const handlePlaylistPress = (playlist: Playlist) => {
    if (Platform.OS === 'web') {
      // Web'de modal içinde göster
      setSelectedPlaylist(playlist);
    } else {
      // Native'de ayrı sayfaya git
      router.push({
        pathname: '/playlist-detail',
        params: { playlistId: playlist.id }
      });
      onClose();
    }
  };

  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <SwipeablePlaylistItem
      playlist={item}
      onPress={() => handlePlaylistPress(item)}
      onDelete={() => loadPlaylists()} // Refresh playlist'leri
    />
  );

  // Playlist detail görünümü
  if (selectedPlaylist && Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedView style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setSelectedPlaylist(null)}
            >
              <CustomIcon name="chevron-left" size={24} color="#e0af92" />
            </TouchableOpacity>
            <ThemedText style={styles.headerTitle}>{selectedPlaylist.name}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.headerStats}>
            <ThemedText style={styles.playlistCount}>
              {selectedPlaylist.videos?.length || 0} video{(selectedPlaylist.videos?.length || 0) !== 1 ? 's' : ''}
            </ThemedText>
          </ThemedView>
        </ThemedView>
        
        {/* Content */}
        <View style={styles.contentArea}>
          <ScrollView
            style={styles.flatList}
            contentContainerStyle={styles.playlistList}
            showsVerticalScrollIndicator={false}
          >
            {selectedPlaylist.videos && selectedPlaylist.videos.length > 0 ? (
              selectedPlaylist.videos.map((video, index) => (
                <View key={video.id || index} style={styles.videoItem}>
                  <Image 
                    source={{ uri: video.thumbnail || 'https://via.placeholder.com/60x40' }}
                    style={styles.videoThumbnail}
                    contentFit="cover"
                  />
                  <View style={styles.videoInfo}>
                    <ThemedText style={styles.videoTitle} numberOfLines={2}>
                      {video.title || video.name || 'Unknown Video'}
                    </ThemedText>
                    {video.duration && (
                      <ThemedText style={styles.videoDuration}>
                        {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                      </ThemedText>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <ThemedView style={styles.centerContent}>
                <ThemedText style={styles.emptyText}>No videos in this playlist</ThemedText>
              </ThemedView>
            )}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onClose}
          >
            <CustomIcon name="chevron-right" size={24} color="#e0af92" />
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
      
      {/* Content */}
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
            <CustomIcon name="plus" size={20} color="#000000" />
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
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 5,
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
    justifyContent: 'flex-end',
    gap: 10,
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
    borderColor: '#e0af92',
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
    marginBottom: 20,
    tintColor: '#e0af92',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
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
    marginTop: 10,
  },
  createPlaylistButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  flatList: {
    flex: 1,
  },
  playlistList: {
    padding: 20,
    paddingBottom: 40,
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  videoThumbnail: {
    width: 60,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#333333',
    marginRight: 12,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 4,
  },
  videoDuration: {
    fontSize: 12,
    color: '#888888',
  },
});
