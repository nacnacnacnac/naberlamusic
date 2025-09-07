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

// Integration Testing Infrastructure
interface IntegrationTestState {
  buttonPressCount: number;
  successfulCommands: number;
  failedCommands: number;
  averageResponseTime: number;
  lastCommandTime: number;
  stateDesyncCount: number;
  isTestingActive: boolean;
}

interface StateSnapshot {
  timestamp: number;
  mainPagePaused: boolean;
  footerPaused: boolean;
  playerReady: boolean;
  source: string;
}

// Logger factory for production performance
const isDev = __DEV__;
const log = (prefix: string) => (msg: string, data?: any) => {
  if (!isDev) return;
  console.log(prefix + msg, data ?? '');
};
const logError = (prefix: string) => (msg: string, data?: any) => {
  if (!isDev) return;
  console.error(prefix + msg, data ?? '');
};

// Debug logging with color coding
const debugLog = {
  footer: log('🎵 [FOOTER] '),
  main: log('🏠 [MAIN] '),
  player: log('🎬 [PLAYER] '),
  sync: log('🔄 [SYNC] '),
  test: log('🧪 [TEST] '),
  error: logError('❌ [ERROR] '),
  performance: log('⚡ [PERF] ')
};

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
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const playlistScrollRef = useRef<ScrollView>(null);

  // Integration Testing State
  const [testState, setTestState] = useState<IntegrationTestState>({
    buttonPressCount: 0,
    successfulCommands: 0,
    failedCommands: 0,
    averageResponseTime: 0,
    lastCommandTime: 0,
    stateDesyncCount: 0,
    isTestingActive: false
  });
  const [stateHistory, setStateHistory] = useState<StateSnapshot[]>([]);
  const [showDebugOverlay, setShowDebugOverlay] = useState(__DEV__);
  const vimeoPlayerRef = useRef<any>(null);
  const commandStartTimeRef = useRef<number>(0);
  const responseTimes = useRef<number[]>([]);

  useEffect(() => {
    // Auto-select first video when videos load and start playing
    if (videos.length > 0 && !currentVideo) {
      setCurrentVideo(videos[0]);
      setCurrentVideoIndex(0);
      setIsPaused(false); // Start playing automatically
      debugLog.main('Auto-selected first video and started playback:', videos[0].title);
    }
  }, [videos]);

  const playVideo = (video: SimplifiedVimeoVideo) => {
    const videoIndex = videos.findIndex(v => v.id === video.id);
    
    debugLog.main('PLAYING NEW VIDEO:', `${video.title} at index: ${videoIndex}`);
    
    // Direct video switching with proper state management
    // Remove complex timeout-based approach for immediate responsiveness
    setCurrentVideo(video);
    setCurrentVideoIndex(videoIndex);
    setIsPaused(false); // Set to play immediately
    
    // Toast göster
    showToast(`Now Playing: ${video.title}`, 'info');
  };

  const handlePlayStateChange = (isPlaying: boolean) => {
    const responseTime = Date.now() - commandStartTimeRef.current;
    const newPausedState = !isPlaying;
    
    debugLog.player(`Play state change callback - isPlaying: ${isPlaying}, newPaused: ${newPausedState}`);
    debugLog.performance(`End-to-end response time: ${responseTime}ms`);
    
    // Track response times for performance analysis
    if (commandStartTimeRef.current > 0 && responseTime < 10000) { // Valid response time
      responseTimes.current.push(responseTime);
      if (responseTimes.current.length > 50) {
        responseTimes.current = responseTimes.current.slice(-50); // Keep last 50
      }
      
      // Update average response time
      const avgTime = responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length;
      setTestState(prev => ({
        ...prev,
        averageResponseTime: Math.round(avgTime),
        successfulCommands: prev.successfulCommands + 1
      }));
      
      debugLog.performance(`Average response time: ${Math.round(avgTime)}ms (${responseTimes.current.length} samples)`);
    }
    
    // Validate state synchronization
    if (isPaused === newPausedState) {
      debugLog.sync(`State synchronization successful - Main: ${isPaused}, Player: ${newPausedState}`);
    } else {
      debugLog.error(`State desynchronization detected - Main: ${isPaused}, Player callback: ${newPausedState}`);
      setTestState(prev => ({
        ...prev,
        stateDesyncCount: prev.stateDesyncCount + 1
      }));
    }
    
    setIsPaused(newPausedState);
    
    // Create state snapshot for player response
    const snapshot: StateSnapshot = {
      timestamp: Date.now(),
      mainPagePaused: newPausedState,
      footerPaused: newPausedState,
      playerReady: vimeoPlayerRef.current?.isReady() || false,
      source: 'player-callback'
    };
    
    setStateHistory(prev => [...prev.slice(-19), snapshot]);
    
    // Reset command timing
    commandStartTimeRef.current = 0;
  };

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    setCurrentTime(currentTime);
    setVideoDuration(duration);
  };

  const handlePlayPause = () => {
    const commandStartTime = Date.now();
    commandStartTimeRef.current = commandStartTime;
    
    const oldPausedState = isPaused;
    const newPausedState = !isPaused;
    
    // Enhanced debug logging with state tracking
    debugLog.main(`handlePlayPause triggered - State change: ${oldPausedState} → ${newPausedState}`);
    debugLog.main(`Command ID: ${commandStartTime}, Timestamp: ${new Date().toISOString()}`);
    
    // Create state snapshot before change
    const beforeSnapshot: StateSnapshot = {
      timestamp: commandStartTime,
      mainPagePaused: oldPausedState,
      footerPaused: oldPausedState, // Should match main page
      playerReady: vimeoPlayerRef.current?.isReady() || false,
      source: 'handlePlayPause-before'
    };
    
    // Update test state
    setTestState(prev => ({
      ...prev,
      buttonPressCount: prev.buttonPressCount + 1,
      lastCommandTime: commandStartTime
    }));
    
    // Update main state
    setIsPaused(newPausedState);
    
    // Create state snapshot after change
    const afterSnapshot: StateSnapshot = {
      timestamp: Date.now(),
      mainPagePaused: newPausedState,
      footerPaused: newPausedState, // Should match main page
      playerReady: vimeoPlayerRef.current?.isReady() || false,
      source: 'handlePlayPause-after'
    };
    
    // Add snapshots to history
    setStateHistory(prev => [...prev.slice(-19), beforeSnapshot, afterSnapshot]);
    
    debugLog.main(`State updated successfully - New isPaused: ${newPausedState}`);
    debugLog.performance(`Command processing time: ${Date.now() - commandStartTime}ms`);
  };

  const scrollToPlaylist = () => {
    playlistScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const toggleFullscreen = () => {
    // This only affects intentional fullscreen mode, not normal playback
    // Normal playback should always stay within the 300px height constraint
    setIsFullscreen(!isFullscreen);
  };

  const playNextVideo = () => {
    if (videos.length === 0) return;
    
    const nextIndex = (currentVideoIndex + 1) % videos.length; // Loop back to first video
    const nextVideo = videos[nextIndex];
    
    setCurrentVideo(nextVideo);
    setCurrentVideoIndex(nextIndex);
    setIsPaused(false); // Yeni şarkı başladığında pause durumunu sıfırla
    debugLog.main('Playing next video:', `${nextVideo.title} at index: ${nextIndex}`);
    
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
    debugLog.main('Playing previous video:', `${prevVideo.title} at index: ${prevIndex}`);
    
    // Toast göster
    showToast(`Previous: ${prevVideo.title}`, 'info');
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // Integration Test Helper Functions
  const simulateFooterButtonPress = () => {
    debugLog.test('Simulating footer button press');
    handlePlayPause();
  };
  
  const validateStateSync = () => {
    const playerReady = vimeoPlayerRef.current?.isReady() || false;
    const mainState = isPaused;
    const playerValidation = vimeoPlayerRef.current?.validateStateSync?.();
    const playerInternalPaused = playerValidation?.internalPaused;
    
    // Compare main isPaused with player's internalPaused
    const isStatesSynced = mainState === playerInternalPaused;
    const isValid = playerReady && isStatesSynced && playerValidation?.isValid;
    
    debugLog.test(`State validation - Main: ${mainState}, Player Internal: ${playerInternalPaused}, Synced: ${isStatesSynced}, Valid: ${isValid}`);
    
    return {
      isValid,
      mainState,
      playerInternalPaused,
      isStatesSynced,
      playerReady,
      playerValidation,
      timestamp: Date.now(),
      details: {
        mainIsPaused: mainState,
        playerInternalPaused: playerInternalPaused,
        statesMatch: isStatesSynced,
        playerReady: playerReady,
        playerValid: playerValidation?.isValid || false
      }
    };
  };
  
  const measureResponseTime = () => {
    const startTime = Date.now();
    handlePlayPause();
    
    // Response time will be measured in handlePlayStateChange
    return startTime;
  };
  
  const stressTestPlayPause = async (count: number = 10, interval: number = 500) => {
    debugLog.test(`Starting stress test - ${count} presses, ${interval}ms interval`);
    
    setTestState(prev => ({ ...prev, isTestingActive: true }));
    
    for (let i = 0; i < count; i++) {
      debugLog.test(`Stress test press ${i + 1}/${count}`);
      handlePlayPause();
      
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    setTestState(prev => ({ ...prev, isTestingActive: false }));
    debugLog.test('Stress test completed');
  };

  // Expose test helpers in dev builds
  useEffect(() => {
    if (__DEV__ && typeof window !== 'undefined') {
      (window as any).homeTestHelpers = { simulateFooterButtonPress, validateStateSync, measureResponseTime, stressTestPlayPause };
    }
  }, []);

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
      debugLog.error('Error handling add to playlist:', error);
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
              ref={vimeoPlayerRef}
              video={currentVideo}
              isFullscreen={isFullscreen}
              playerHeight={300}
              onFullscreenToggle={toggleFullscreen}
              onError={(error) => {
                debugLog.error('Video player error:', error);
                setTestState(prev => ({
                  ...prev,
                  failedCommands: prev.failedCommands + 1
                }));
                showToast(error, 'error');
              }}
              onVideoEnd={playNextVideo}
              isPaused={isPaused}
              onPlayStateChange={handlePlayStateChange}
              onTimeUpdate={handleTimeUpdate}
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
          </>
        ) : (
          <ThemedView style={styles.noVideoContainer}>
            <IconSymbol name="music.note" size={48} color="#e0af92" />
            <ThemedText style={styles.noVideoText}>Select a video</ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      {/* Video Info Area - Now outside playerArea */}
      {currentVideo && !isFullscreen && (
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
          testState={testState}
          onTestStateChange={setTestState}
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
    height: 300, // Fixed player height
    maxHeight: 300, // Hard constraint to prevent expansion
    width: '100%', // Prevent horizontal expansion
    backgroundColor: '#000000', // Consistent black background
    marginTop: 30, // Space from camera notch
    position: 'relative', // For overlay positioning
    overflow: 'hidden', // Prevent content from expanding beyond bounds
    // Debug styling (commented out)
    // borderWidth: 2,
    // borderColor: '#ff0000',
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
    paddingVertical: 12, // Equal top and bottom spacing
    marginTop: 0, // No additional margin to maintain player constraints
    position: 'relative', // Ensure proper positioning without affecting player
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
  
  // Debug Overlay Styles
  debugOverlay: {
    position: 'absolute',
    top: 50,
    right: 10,
    width: 280,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    zIndex: 9999,
  },
  debugToggle: {
    position: 'absolute',
    top: -15,
    right: 10,
    width: 30,
    height: 30,
    backgroundColor: '#000',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  debugToggleText: {
    fontSize: 16,
  },
  debugPanel: {
    padding: 12,
  },
  debugTitle: {
    color: '#e0af92',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  debugSubtitle: {
    color: '#e0af92',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  debugLabel: {
    color: 'white',
    fontSize: 11,
  },
  debugValue: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: 'bold',
  },
  debugError: {
    color: '#ff6b6b',
  },
  debugPaused: {
    color: '#ffa500',
  },
  debugPlaying: {
    color: '#4caf50',
  },
  debugReady: {
    color: '#4caf50',
  },
  debugNotReady: {
    color: '#ff6b6b',
  },
  debugButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  debugButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  debugHistory: {
    maxHeight: 100,
  },
  debugHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  debugHistoryTime: {
    color: '#888',
    fontSize: 9,
    flex: 1,
  },
  debugHistorySource: {
    color: '#aaa',
    fontSize: 9,
    flex: 1,
    textAlign: 'center',
  },
  debugHistoryState: {
    fontSize: 9,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
});
