import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, Text, View, Image } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';
import { router, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useVimeo } from '@/contexts/VimeoContext';
import { vimeoService } from '@/services/vimeoService';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
import { VimeoPlayerNative } from '@/components/VimeoPlayerNative';
import { hybridPlaylistService } from '@/services/hybridPlaylistService';
import { autoSyncService } from '@/services/autoSyncService';
import Toast from '@/components/Toast';
import MusicPlayerTabBar from '@/components/MusicPlayerTabBar';
import { useBackgroundAudio } from '@/hooks/useBackgroundAudio';

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
  const { videos, isConfigured, isLoading, refreshVideos } = useVimeo();
  const { isConfigured: isBackgroundAudioConfigured } = useBackgroundAudio();
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
  const [isPlaylistExpanded, setIsPlaylistExpanded] = useState(true);
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());
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
      debugLog.main('Auto-selected first video and started playbook:', videos[0].title);
    }
  }, [videos]);

  // Log background audio configuration status
  useEffect(() => {
    debugLog.main(`Background audio configured: ${isBackgroundAudioConfigured}`);
  }, [isBackgroundAudioConfigured]);

  // Load user playlists and initialize auto sync
  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        const playlists = await hybridPlaylistService.getPlaylists();
        
        // Remove duplicates by ID
        const uniquePlaylists = playlists.filter((playlist, index, self) => 
          index === self.findIndex(p => p.id === playlist.id)
        );
        
        setUserPlaylists(uniquePlaylists);
        console.log('Initial playlists loaded:', uniquePlaylists.length, 'unique playlists');
      } catch (error) {
        console.error('Error loading playlists:', error);
      }
    };
    
    const initializeAutoSync = async () => {
      try {
        // Set callback for automatic refresh when sync notifications are received
        autoSyncService.setOnSyncCallback(() => {
          console.log('🔄 Auto-refreshing playlists due to admin sync notification');
          refreshPlaylists();
        });
        
        await autoSyncService.initialize();
      } catch (error) {
        console.error('Error initializing auto sync:', error);
      }
    };
    
    loadPlaylists();
    initializeAutoSync();
  }, []);

  // Manual refresh function for pull-to-refresh and admin sync
  const refreshPlaylists = async () => {
    try {
      console.log('🔄 Refreshing playlists...');
      
      const playlists = await hybridPlaylistService.getPlaylists();
      
      // Remove duplicates by ID
      const uniquePlaylists = playlists.filter((playlist, index, self) => 
        index === self.findIndex(p => p.id === playlist.id)
      );
      
      setUserPlaylists(uniquePlaylists);
      console.log('Playlists refreshed:', uniquePlaylists.length, 'unique playlists');
      
      // Auto-expand playlists that have videos
      const newExpanded = new Set<string>();
      uniquePlaylists.forEach(playlist => {
        if (playlist.videos && playlist.videos.length > 0) {
          newExpanded.add(playlist.id);
        }
      });
      setExpandedPlaylists(newExpanded);
      
    } catch (error) {
      console.error('Error refreshing playlists:', error);
    }
  };

  // Toggle user playlist expansion
  const togglePlaylistExpansion = (playlistId: string) => {
    const newExpanded = new Set(expandedPlaylists);
    const isExpanding = !newExpanded.has(playlistId);
    
    if (newExpanded.has(playlistId)) {
      newExpanded.delete(playlistId);
    } else {
      // Close all other playlists when opening a new one
      newExpanded.clear();
      newExpanded.add(playlistId);
      
      // Scroll to top when expanding a playlist
      playlistScrollRef.current?.scrollTo({ y: 0, animated: true });
    }
    setExpandedPlaylists(newExpanded);
  };


  // Sign out functionality removed - no auth system

  const playVideo = (video: SimplifiedVimeoVideo) => {
    const videoIndex = videos.findIndex(v => v.id === video.id);
    
    debugLog.main('PLAYING NEW VIDEO:', `${video.title} at index: ${videoIndex}`);
    
    // Direct video switching with proper state management
    setCurrentVideo(video);
    setCurrentVideoIndex(videoIndex);
    setIsPaused(false); // Set to play immediately
    
    // Send play command to player after video loads
    setTimeout(() => {
      if (vimeoPlayerRef.current) {
        debugLog.main('🎬 Auto-playing new video');
        vimeoPlayerRef.current.play().catch(error => {
          debugLog.error('❌ Auto-play failed:', error);
        });
      }
    }, 1000); // Wait for video to load
  };

  const handlePlayStateChange = (isPausedFromPlayer: boolean) => {
    const responseTime = Date.now() - commandStartTimeRef.current;
    const newPausedState = isPausedFromPlayer;
    
    debugLog.player(`Play state change callback - isPausedFromPlayer: ${isPausedFromPlayer}, newPaused: ${newPausedState}`);
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
    
    // Update state 
    setIsPaused(newPausedState);
    debugLog.sync(`State updated from player callback - isPaused: ${newPausedState}`);
    
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
    
    // Send command to video player - DEBUG ENHANCED
    if (vimeoPlayerRef.current) {
      debugLog.main(`🎬 DEBUG: newPausedState=${newPausedState}, should send ${newPausedState ? 'PAUSE' : 'PLAY'}`);
      if (newPausedState) {
        debugLog.main('🎬 Sending PAUSE command to player');
        vimeoPlayerRef.current.pause().catch(error => {
          debugLog.error('❌ Player pause failed:', error);
        });
      } else {
        debugLog.main('🎬 Sending PLAY command to player');
        vimeoPlayerRef.current.play().catch(error => {
          debugLog.error('❌ Player play failed:', error);
        });
      }
    } else {
      debugLog.error('❌ Player ref not available');
    }
    
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
    console.log('🎵 PLAY NEXT VIDEO CALLED - videos.length:', videos.length, 'currentIndex:', currentVideoIndex);
    
    // Find current video in playlists
    let currentPlaylist = null;
    let currentVideoIndexInPlaylist = -1;
    
    for (const playlist of userPlaylists) {
      if (playlist.videos && playlist.videos.length > 0) {
        const videoIndex = playlist.videos.findIndex((v: any) => 
          v.id === currentVideo?.id || v.vimeo_id === currentVideo?.id ||
          v.id === currentVideo?.vimeo_id || v.vimeo_id === currentVideo?.vimeo_id
        );
        if (videoIndex !== -1) {
          currentPlaylist = playlist;
          currentVideoIndexInPlaylist = videoIndex;
          break;
        }
      }
    }
    
    if (!currentPlaylist || !currentPlaylist.videos || currentPlaylist.videos.length === 0) {
      console.log('🎵 No playlist found or playlist empty');
      return;
    }
    
    const nextIndex = (currentVideoIndexInPlaylist + 1) % currentPlaylist.videos.length;
    const nextPlaylistVideo = currentPlaylist.videos[nextIndex];
    
    // Convert playlist video to Vimeo format
    const vimeoIdToUse = nextPlaylistVideo.vimeo_id || nextPlaylistVideo.id;
    const nextVideo = {
      id: vimeoIdToUse,
      name: nextPlaylistVideo.title,
      description: '',
      duration: nextPlaylistVideo.duration,
      embed: {
        html: `<iframe src="https://player.vimeo.com/video/${vimeoIdToUse}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
      },
      pictures: {
        sizes: [{ link: nextPlaylistVideo.thumbnail || 'https://via.placeholder.com/640x360' }]
      }
    };
    
    console.log('🎵 Playing next video from playlist:', nextVideo.name, 'at playlist index:', nextIndex);
    setCurrentVideo(nextVideo);
    setCurrentVideoIndex(nextIndex);
    setIsPaused(false);
    debugLog.main('Playing next video:', `${nextVideo.name} at index: ${nextIndex}`);
  };

  const playPreviousVideo = () => {
    console.log('🎵 PLAY PREVIOUS VIDEO CALLED - videos.length:', videos.length, 'currentIndex:', currentVideoIndex);
    
    // Find current video in playlists
    let currentPlaylist = null;
    let currentVideoIndexInPlaylist = -1;
    
    for (const playlist of userPlaylists) {
      if (playlist.videos && playlist.videos.length > 0) {
        const videoIndex = playlist.videos.findIndex((v: any) => 
          v.id === currentVideo?.id || v.vimeo_id === currentVideo?.id ||
          v.id === currentVideo?.vimeo_id || v.vimeo_id === currentVideo?.vimeo_id
        );
        if (videoIndex !== -1) {
          currentPlaylist = playlist;
          currentVideoIndexInPlaylist = videoIndex;
          break;
        }
      }
    }
    
    if (!currentPlaylist || !currentPlaylist.videos || currentPlaylist.videos.length === 0) {
      console.log('🎵 No playlist found or playlist empty');
      return;
    }
    
    const prevIndex = currentVideoIndexInPlaylist <= 0 ? currentPlaylist.videos.length - 1 : currentVideoIndexInPlaylist - 1;
    const prevPlaylistVideo = currentPlaylist.videos[prevIndex];
    
    // Convert playlist video to Vimeo format
    const vimeoIdToUse = prevPlaylistVideo.vimeo_id || prevPlaylistVideo.id;
    const prevVideo = {
      id: vimeoIdToUse,
      name: prevPlaylistVideo.title,
      description: '',
      duration: prevPlaylistVideo.duration,
      embed: {
        html: `<iframe src="https://player.vimeo.com/video/${vimeoIdToUse}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
      },
      pictures: {
        sizes: [{ link: prevPlaylistVideo.thumbnail || 'https://via.placeholder.com/640x360' }]
      }
    };
    
    console.log('🎵 Playing previous video from playlist:', prevVideo.name, 'at playlist index:', prevIndex);
    setCurrentVideo(prevVideo);
    setCurrentVideoIndex(prevIndex);
    setIsPaused(false);
    debugLog.main('Playing previous video:', `${prevVideo.name} at index: ${prevIndex}`);
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

  // Refresh playlists when returning from playlist creation/selection pages
  useFocusEffect(
    React.useCallback(() => {
      // Only refresh if we have playlists loaded (not on initial load)
      if (userPlaylists.length > 0) {
        console.log('🔄 Refreshing playlists after navigation');
        refreshPlaylists();
      }
    }, [userPlaylists.length])
  );

  const handleAddToPlaylist = (video: SimplifiedVimeoVideo) => {
    // Use cached playlists instead of API call for instant response
    if (userPlaylists.length === 0) {
      // Hiç playlist yoksa yeni oluştur
      router.push({
        pathname: '/create-playlist',
        params: { videoId: video.id, videoTitle: video.name || video.title || 'Untitled Video' }
      });
    } else {
      // Mevcut playlist'leri göster
      router.push({
        pathname: '/select-playlist',
        params: { videoId: video.id, videoTitle: video.name || video.title || 'Untitled Video' }
      });
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

  // Loading state while Vimeo initializes
  if (!isConfigured && isLoading) {
    return (
      <ThemedView style={[styles.container, styles.darkContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ThemedView style={styles.setupContainer}>
          <IconSymbol name="video.fill" size={64} color="#e0af92" />
          <ThemedText style={styles.setupTitle}>Naber LA</ThemedText>
          <ThemedText style={styles.setupDescription}>
            Initializing music collection...
          </ThemedText>
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
            <VimeoPlayerNative
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
                
                // If video has 401 error, add to private list and skip to next video
                if (error.includes('401') && currentVideo) {
                  console.log(`🔄 Video ${currentVideo.id} has domain restrictions, adding to private list and skipping...`);
                  // Add to private video list for future filtering
                  import('@/services/vimeoService').then(({ vimeoService }) => {
                    vimeoService.addToPrivateList(currentVideo.id);
                  });
                  
                  showToast('Video has domain restrictions, skipped', 'info');
                  setTimeout(() => {
                    playNextVideo();
                  }, 1000);
                } else {
                  showToast(error, 'error');
                }
              }}
              onVideoEnd={playNextVideo}
              isPaused={isPaused}
              onPlayStateChange={handlePlayStateChange}
              onTimeUpdate={handleTimeUpdate}
            />
            
            {/* Top Gradient Overlay */}
            {!isFullscreen && (
              <LinearGradient
                colors={['rgba(0,0,0,1)', 'rgba(0,0,0,1)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.5)', 'transparent']}
                style={styles.topGradientOverlay}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
            )}
          </>
        ) : (
          <View style={styles.noVideoContainer}>
            {/* Background Video when no video selected */}
            <Video
              source={require('@/assets/videos/select.mp4')}
              style={styles.selectVideo}
              shouldPlay
              isLooping
              isMuted
              resizeMode="cover"
            />
            {/* Dark Overlay */}
            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
              style={styles.selectVideoOverlay}
            />
          </View>
        )}
      </ThemedView>

      {/* Video Info Area - Now outside playerArea */}
      {currentVideo && !isFullscreen && (
        <ThemedView style={styles.videoInfoArea}>
          <ThemedView style={styles.titleContainer}>
            <ThemedView style={styles.titleTextContainer}>
              <ThemedText style={styles.currentVideoTitle} numberOfLines={2}>
                {currentVideo.name || currentVideo.title || 'Untitled Video'}
              </ThemedText>
            </ThemedView>
            <View style={styles.headerActions}>
              {/* Debug Icon */}
              <TouchableOpacity 
                style={styles.debugButton}
                onPress={() => router.push('/debug-api')}
              >
                <IconSymbol name="wrench.and.screwdriver" size={16} color="#8B5CF6" />
              </TouchableOpacity>
              
              {/* Admin Icon */}
              <TouchableOpacity 
                style={styles.adminButton}
                onPress={() => router.push('/admin-settings')}
              >
                <IconSymbol name="gear" size={16} color="#EF4444" />
              </TouchableOpacity>
              
              {/* Add to Playlist Icon */}
              <TouchableOpacity 
                style={styles.addToPlaylistButton}
                onPress={() => handleAddToPlaylist(currentVideo)}
              >
                <IconSymbol name="plus" size={16} color="#e0af92" />
              </TouchableOpacity>
            </View>
          </ThemedView>
          {/* Separator Line */}
          <ThemedView style={styles.separatorLine} />
        </ThemedView>
      )}

      {/* Playlist Area */}
      {!isFullscreen && (
        <ScrollView 
          style={styles.playlistArea}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          nestedScrollEnabled={true}
        >
          {/* All Videos section hidden - cleaner UI */}

          {/* Admin Panel Playlists */}
          {userPlaylists.map((playlist, playlistIndex) => {
            const isLastPlaylist = playlistIndex === userPlaylists.length - 1;
            return (
            <View key={playlist.id} style={styles.userPlaylistContainer}>
              <TouchableOpacity 
                style={styles.playlistHeader}
                onPress={() => togglePlaylistExpansion(playlist.id)}
                activeOpacity={0.7}
              >
                <ThemedView style={styles.playlistTitleContainer}>
                  <ExpoImage 
                    source={require('@/assets/images/playlist.svg')}
                    style={styles.playlistHeaderIcon}
                    contentFit="contain"
                  />
                  <ThemedText style={styles.playlistTitle}>{playlist.name}</ThemedText>
                </ThemedView>
                <IconSymbol 
                  name={expandedPlaylists.has(playlist.id) ? "chevron.down" : "chevron.right"} 
                  size={16} 
                  color="#e0af92" 
                />
              </TouchableOpacity>
              
              {expandedPlaylists.has(playlist.id) && (
                <ScrollView 
                  style={[
                    styles.userPlaylistScroll,
                    expandedPlaylists.size === 1 && styles.userPlaylistScrollExpanded
                  ]}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                >
                  {playlist.videos && playlist.videos.length > 0 ? (
                    <>
                      {playlist.videos.map((playlistVideo: any, index: number) => (
                        <TouchableOpacity
                          key={`${playlist.id}-${playlistVideo.id}`}
                          style={[
                            styles.playlistItem,
                            (currentVideo?.id === playlistVideo.id || currentVideo?.id === playlistVideo.vimeo_id) && styles.currentPlaylistItem
                          ]}
                          onPress={() => {
                            // Use vimeo_id if available, otherwise try to find by UUID
                            const vimeoIdToUse = playlistVideo.vimeo_id || playlistVideo.id;
                            const syntheticVideo = {
                              id: vimeoIdToUse,
                              name: playlistVideo.title,
                              description: '',
                              duration: playlistVideo.duration,
                              embed: {
                                html: `<iframe src="https://player.vimeo.com/video/${vimeoIdToUse}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
                              },
                              pictures: {
                                sizes: [{ link: playlistVideo.thumbnail || 'https://via.placeholder.com/640x360' }]
                              }
                              };
                            playVideo(syntheticVideo);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.playlistItemInfo}>
                            <Text 
                              style={[
                                styles.playlistItemTitle,
                                (currentVideo?.id === playlistVideo.id || currentVideo?.id === playlistVideo.vimeo_id) && styles.currentPlaylistItemTitle
                              ]} 
                              numberOfLines={1}
                            >
                              {playlistVideo.title || playlistVideo.name || 'Untitled Video'}
                            </Text>
                            <Text 
                              style={styles.playlistItemDuration}
                            >
                              {Math.floor(playlistVideo.duration / 60)}:{(playlistVideo.duration % 60).toString().padStart(2, '0')}
                            </Text>
                          </View>
                          <View style={styles.playlistItemActions}>
                            {(currentVideo?.id === playlistVideo.id || currentVideo?.id === playlistVideo.vimeo_id) && (
                              <IconSymbol name="speaker.wave.2.fill" size={16} color="#e0af92" />
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                      
                      {/* Add spacer items only after the last playlist's last song */}
                      {isLastPlaylist && (
                        <>
                          {[1, 2, 3, 4].map((spacer) => (
                            <View key={`spacer-${spacer}`} style={styles.spacerItem} />
                          ))}
                        </>
                      )}
                    </>
                  ) : (
                    <View style={styles.emptyPlaylistContainer}>
                      <ThemedText style={styles.emptyPlaylistText}>No videos in this playlist</ThemedText>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
            );
          })}
        </ScrollView>
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
            router.push('/videos');
          }}
          onAddToPlaylist={() => {
            router.push({
              pathname: '/select-playlist',
              params: { 
                videoId: currentVideo.id, 
                videoTitle: currentVideo.name || currentVideo.title || 'Untitled Video' 
              }
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
    backgroundColor: 'transparent',
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
    marginTop: 5, // Eski haline döndür
    position: 'relative', // For overlay positioning
    overflow: 'hidden', // Prevent content from expanding beyond bounds
    // Debug styling (commented out)
    // borderWidth: 2,
    // borderColor: '#ff0000',
  },
  topGradientOverlay: {
    position: 'absolute',
    top: 0, // playerArea'nın en üstünden başla
    left: 0,
    right: 0,
    height: 150, // playerArea'nın yarısı kadar
    zIndex: 20, // Daha yüksek z-index
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
    position: 'relative',
  },
  selectVideo: {
    position: 'absolute',
    top: 0,
    left: -20, // Video'yu çok az sağa al
    right: 0,
    bottom: 0,
    width: '105%', // Genişliği hafif artır
    height: '100%',
  },
  selectVideoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  selectTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    zIndex: 10,
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
    paddingVertical: 4, // Even more reduced spacing
    marginTop: -25, // Pull up even more to reduce gap
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  debugButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  adminButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  addToPlaylistButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0af92',
  },

  // Playlist Area
  playlistArea: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
    paddingBottom: 100, // Reduced padding since we now use spacer items for proper spacing
  },
  userPlaylistContainer: {
    marginTop: 0,
  },
  emptyPlaylistContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyPlaylistText: {
    color: '#666666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: -80, // Gradient'i daha da aşağı indir - kamera altına doğru
    left: 0,
    right: 0,
    height: 180, // Aynı boyut
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
  userPlaylistScroll: {
    maxHeight: 500, // Large height for expanded playlist videos
    backgroundColor: '#000000',
  },
  userPlaylistScrollExpanded: {
    maxHeight: 600, // Even larger height when playlist is the only one expanded
    backgroundColor: '#000000',
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
    color: '#666666', // Çok koyu gri
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  currentPlaylistItemTitle: {
    color: '#e0af92', // Seçili item title vurgu rengi
  },
  playlistItemDuration: {
    color: '#333333', // Maksimum koyu gri
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
  spacerItem: {
    height: 60, // Same height as playlist item to create proper spacing
    backgroundColor: 'transparent',
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
