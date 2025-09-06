import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, Text, View, Image } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useVimeo } from '@/contexts/VimeoContext';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
import VimeoPlayer from '@/components/VimeoPlayer';
import { playlistService } from '@/services/playlistService';
import Toast from '@/components/Toast';
import MusicPlayerTabBar from '@/components/MusicPlayerTabBar';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { videos, isConfigured, isLoading } = useVimeo();
  const [currentVideo, setCurrentVideo] = useState<SimplifiedVimeoVideo | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(-1);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [isPaused, setIsPaused] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<any>(null);
  const playlistScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Auto-select first video when videos load
    if (videos.length > 0 && !currentVideo) {
      setCurrentVideo(videos[0]);
      setCurrentVideoIndex(0);
    }
  }, [videos]);

  const playVideo = (video: SimplifiedVimeoVideo) => {
    const videoIndex = videos.findIndex(v => v.id === video.id);
    setCurrentVideo(video);
    setCurrentVideoIndex(videoIndex);
    setIsPaused(false); // Yeni video seçildiğinde pause durumunu sıfırla
    console.log('Playing video:', video.title, 'at index:', videoIndex);
    
    // Toast göster
    showToast(`Now Playing: ${video.title}`, 'info');
  };

  const handlePlayStateChange = (isPlaying: boolean) => {
    setIsPaused(!isPlaying);
    console.log('Play state changed:', isPlaying ? 'Playing' : 'Paused');
  };

  const handlePlayPause = () => {
    setIsPaused(!isPaused);
    console.log('Manual play/pause:', !isPaused ? 'Paused' : 'Playing');
  };

  const scrollToPlaylist = () => {
    playlistScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const playNextVideo = () => {
    if (videos.length === 0) return;
    
    const nextIndex = (currentVideoIndex + 1) % videos.length; // Loop back to first video
    const nextVideo = videos[nextIndex];
    
    setCurrentVideo(nextVideo);
    setCurrentVideoIndex(nextIndex);
    setIsPaused(false); // Yeni şarkı başladığında pause durumunu sıfırla
    console.log('Playing next video:', nextVideo.title, 'at index:', nextIndex);
    
    // Toast göster
    showToast(`Next: ${nextVideo.title}`, 'info');
  };

  const playPreviousVideo = () => {
    if (videos.length === 0) return;
    
    const prevIndex = currentVideoIndex <= 0 ? videos.length - 1 : currentVideoIndex - 1;
    const prevVideo = videos[prevIndex];
    
    setCurrentVideo(prevVideo);
    setCurrentVideoIndex(prevIndex);
    setIsPaused(false); // Yeni şarkı başladığında pause durumunu sıfırla
    console.log('Playing previous video:', prevVideo.title, 'at index:', prevIndex);
    
    // Toast göster
    showToast(`Previous: ${prevVideo.title}`, 'info');
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleAddToPlaylist = async (video: SimplifiedVimeoVideo) => {
    try {
      const playlists = await playlistService.getPlaylists();
      
      if (playlists.length === 0) {
        // Hiç playlist yoksa yeni oluştur
        router.push({
          pathname: '/create-playlist',
          params: { videoId: video.id, videoTitle: video.title }
        });
      } else {
        // Mevcut playlist'leri göster
        router.push({
          pathname: '/select-playlist',
          params: { videoId: video.id, videoTitle: video.title }
        });
      }
    } catch (error) {
      console.error('Error handling add to playlist:', error);
    }
  };

  // Loading durumu
  if (isLoading && videos.length === 0) {
    return (
      <ThemedView style={[styles.container, styles.darkContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ThemedView style={styles.setupContainer}>
          <Image 
            source={require('@/assets/images/loading.gif')} 
            style={styles.loadingGif}
            resizeMode="contain"
          />
          <ThemedText style={styles.setupTitle}>Naber LA</ThemedText>
          <ThemedText style={styles.setupDescription}>
            Loading videos...
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  // Vimeo setup gerekiyorsa
  if (!isConfigured) {
    return (
      <ThemedView style={[styles.container, styles.darkContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ThemedView style={styles.setupContainer}>
          <IconSymbol name="video.fill" size={64} color="#e0af92" />
          <ThemedText style={styles.setupTitle}>Naber LA</ThemedText>
          <ThemedText style={styles.setupDescription}>
            Connect to your Vimeo music collection
          </ThemedText>
          <TouchableOpacity 
            style={styles.setupButton}
            onPress={() => router.push('/vimeo-setup')}
          >
            <IconSymbol name="link" size={20} color="white" />
            <ThemedText style={styles.setupButtonText}>Connect</ThemedText>
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
                showToast(error, 'error');
              }}
              onVideoEnd={playNextVideo}
              isPaused={isPaused}
              onPlayStateChange={handlePlayStateChange}
            />
            
            {/* Top Gradient Overlay */}
            {!isFullscreen && (
              <LinearGradient
                colors={['#000000', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0)']}
                style={styles.topGradientOverlay}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
            )}
            {/* Video Title Below Player */}
            {!isFullscreen && (
              <ThemedView style={styles.videoInfoArea}>
                <ThemedView style={styles.titleContainer}>
                  <ThemedView style={styles.titleTextContainer}>
                    <ThemedText style={styles.currentVideoTitle} numberOfLines={2}>
                      {currentVideo.title}
                    </ThemedText>
                  </ThemedView>
                  <TouchableOpacity 
                    style={styles.addToPlaylistButton}
                    onPress={() => handleAddToPlaylist(currentVideo)}
                  >
                    <IconSymbol name="plus" size={16} color="#e0af92" />
                  </TouchableOpacity>
                </ThemedView>
                {/* Separator Line */}
                <ThemedView style={styles.separatorLine} />
              </ThemedView>
            )}
          </>
        ) : (
          <ThemedView style={styles.noVideoContainer}>
            <IconSymbol name="music.note" size={48} color="#e0af92" />
            <ThemedText style={styles.noVideoText}>Select a video</ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      {/* Playlist Area */}
      {!isFullscreen && (
        <View style={styles.playlistArea}>
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)', '#000000']}
            style={styles.gradientOverlay}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <TouchableOpacity 
            style={styles.playlistHeader}
            onPress={scrollToPlaylist}
            activeOpacity={0.7}
          >
            <ThemedView style={styles.playlistTitleContainer}>
              <ExpoImage 
                source={require('@/assets/images/playlist.svg')}
                style={styles.playlistHeaderIcon}
                contentFit="contain"
              />
              <ThemedText style={styles.playlistTitle}>Naber LA Playlist</ThemedText>
            </ThemedView>
            <IconSymbol name="chevron.down" size={16} color="#e0af92" />
          </TouchableOpacity>
          
          <ScrollView 
            ref={playlistScrollRef}
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
        </View>
      )}

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />

      {/* Music Player Footer */}
      {currentVideo && !isFullscreen && (
        <MusicPlayerTabBar
          currentVideo={currentVideo}
          isPaused={isPaused}
          onPlayPause={handlePlayPause}
          onPrevious={playPreviousVideo}
          onNext={playNextVideo}
          onPlaylistPress={() => {
            router.push('/(tabs)/videos');
          }}
          onAddToPlaylist={() => {
            router.push({
              pathname: '/select-playlist',
              params: { videoId: currentVideo.id }
            });
          }}
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
  safeAreaTop: {
    height: 0, // Video'yu en yukarı taşı
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
  loadingGif: {
    width: 60,
    height: 60,
    marginBottom: 20,
  },

  // Player Area
  playerArea: {
    height: 300, // Daha büyük player
    backgroundColor: '#000000', // Tutarlı siyah
    marginTop: 30, // Kameradan daha aşağıda
    position: 'relative', // Overlay için
  },
  topGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80, // Yukarıdan az bir gradient
    zIndex: 10,
    pointerEvents: 'none', // Touch event'leri geçsin
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
    paddingVertical: 12, // Alt üst eşit boşluk
    marginTop: 0, // Normal boşluk
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  separatorLine: {
    height: 1,
    backgroundColor: '#333333',
    marginTop: 15,
    marginHorizontal: -20, // Padding'i aş, boydan boya
  },
  titleTextContainer: {
    flex: 1,
    marginRight: 15,
  },
  currentVideoTitle: {
    color: 'white',
    fontSize: 16, // Küçültüldü
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  videoDuration: {
    color: '#e0af92', // Vurgu rengimiz
    fontSize: 12,
    fontWeight: '400',
  },
  addToPlaylistButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },

  // Playlist Area
  playlistArea: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
    paddingBottom: 150, // Daha büyük footer için alan bırak
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0, // Playlist area'nın altından başla
    left: 0,
    right: 0,
    height: 60, // Daha küçük gradient
    zIndex: 1,
    pointerEvents: 'none', // Touch event'leri geçsin
  },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#111111', // Tutarlı çizgi rengi
  },
  playlistTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistHeaderIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  playlistTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
