import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CustomIcon } from '@/components/ui/CustomIcon';
import { hybridPlaylistService } from '@/services/hybridPlaylistService';
import { useVimeo } from '@/contexts/VimeoContext';

interface CreatePlaylistModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  videoId?: string;
  videoTitle?: string;
}

export default function CreatePlaylistModal({ 
  onClose, 
  onSuccess, 
  videoId, 
  videoTitle 
}: CreatePlaylistModalProps) {
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
                      sizes: [{ link: adminVideo.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=' }]
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
              console.log('🎵 Creating synthetic video for playlist');
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
                  sizes: [{ link: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=' }]
                }
              };
            }
          }

          if (video) {
            await hybridPlaylistService.addVideoToPlaylist(newPlaylist.id, video);
            console.log('✅ Video added to new playlist successfully');
          }
        } catch (videoError) {
          console.error('❌ Error adding video to playlist:', videoError);
          // Don't fail the whole operation if video adding fails
        }
      }

      if (Platform.OS === 'web') {
        // Web için otomatik geri dön
        onSuccess?.();
        onClose();
      } else {
        // Native için Alert göster
        Alert.alert(
          'Success', 
          `Playlist "${playlistName}" created successfully!`,
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess?.();
                onClose();
              }
            }
          ]
        );
      }

    } catch (error: any) {
      console.error('❌ Error creating playlist:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create playlist. Please try again.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <ThemedView style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <CustomIcon name="chevron-left" size={24} color="#e0af92" />
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
          </ThemedView>

          <ThemedView style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Description (Optional)</ThemedText>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={playlistDescription}
              onChangeText={setPlaylistDescription}
              placeholder="What's this playlist about?"
              placeholderTextColor="#666666"
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </ThemedView>

          <TouchableOpacity
            style={[styles.createButton, (!playlistName.trim() || isCreating) && styles.createButtonDisabled]}
            onPress={handleCreatePlaylist}
            disabled={isCreating || !playlistName.trim()}
          >
            {isCreating ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <CustomIcon name="plus" size={20} color="#000000" />
            )}
            <ThemedText style={styles.buttonText}>
              {isCreating ? 'Creating...' : 'Create Playlist'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  videoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#333333',
  },
  videoIcon: {
    width: 40,
    height: 40,
    tintColor: '#e0af92',
    marginRight: 15,
  },
  videoTextContainer: {
    flex: 1,
  },
  videoInfoLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  videoTitle: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: '#333333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0af92',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#666666',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 8,
  },
});
