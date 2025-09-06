import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useVimeo } from '@/contexts/VimeoContext';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
import VimeoPlayer from '@/components/VimeoPlayer';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { videos, isConfigured, isLoading } = useVimeo();
  const [currentVideo, setCurrentVideo] = useState<SimplifiedVimeoVideo | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Auto-select first video when videos load
    if (videos.length > 0 && !currentVideo) {
      setCurrentVideo(videos[0]);
    }
  }, [videos]);

  const playVideo = (video: SimplifiedVimeoVideo) => {
    setCurrentVideo(video);
    console.log('Playing video:', video.title);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Vimeo setup gerekiyorsa
  if (!isConfigured) {
    return (
      <ThemedView style={[styles.container, styles.darkContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ThemedView style={styles.setupContainer}>
          <IconSymbol name="video.fill" size={64} color="#e0af92" />
          <ThemedText style={styles.setupTitle}>Naber LA</ThemedText>
          <ThemedText style={styles.setupDescription}>
            Vimeo müzik koleksiyonunuza bağlanın
          </ThemedText>
          <TouchableOpacity 
            style={styles.setupButton}
            onPress={() => router.push('/vimeo-setup')}
          >
            <IconSymbol name="link" size={20} color="white" />
            <ThemedText style={styles.setupButtonText}>Bağlan</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, styles.darkContainer]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Safe Area for Camera Notch */}
      <ThemedView style={styles.safeAreaTop} />
      
      {/* Video Player Area */}
      <ThemedView style={[styles.playerArea, isFullscreen && styles.fullscreenPlayer]}>
        {currentVideo ? (
          <>
            <VimeoPlayer
              video={currentVideo}
              isFullscreen={isFullscreen}
              onFullscreenToggle={toggleFullscreen}
              onError={(error) => {
                console.error('Video player error:', error);
                // Optionally show an alert or handle error
              }}
            />
            {/* Video Title Below Player */}
            {!isFullscreen && (
              <ThemedView style={styles.videoInfoArea}>
                <ThemedText style={styles.currentVideoTitle} numberOfLines={2}>
                  {currentVideo.title}
                </ThemedText>
              </ThemedView>
            )}
          </>
        ) : (
          <ThemedView style={styles.noVideoContainer}>
            <IconSymbol name="music.note" size={48} color="#e0af92" />
            <ThemedText style={styles.noVideoText}>Bir video seçin</ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      {/* Playlist Area */}
      {!isFullscreen && (
        <ThemedView style={styles.playlistArea}>
          <ThemedView style={styles.playlistHeader}>
            <ThemedText style={styles.playlistTitle}>Playlist</ThemedText>
          </ThemedView>
          
          <ScrollView 
            style={styles.playlistScroll}
            showsVerticalScrollIndicator={false}
          >
            {videos.map((video, index) => (
              <TouchableOpacity
                key={video.id}
                style={[
                  styles.playlistItem,
                  currentVideo?.id === video.id && styles.currentPlaylistItem
                ]}
                onPress={() => playVideo(video)}
                activeOpacity={0.7}
              >
                <View style={styles.playlistItemInfo}>
                  <Text 
                    style={[
                      styles.playlistItemTitle,
                      currentVideo?.id === video.id && styles.currentPlaylistItemTitle
                    ]} 
                    numberOfLines={1}
                  >
                    {video.title}
                  </Text>
                  <Text 
                    style={[
                      styles.playlistItemDuration,
                      currentVideo?.id === video.id && styles.currentPlaylistItemDuration
                    ]}
                  >
                    {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
                <View style={styles.playlistItemActions}>
                  {currentVideo?.id === video.id && (
                    <IconSymbol name="speaker.wave.2.fill" size={16} color="#e0af92" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ThemedView>
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
  safeAreaTop: {
    height: 50, // Kamera notch için alan
    backgroundColor: '#000000',
  },
  
  // Setup Screen
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  setupTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 30,
    marginBottom: 15,
  },
  setupDescription: {
    fontSize: 16,
    color: 'white', // Siyah yerine beyaz
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0af92', // Yeni vurgu rengi
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  setupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Player Area
  playerArea: {
    height: 320, // Daha büyük player
    backgroundColor: '#000000', // Tutarlı siyah
  },
  fullscreenPlayer: {
    height: '100%',
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000', // Tutarlı siyah
  },
  noVideoText: {
    color: 'white', // Siyah yerine beyaz
    fontSize: 16,
    marginTop: 15,
  },

  // Video Info Area (below player)
  videoInfoArea: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#111111', // Daha açık çizgi
  },
  currentVideoTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },

  // Playlist Area
  playlistArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  playlistHeader: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#111111', // Tutarlı çizgi rengi
  },
  playlistTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  playlistScroll: {
    flex: 1,
    backgroundColor: '#000000', // Tam siyah background
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111111', // Daha açık çizgi
    backgroundColor: '#000000', // Tam siyah background
  },
  currentPlaylistItem: {
    backgroundColor: '#000000', // Arka plan siyah kalsın
    // Border kaldırıldı - sadece text rengi ile gösterilecek
  },
  playlistItemInfo: {
    flex: 1,
  },
  playlistItemTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  currentPlaylistItemTitle: {
    color: '#e0af92', // Seçili item title vurgu rengi
  },
  playlistItemDuration: {
    color: 'white', // Siyah yerine beyaz
    fontSize: 12,
  },
  currentPlaylistItemDuration: {
    color: '#e0af92', // Seçili item duration vurgu rengi
  },
  playlistItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
