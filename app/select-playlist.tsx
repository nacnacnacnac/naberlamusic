import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { hybridPlaylistService } from '@/services/hybridPlaylistService';
import { useVimeo } from '@/contexts/VimeoContext';
import { Playlist } from '@/types/playlist';
import Toast from '@/components/Toast';

export default function SelectPlaylistScreen() {
  const { videoId, videoTitle } = useLocalSearchParams<{
    videoId: string;
    videoTitle: string;
  }>();
  
  const { getVideo } = useVimeo();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingToPlaylist, setAddingToPlaylist] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const allPlaylists = await hybridPlaylistService.getPlaylists();
      setPlaylists(allPlaylists);
    } catch (error) {
      console.error('Error loading playlists:', error);
      Alert.alert('Error', 'An error occurred while loading playlists.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!videoId) return;

    try {
      setAddingToPlaylist(playlistId);
      
      const video = getVideo(videoId);
      if (!video) {
        Alert.alert('Error', 'Video not found.');
        return;
      }

      await hybridPlaylistService.addVideoToPlaylist(playlistId, video);
      
      const playlist = playlists.find(p => p.id === playlistId);
      
      // Toast göster ve geri dön
      setToastMessage(`Added to "${playlist?.name}"`);
      setToastType('success');
      setToastVisible(true);
      
      // Kısa delay ile geri dön
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error: any) {
      console.error('Error adding to playlist:', error);
      
      if (error.message === 'Video already in playlist') {
        setToastMessage('Video already in this playlist');
        setToastType('info');
        setToastVisible(true);
      } else {
        setToastMessage('Error adding video to playlist');
        setToastType('error');
        setToastVisible(true);
      }
    } finally {
      setAddingToPlaylist(null);
    }
  };

  const handleCreateNewPlaylist = () => {
    router.push({
      pathname: '/create-playlist',
      params: { videoId, videoTitle }
    });
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.darkContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e0af92" />
          <ThemedText style={styles.loadingText}>Loading playlists...</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, styles.darkContainer]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <ThemedView style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#e0af92" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Select Playlist</ThemedText>
        <ThemedView style={styles.headerSpacer} />
      </ThemedView>

      {/* Video Info */}
      <ThemedView style={styles.videoInfo}>
        <Image 
          source={require('@/assets/images/playlist.svg')}
          style={styles.videoIcon}
          contentFit="contain"
        />
        <ThemedText style={styles.videoTitle} numberOfLines={2}>
          {videoTitle}
        </ThemedText>
      </ThemedView>

      {/* Playlists */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Create New Playlist */}
        <TouchableOpacity
          style={styles.createNewButton}
          onPress={handleCreateNewPlaylist}
        >
          <ThemedView style={styles.createNewIcon}>
            <IconSymbol name="plus" size={20} color="#e0af92" />
          </ThemedView>
          <ThemedView style={styles.createNewContent}>
            <ThemedText style={styles.createNewTitle}>Create New Playlist</ThemedText>
            <ThemedText style={styles.createNewSubtitle}>
              Create a new playlist for this video
            </ThemedText>
          </ThemedView>
          <IconSymbol name="chevron.right" size={16} color="#e0af92" />
        </TouchableOpacity>

        {/* Existing Playlists */}
        {playlists.length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Existing Playlists</ThemedText>
            
            {playlists.map((playlist) => (
              <TouchableOpacity
                key={playlist.id}
                style={styles.playlistItem}
                onPress={() => handleAddToPlaylist(playlist.id)}
                disabled={addingToPlaylist === playlist.id}
              >
                <ThemedView style={styles.playlistThumbnail}>
                  {playlist.thumbnail ? (
                    <ThemedView style={styles.thumbnailPlaceholder}>
                      <Image 
                        source={require('@/assets/images/playlist.svg')}
                        style={styles.playlistThumbnailIcon}
                        contentFit="contain"
                      />
                    </ThemedView>
                  ) : (
                    <ThemedView style={styles.thumbnailPlaceholder}>
                      <Image 
                        source={require('@/assets/images/playlist.svg')}
                        style={styles.playlistThumbnailIcon}
                        contentFit="contain"
                      />
                    </ThemedView>
                  )}
                </ThemedView>
                
                <ThemedView style={styles.playlistContent}>
                  <ThemedText style={styles.playlistName} numberOfLines={1}>
                    {playlist.name}
                  </ThemedText>
                  <ThemedText style={styles.playlistInfo}>
                    {playlist.videos.length} video • {playlistService.formatDuration(
                      playlistService.getPlaylistDuration(playlist)
                    )}
                  </ThemedText>
                </ThemedView>

                {addingToPlaylist === playlist.id ? (
                  <ActivityIndicator size="small" color="#e0af92" />
                ) : (
                  <IconSymbol name="plus.circle" size={20} color="#e0af92" />
                )}
              </TouchableOpacity>
            ))}
          </ThemedView>
        )}

        {playlists.length === 0 && (
          <ThemedView style={styles.emptyState}>
            <Image 
              source={require('@/assets/images/playlist.svg')}
              style={styles.playlistIcon}
              contentFit="contain"
            />
            <ThemedText style={styles.emptyTitle}>No playlists yet</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Click the button above to create your first playlist
            </ThemedText>
          </ThemedView>
        )}
      </ScrollView>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  videoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#000000',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  videoTitle: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    marginLeft: 10,
    lineHeight: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#000000',
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  createNewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  createNewContent: {
    flex: 1,
  },
  createNewTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  createNewSubtitle: {
    color: 'white',
    fontSize: 12,
  },
  section: {
    marginTop: 30,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#000000',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  playlistThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  thumbnailPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  playlistContent: {
    flex: 1,
  },
  playlistName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  playlistInfo: {
    color: '#e0af92',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  playlistIcon: {
    width: 64,
    height: 64,
  },
  videoIcon: {
    width: 24,
    height: 24,
  },
  playlistThumbnailIcon: {
    width: 20,
    height: 20,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
