import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CustomIcon } from '@/components/ui/CustomIcon';
import { hybridPlaylistService } from '@/services/hybridPlaylistService';
import { Playlist } from '@/types/playlist';

interface SelectPlaylistModalProps {
  onClose: () => void;
  video: {
    id: string;
    title: string;
    thumbnail?: string;
  };
  onSuccess?: () => void;
}

export default function SelectPlaylistModal({ onClose, video, onSuccess }: SelectPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingToPlaylist, setAddingToPlaylist] = useState<string | null>(null);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      setIsLoading(true);
      const userPlaylists = await hybridPlaylistService.getUserPlaylists();
      setPlaylists(userPlaylists);
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlist: Playlist) => {
    if (addingToPlaylist) return;

    try {
      setAddingToPlaylist(playlist.id);

      // Create synthetic video object
      const syntheticVideo = {
        id: video.id,
        name: video.title,
        title: video.title,
        description: '',
        duration: 0,
        embed: {
          html: `<iframe src="https://player.vimeo.com/video/${video.id}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
        },
        pictures: {
          sizes: [{ link: video.thumbnail || 'https://via.placeholder.com/640x360' }]
        }
      };

      await hybridPlaylistService.addVideoToPlaylist(playlist.id, syntheticVideo);

      if (Platform.OS === 'web') {
        // Web için başarı mesajı göster ve kapat
        onSuccess?.();
        onClose();
      } else {
        Alert.alert(
          'Success',
          `"${video.title}" added to "${playlist.name}"`,
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (error: any) {
      console.error('Error adding video to playlist:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to add video to playlist');
      } else {
        Alert.alert('Error', 'Failed to add video to playlist');
      }
    } finally {
      setAddingToPlaylist(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <CustomIcon name="chevron-left" size={24} color="#e0af92" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Add to Playlist</ThemedText>
        <View style={styles.headerSpacer} />
      </ThemedView>

      {/* Video Info */}
      <ThemedView style={styles.videoInfo}>
        <Image 
          source={{ uri: video.thumbnail || 'https://via.placeholder.com/60x40' }}
          style={styles.videoThumbnail}
          contentFit="cover"
        />
        <View style={styles.videoTextContainer}>
          <ThemedText style={styles.videoTitle} numberOfLines={2}>
            {video.title}
          </ThemedText>
        </View>
      </ThemedView>

      {/* Content */}
      {isLoading ? (
        <ThemedView style={styles.centerContent}>
          <ThemedText style={styles.loadingText}>Loading playlists...</ThemedText>
        </ThemedView>
      ) : playlists.length === 0 ? (
        <ThemedView style={styles.centerContent}>
          <ThemedText style={styles.emptyText}>No playlists found</ThemedText>
        </ThemedView>
      ) : (
        <ScrollView style={styles.playlistList} showsVerticalScrollIndicator={false}>
          {playlists.map((playlist) => (
            <TouchableOpacity
              key={playlist.id}
              style={styles.playlistItem}
              onPress={() => handleAddToPlaylist(playlist)}
              disabled={addingToPlaylist === playlist.id}
              activeOpacity={0.7}
            >
              <View style={styles.playlistIcon}>
                <CustomIcon name="heart" size={20} color="#e0af92" />
              </View>
              <View style={styles.playlistInfo}>
                <ThemedText style={styles.playlistName} numberOfLines={1}>
                  {playlist.name}
                </ThemedText>
                <ThemedText style={styles.videoCount}>
                  {playlist.videos?.length || 0} video{(playlist.videos?.length || 0) !== 1 ? 's' : ''}
                </ThemedText>
              </View>
              {addingToPlaylist === playlist.id ? (
                <View style={styles.loadingIcon}>
                  <ThemedText style={styles.loadingText}>Adding...</ThemedText>
                </View>
              ) : (
                <CustomIcon name="plus" size={20} color="#666666" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  videoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
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
  videoTextContainer: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#888888',
  },
  emptyText: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
  },
  playlistList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  playlistIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 4,
  },
  videoCount: {
    fontSize: 14,
    color: '#888888',
  },
  loadingIcon: {
    paddingHorizontal: 10,
  },
});
