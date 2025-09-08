import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { hybridPlaylistService } from '@/services/hybridPlaylistService';
import { useVimeo } from '@/contexts/VimeoContext';

export default function CreatePlaylistScreen() {
  const { videoId, videoTitle } = useLocalSearchParams<{
    videoId: string;
    videoTitle: string;
  }>();
  
  const { getVideo } = useVimeo();
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name.');
      return;
    }

    try {
      setIsCreating(true);

      // Playlist oluştur
      const newPlaylist = await hybridPlaylistService.createPlaylist(
        playlistName.trim(),
        playlistDescription.trim() || undefined
      );

      // Video varsa playlist'e ekle
      if (videoId && videoTitle) {
        try {
          let video = getVideo(videoId);
          console.log('🎵 Found video in Vimeo context for create playlist:', video);
          
          if (!video) {
            console.log('🎵 Video not found in Vimeo context, searching in admin playlists...');
            
            // Try to find video in admin playlists
            const allPlaylists = await hybridPlaylistService.getPlaylists();
            let foundVideo = null;
            
            for (const playlist of allPlaylists) {
              if (playlist.isAdminPlaylist && playlist.videos) {
                const adminVideo = playlist.videos.find(v => v.id === videoId || v.vimeo_id === videoId);
                if (adminVideo) {
                  console.log('🎵 Found video in admin playlist for create:', adminVideo);
                  foundVideo = {
                    id: adminVideo.vimeo_id || adminVideo.id,
                    name: adminVideo.title || videoTitle || 'Unknown Video',
                    title: adminVideo.title || videoTitle || 'Unknown Video',
                    description: '',
                    duration: adminVideo.duration || 0,
                    embed: {
                      html: `<iframe src="https://player.vimeo.com/video/${adminVideo.vimeo_id || adminVideo.id}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
                    },
                    pictures: {
                      sizes: [{ link: adminVideo.thumbnail || 'https://via.placeholder.com/640x360' }]
                    }
                  };
                  break;
                }
              }
            }
            
            if (foundVideo) {
              video = foundVideo;
            } else {
              // Create synthetic video if not found anywhere
              video = {
                id: videoId,
                name: videoTitle || 'Unknown Video',
                title: videoTitle || 'Unknown Video',
                description: '',
                duration: 0,
                embed: {
                  html: `<iframe src="https://player.vimeo.com/video/${videoId}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
                },
                pictures: {
                  sizes: [{ link: 'https://via.placeholder.com/640x360' }]
                }
              };
            }
          }
          
          if (video) {
            console.log('🎵 Adding video to new playlist:', video.name || video.title);
            await hybridPlaylistService.addVideoToPlaylist(`user_${newPlaylist.id}`, video);
          }
        } catch (error) {
          console.error('Error adding video to new playlist:', error);
          // Video bulunamasa bile playlist oluşturulur
        }
      }

      // Direkt geri dön, notification yok
      router.back();
      if (videoId && videoTitle && videoTitle.trim() !== '') {
        // Küçük delay ile ikinci back
        setTimeout(() => router.back(), 100);
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      Alert.alert('Error', 'An error occurred while creating the playlist.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, styles.darkContainer]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <ThemedView style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#e0af92" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>New Playlist</ThemedText>
        <ThemedView style={styles.headerSpacer} />
      </ThemedView>

      {/* Content */}
      <ThemedView style={styles.content}>
        {/* Video Info - Sadece video varsa göster */}
        {videoTitle && videoTitle.trim() !== '' && (
          <ThemedView style={styles.videoInfo}>
            <Image 
              source={require('@/assets/images/playlist.svg')}
              style={styles.videoIcon}
              contentFit="contain"
            />
            <ThemedView style={styles.videoTextContainer}>
              <ThemedText style={styles.videoInfoLabel}>Video to add:</ThemedText>
              <ThemedText style={styles.videoTitle} numberOfLines={2}>
                {videoTitle}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        )}

        {/* Form */}
        <ThemedView style={styles.form}>
          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Playlist Name</ThemedText>
            <TextInput
              style={styles.textInput}
              value={playlistName}
              onChangeText={setPlaylistName}
              placeholder="e.g: Chill, Car, Pompa..."
              placeholderTextColor="#666666"
              maxLength={50}
              autoFocus={false}
            />
            <ThemedText style={styles.inputHint}>
              {playlistName.length}/50 characters
            </ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Actions */}
        <ThemedView style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.createButton]}
            onPress={handleCreatePlaylist}
            disabled={isCreating || !playlistName.trim()}
          >
            {isCreating ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <IconSymbol name="plus" size={20} color="#000000" />
            )}
            <ThemedText style={styles.buttonText}>
              {isCreating ? 'Creating...' : 'Create Playlist'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => router.back()}
            disabled={isCreating}
          >
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
        </ThemedView>

      </ThemedView>
    </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  videoInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 15,
    paddingHorizontal: 16,
    backgroundColor: '#000000',
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  videoIcon: {
    width: 24,
    height: 24,
  },
  videoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  videoInfoLabel: {
    color: '#e0af92',
    fontSize: 12,
    marginBottom: 4,
  },
  videoTitle: {
    color: 'white',
    fontSize: 14,
    lineHeight: 18,
  },
  form: {
    marginTop: 30,
  },
  inputGroup: {
    marginBottom: 25,
  },
  inputLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: 'white',
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    color: '#666666', // Koyu gri
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
  },
  actions: {
    marginTop: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: '#e0af92',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333333',
  },
  buttonText: {
    color: '#000000', // Siyah yazı vurgu renkli button için
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
