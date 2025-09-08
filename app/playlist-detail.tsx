import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { hybridPlaylistService } from '@/services/hybridPlaylistService';
import { Playlist } from '@/types/playlist';
import { SimplifiedVimeoVideo } from '@/types/vimeo';

export default function PlaylistDetailScreen() {
  const { playlistId } = useLocalSearchParams<{ playlistId: string }>();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [videos, setVideos] = useState<SimplifiedVimeoVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPlaylistDetail = React.useCallback(async () => {
    if (!playlistId) return;
    
    try {
      setIsLoading(true);
      const playlistData = await hybridPlaylistService.getPlaylist(playlistId);
      setPlaylist(playlistData);
      setVideos(playlistData?.videos || []);
    } catch (error) {
      console.error('Error loading playlist:', error);
      Alert.alert('Error', 'Failed to load playlist');
    } finally {
      setIsLoading(false);
    }
  }, [playlistId]);

  useFocusEffect(
    React.useCallback(() => {
      loadPlaylistDetail();
    }, [loadPlaylistDetail])
  );

  const handleVideoPress = (video: SimplifiedVimeoVideo) => {
    // Ana sayfaya geri dön ve bu videoyu çal
    router.push({
      pathname: '/(tabs)/',
      params: { 
        playVideo: video.id,
        playlistId: playlistId 
      }
    });
  };

  const handleBackPress = () => {
    router.back();
  };

  const renderVideoItem = ({ item }: { item: SimplifiedVimeoVideo }) => (
    <TouchableOpacity 
      style={styles.videoItem}
      onPress={() => handleVideoPress(item)}
      activeOpacity={0.7}
    >
      <Image 
        source={require('@/assets/images/playlist.svg')}
        style={styles.videoThumbnail}
        contentFit="contain"
      />
      <ThemedView style={styles.videoInfo}>
        <ThemedText style={styles.videoTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>
        <ThemedText style={styles.videoDuration}>
          {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
        </ThemedText>
      </ThemedView>
      <IconSymbol name="play.fill" size={20} color="#e0af92" />
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          title: playlist?.name || 'Playlist',
          headerStyle: {
            backgroundColor: '#000000',
          },
          headerTintColor: '#e0af92',
          headerTitleStyle: {
            color: 'white',
            fontWeight: 'bold',
          },
          headerBackTitle: '',
        }} 
      />
      <ThemedView style={[styles.container, styles.darkContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {isLoading ? (
          <ThemedView style={styles.centerContent}>
            <ThemedText style={styles.loadingText}>Loading playlist...</ThemedText>
          </ThemedView>
        ) : !playlist ? (
          <ThemedView style={styles.centerContent}>
            <ThemedText style={styles.errorText}>Playlist not found</ThemedText>
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          <>
            {/* Stats Header */}
            <ThemedView style={styles.statsHeader}>
              <ThemedText style={styles.videoCount}>
                {videos.length} videos
              </ThemedText>
            </ThemedView>

            {/* Videos List */}
            {videos.length > 0 ? (
              <FlatList
                data={videos}
                renderItem={renderVideoItem}
                keyExtractor={(item) => item.id}
                style={styles.videosList}
                contentContainerStyle={styles.videosListContent}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <ThemedView style={styles.centerContent}>
                <Image 
                  source={require('@/assets/images/playlist.svg')}
                  style={styles.emptyIcon}
                  contentFit="contain"
                />
                <ThemedText style={styles.emptyText}>No videos in this playlist</ThemedText>
              </ThemedView>
            )}
          </>
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  darkContainer: {
    backgroundColor: '#000000',
  },
  statsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  backButtonText: {
    color: '#e0af92',
    fontSize: 16,
    fontWeight: '600',
  },
  videoCount: {
    color: '#e0af92',
    fontSize: 16,
  },
  videosList: {
    flex: 1,
  },
  videosListContent: {
    padding: 20,
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  videoThumbnail: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
  videoInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  videoDuration: {
    fontSize: 14,
    color: '#999999',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'transparent',
  },
  loadingText: {
    fontSize: 16,
    color: '#999999',
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
  },
});
