import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, Text, View, Image, DeviceEventEmitter, Alert, RefreshControl, Platform, Animated } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';
import { router, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { CustomIcon } from '@/components/ui/CustomIcon';
import { useVimeo } from '@/contexts/VimeoContext';
import { vimeoService } from '@/services/vimeoService';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
import { VimeoPlayerNative } from '@/components/VimeoPlayerNative';
import { hybridPlaylistService } from '@/services/hybridPlaylistService';
import { autoSyncService } from '@/services/autoSyncService';
import Toast from '@/components/Toast';
import MusicPlayerTabBar from '@/components/MusicPlayerTabBar';
import { useBackgroundAudio } from '@/hooks/useBackgroundAudio';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';
import CustomModal from '@/components/CustomModal';
import LeftModal from '@/components/LeftModal';
import PlaylistModal from '@/components/PlaylistModal';
import CreatePlaylistModal from '@/components/CreatePlaylistModal';
import MainPlaylistModal from '@/components/MainPlaylistModal';
import ShareButton, { ShareModal } from '@/components/ShareButton';

// Background video import
const backgroundVideo = require('@/assets/videos/NLA2.mp4');
const overlayImage = require('@/assets/images/ten.png');

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
  logger.system(prefix + msg, data ?? '');
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
  const { isAuthenticated } = useAuth();
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
  const playlistAnimation = useRef(new Animated.Value(1)).current;
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showMainPlaylistModal, setShowMainPlaylistModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [createPlaylistVideoId, setCreatePlaylistVideoId] = useState<string>('');
  const [createPlaylistVideoTitle, setCreatePlaylistVideoTitle] = useState<string>('');
  const [playlistRefreshTrigger, setPlaylistRefreshTrigger] = useState(0);
  const videoHeightAnimation = useRef(new Animated.Value(Platform.OS === 'web' ? 0.7 : 0)).current;
  const [pendingAutoPlay, setPendingAutoPlay] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
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


  // Auth check disabled for debugging
  // useEffect(() => {
  //   if (!isAuthenticated) {
  //     router.replace('/login');
  //   }
  // }, [isAuthenticated]);

  // Removed auto-play: Let user choose which video to play
  // Videos will be available in playlist, but no auto-selection
  // This way select.mp4 will show until user clicks a video

  // Log background audio configuration status
  useEffect(() => {
    debugLog.main(`Background audio configured: ${isBackgroundAudioConfigured}`);
  }, [isBackgroundAudioConfigured]);

  // Listen for global stop music events
  useEffect(() => {
    const stopMusicListener = DeviceEventEmitter.addListener('STOP_ALL_MUSIC', () => {
      logger.system('🎵 Received STOP_ALL_MUSIC event - stopping music...');
      stopAllMusic();
    });

    const stopMusicAfterSignInListener = DeviceEventEmitter.addListener('stopMusic', () => {
      logger.system('🎵 Received stopMusic event after sign-in - stopping guest music...');
      stopAllMusic();
    });

    return () => {
      stopMusicListener.remove();
      stopMusicAfterSignInListener.remove();
    };
  }, []);

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
        logger.system('Initial playlists loaded:', uniquePlaylists.length, 'unique playlists');
        
        // Debug: Clear cache if web-only playlists appear on mobile
        if (Platform.OS !== 'web') {
          const webOnlyPlaylists = uniquePlaylists.filter(p => p.isWebOnlyPlaylist);
          if (webOnlyPlaylists.length > 0) {
            logger.system('🚨 Found web-only playlists on mobile, clearing cache...');
            await hybridPlaylistService.clearCache();
            // Reload playlists after cache clear
            const freshPlaylists = await hybridPlaylistService.getPlaylists(true);
            const filteredPlaylists = freshPlaylists.filter((playlist, index, self) => 
              index === self.findIndex(p => p.id === playlist.id)
            );
            setUserPlaylists(filteredPlaylists);
            logger.system('✅ Cache cleared, reloaded:', filteredPlaylists.length, 'playlists');
          }
        }
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
      
      const playlists = await hybridPlaylistService.getPlaylists(true); // Force refresh
      
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

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await refreshPlaylists();
    setRefreshing(false);
  };

  // Toggle user playlist expansion
  const togglePlaylistExpansion = (playlistId: string) => {
    console.log('🎵 Toggle playlist expansion for ID:', playlistId);
    const newExpanded = new Set(expandedPlaylists);
    const isExpanding = !newExpanded.has(playlistId);
    console.log('🎵 Is expanding:', isExpanding);
    
    if (newExpanded.has(playlistId)) {
      console.log('🎵 Collapsing playlist:', playlistId);
      newExpanded.delete(playlistId);
    } else {
      console.log('🎵 Expanding playlist:', playlistId);
      // Close all other playlists when opening a new one
      newExpanded.clear();
      newExpanded.add(playlistId);
      
      // Scroll to top when expanding a playlist
      playlistScrollRef.current?.scrollTo({ y: 0, animated: true });
    }
    console.log('🎵 New expanded playlists:', Array.from(newExpanded));
    setExpandedPlaylists(newExpanded);
  };


  // Sign out functionality removed - no auth system

  const playVideo = (video: SimplifiedVimeoVideo) => {
    const videoIndex = videos.findIndex(v => v.id === video.id);
    
    debugLog.main('PLAYING NEW VIDEO:', `${video.title} at index: ${videoIndex}`);
    
    // FORCE STOP ALL AUDIO BEFORE PLAYING NEW VIDEO
    try {
      const { Audio } = require('expo-av');
      console.log('🔇 FORCE STOPPING ALL AUDIO BEFORE NEW VIDEO');
      
      // Try to access and stop any global audio instances
      if (Audio._instances) {
        Audio._instances.forEach((instance: any) => {
          try {
            if (instance.unloadAsync) instance.unloadAsync();
            if (instance.stopAsync) instance.stopAsync();
          } catch (e) {}
        });
      }
    } catch (e) {
      console.log('⚠️ Audio cleanup error in playVideo:', e);
    }
    
    // Direct video switching with proper state management
    setCurrentVideo(video);
    setCurrentVideoIndex(videoIndex);
    setIsPaused(false); // Set to play immediately
    
    // Close playlist smoothly when video starts playing
    Animated.parallel([
      Animated.timing(playlistAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(videoHeightAnimation, {
        toValue: 1, // Full size'a genişlet
        duration: 300,
        useNativeDriver: false,
      })
    ]).start(() => {
      setIsPlaylistExpanded(false);
    });
    
    // Set pending autoplay flag - will trigger when video is ready
    setPendingAutoPlay(true);
    debugLog.main('🎬 Pending autoplay set for new video');
  };

  const handleVideoReady = () => {
    debugLog.main('🎬 Video ready callback triggered');
    
    // If we have pending autoplay, trigger it now
    if (pendingAutoPlay) {
      debugLog.main('🎬 Executing pending autoplay');
      setPendingAutoPlay(false);
      
      setTimeout(() => {
        if (vimeoPlayerRef.current) {
          debugLog.main('🎬 Auto-playing video after ready');
          vimeoPlayerRef.current.play().catch(error => {
            debugLog.error('❌ Auto-play failed:', error);
          });
        }
      }, 100); // Short delay to ensure video is fully ready
    }
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

  // Toggle playlist visibility with smooth animation
  const togglePlaylistVisibility = () => {
    console.log('🎵 Toggle playlist - Current state:', isPlaylistExpanded);
    const newState = !isPlaylistExpanded;
    console.log('🎵 Toggle playlist - New state will be:', newState);
    
    if (newState) {
      // Opening playlist - animate in playlist and shrink video
      console.log('🎵 Opening playlist...');
      setIsPlaylistExpanded(true);
      Animated.parallel([
        Animated.timing(playlistAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(videoHeightAnimation, {
          toValue: Platform.OS === 'web' ? 0.7 : 0, // Web'de %70'e küçült
          duration: 300,
          useNativeDriver: false,
        })
      ]).start(() => {
        console.log('🎵 Playlist opened successfully');
      });
    } else {
      // Closing playlist - animate out playlist and expand video
      console.log('🎵 Closing playlist...');
      Animated.parallel([
        Animated.timing(playlistAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(videoHeightAnimation, {
          toValue: 1, // Full size'a genişlet
          duration: 300,
          useNativeDriver: false,
        })
      ]).start(() => {
        console.log('🎵 Playlist closed successfully');
        setIsPlaylistExpanded(false);
      });
    }
  };

  // Handle heart icon press - create playlist for mobile, show main playlist modal for web
  const handleHeartIconPress = () => {
    if (Platform.OS === 'web') {
      // Web'de main playlist modal'ını aç
      setShowMainPlaylistModal(true);
    } else {
      // Mobile'da playlist oluşturma
      if (!isAuthenticated) {
        router.push('/guest-signin');
        return;
      }
      
      // Playlist oluşturma sayfasına git
      router.push({
        pathname: '/create-playlist',
        params: { 
          videoId: currentVideo?.id || '', 
          videoTitle: currentVideo?.name || currentVideo?.title || '' 
        }
      });
    }
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

  // Global music stop function for sign out
  const stopAllMusic = () => {
    console.log('🎵 Stopping all music for sign out...');
    
    // Pause current video
    setIsPaused(true);
    
    // Stop video player
    if (vimeoPlayerRef.current) {
      vimeoPlayerRef.current.pause().catch(error => {
        console.error('❌ Error pausing video player:', error);
      });
    }
    
    // Clear current video
    setCurrentVideo(null);
    setCurrentVideoIndex(-1);
    
    console.log('✅ All music stopped successfully');
  };

  // Expose test helpers and music control in dev builds
  useEffect(() => {
    if (__DEV__ && typeof window !== 'undefined') {
      (window as any).homeTestHelpers = { 
        simulateFooterButtonPress, 
        validateStateSync, 
        measureResponseTime, 
        stressTestPlayPause,
        stopAllMusic 
      };
    }
  }, []);

  // Refresh playlists when screen becomes focused (but with smart caching)
  useFocusEffect(
    React.useCallback(() => {
      // Only refresh if no playlists are loaded (empty state)
      if (userPlaylists.length === 0) {
        console.log('🔄 No playlists loaded, refreshing...');
        refreshPlaylists();
      }
    }, [userPlaylists.length])
  );

  const handleAddToPlaylist = (video: SimplifiedVimeoVideo) => {
    // Web'de authentication bypass
    if (Platform.OS !== 'web' && !isAuthenticated) {
      // Navigate to guest sign-in page instead of modal
      router.push({
        pathname: '/guest-signin',
        params: { 
          videoId: video.id, 
          videoTitle: video.name || video.title || 'Untitled Video',
          action: 'playlist'
        }
      });
      return;
    }

    // Web'de custom modal kullan
    if (Platform.OS === 'web') {
      setCreatePlaylistVideoId(video.id);
      setCreatePlaylistVideoTitle(video.name || video.title || 'Untitled Video');
      setShowCreatePlaylistModal(true);
      return;
    }

    // Native'de normal navigation
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

  // Show loading screen while checking configuration

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
    <ThemedView style={[styles.container, styles.darkContainer, Platform.OS === 'web' ? { justifyContent: 'flex-end', paddingBottom: 34 } : {}]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Safe Area for Camera Notch */}
      <ThemedView style={styles.safeAreaTop} />
      
      {/* Video Player Area with smooth height animation */}
      <Animated.View style={[
        styles.playerArea, 
        isFullscreen && styles.fullscreenPlayer,
        Platform.OS === 'web' && {
          height: videoHeightAnimation.interpolate({
            inputRange: [0.7, 1],
            outputRange: ['70vh', '100vh']
          })
        }
      ]}>
        {currentVideo ? (
          <>
            {/* Web Video Controls Bar */}
            {Platform.OS === 'web' && !isFullscreen && (
              <View style={styles.webVideoControls}>
                <View style={styles.webVideoInfo}>
                  <Text style={styles.webVideoTitle} numberOfLines={1}>
                    {currentVideo.name || currentVideo.title || 'Untitled Video'}
                  </Text>
                </View>
                <View style={styles.webVideoActions}>
                  <ShareButton
                    video={currentVideo}
                    size="medium"
                    variant="icon"
                    color="#ffffff"
                    onShareSuccess={() => {
                      setToastMessage('Şarkı paylaşıldı!');
                      setToastType('success');
                      setToastVisible(true);
                    }}
                  />
                  <TouchableOpacity 
                    style={styles.webActionButton}
                    onPress={() => handleAddToPlaylist(currentVideo)}
                  >
                    <CustomIcon name="plus" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            <VimeoPlayerNative
              ref={vimeoPlayerRef}
              video={currentVideo}
              isFullscreen={isFullscreen}
              playerHeight={300}
              onFullscreenToggle={toggleFullscreen}
              onNext={playNextVideo}
              onReady={handleVideoReady}
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
            
            {/* Top Gradient Overlay - Hidden on web */}
            {!isFullscreen && Platform.OS !== 'web' && (
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
            {/* Background Video - NLA2.mp4 */}
            {Platform.OS === 'web' ? (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -1,
                overflow: 'hidden'
              }}>
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    minWidth: '100%',
                    minHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    transform: 'translate(-50%, -50%)',
                    objectFit: 'cover'
                  }}
                >
                  <source src={backgroundVideo} type="video/mp4" />
                </video>
              </div>
            ) : (
              <Video
                source={backgroundVideo}
                style={styles.backgroundVideoStyle}
                shouldPlay
                isLooping
                isMuted
                resizeMode="cover"
              />
            )}
            
            {/* ten.png Overlay - Görünür video başlamadan önce, video oynadığında kaybolur */}
            {Platform.OS === 'web' ? (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                pointerEvents: 'none'
              }}>
                <img 
                  src="/ten.png" 
                  alt="Overlay"
                  style={{
                    maxWidth: typeof window !== 'undefined' && window.innerWidth <= 768 ? '95%' : '80%',
                    maxHeight: typeof window !== 'undefined' && window.innerWidth <= 768 ? '95%' : '80%',
                    width: typeof window !== 'undefined' && window.innerWidth <= 768 ? '300px' : 'auto',
                    height: typeof window !== 'undefined' && window.innerWidth <= 768 ? '300px' : 'auto',
                    objectFit: 'contain'
                  }}
                />
              </div>
            ) : (
              <Image
                source={overlayImage}
                style={[
                  styles.overlayImageStyle,
                  Platform.OS !== 'web' && {
                    width: 300,
                    height: 300,
                  }
                ]}
                resizeMode="contain"
              />
            )}
            
            {/* Dark overlay for better text readability */}
            <LinearGradient
              colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)']}
              style={styles.backgroundVideoOverlay}
            />
          </View>
        )}
      </Animated.View>

      {/* Video Info Area - Hidden on web for cleaner look */}
      {currentVideo && !isFullscreen && Platform.OS !== 'web' && (
        <ThemedView style={styles.videoInfoArea}>
          <ThemedView style={styles.titleContainer}>
            <ThemedView style={styles.titleTextContainer}>
              <ThemedText style={styles.currentVideoTitle} numberOfLines={2}>
                {currentVideo.name || currentVideo.title || 'Untitled Video'}
              </ThemedText>
            </ThemedView>
            <View style={styles.headerActions}>
              
              {/* Share Button */}
              <ShareButton
                video={currentVideo}
                size="small"
                variant="icon"
                color="#e0af92"
                onShareSuccess={() => {
                  setToastMessage('Şarkı paylaşıldı!');
                  setToastType('success');
                  setToastVisible(true);
                }}
              />
              
              {/* Add to Playlist Icon */}
              <TouchableOpacity 
                style={styles.addToPlaylistButton}
                onPress={() => handleAddToPlaylist(currentVideo)}
              >
                <CustomIcon name="plus" size={16} color="#e0af92" />
              </TouchableOpacity>
            </View>
          </ThemedView>
          {/* Separator Line */}
          <ThemedView style={styles.separatorLine} />
        </ThemedView>
      )}

      {/* Playlist Area - Show only when expanded with smooth animation - Hidden on Web */}
      {!isFullscreen && Platform.OS !== 'web' && (
        <Animated.View
          style={{
            opacity: playlistAnimation,
            transform: [{ 
              translateY: playlistAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }],
            maxHeight: playlistAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1000] // 0'dan 1000px'e kadar
            }),
            overflow: 'hidden',
            marginTop: Platform.OS === 'web' ? 0 : 0,
            marginBottom: Platform.OS === 'web' ? 0 : 0,
            paddingBottom: Platform.OS === 'web' ? 0 : 0,
            backgroundColor: Platform.OS === 'web' ? 'rgba(0,0,0,0.9)' : 'transparent', // Siyah background
            position: Platform.OS === 'web' ? 'absolute' : 'relative',
            bottom: Platform.OS === 'web' ? -300 : 'auto', // DAHA DA DAHA DA AŞAĞI!
            left: Platform.OS === 'web' ? 0 : 'auto',
            right: Platform.OS === 'web' ? 0 : 'auto',
            width: Platform.OS === 'web' ? '100%' : 'auto',
          }}
        >
          <ScrollView 
          ref={playlistScrollRef}
          style={styles.playlistArea}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#e0af92"
              colors={['#e0af92']}
            />
          }
        >
          {/* Playlist Header with Close Button */}
          <ThemedView style={styles.playlistHeaderContainer}>
            <ThemedText style={styles.playlistHeaderTitle}>Playlists</ThemedText>
            <TouchableOpacity 
              style={styles.playlistCloseButton}
              onPress={togglePlaylistVisibility}
              activeOpacity={0.7}
            >
              <CustomIcon name="keyboard-arrow-down" size={20} color="#e0af92" />
            </TouchableOpacity>
          </ThemedView>

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
                <CustomIcon 
                  name={expandedPlaylists.has(playlist.id) ? "keyboard-arrow-down" : "chevron-right"} 
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
                              <CustomIcon name="volume-up" size={16} color="#e0af92" />
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
        </Animated.View>
      )}


      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />

      {/* Music Player Footer */}
      {(currentVideo || Platform.OS === 'web') && !isFullscreen && (
        <MusicPlayerTabBar
          currentVideo={currentVideo}
          isPaused={isPaused}
          onPlayPause={handlePlayPause}
          onPrevious={playPreviousVideo}
          onNext={playNextVideo}
          onPlaylistPress={() => {
            if (Platform.OS === 'web') {
              setShowPlaylistModal(true);
            } else {
              router.push('/videos');
            }
          }}
          onAddToPlaylist={() => {
            handleAddToPlaylist(currentVideo);
          }}
          onPlaylistToggle={handleHeartIconPress}
          testState={testState}
          onTestStateChange={setTestState}
        />
      )}

      {/* Main Playlist Modal for Web - Sol taraftan */}
      {Platform.OS === 'web' && (
        <LeftModal
          visible={showMainPlaylistModal}
          onClose={() => setShowMainPlaylistModal(false)}
          height={600}
        >
          <MainPlaylistModal 
            onClose={() => setShowMainPlaylistModal(false)}
            userPlaylists={userPlaylists}
            expandedPlaylists={expandedPlaylists}
            onTogglePlaylistExpansion={togglePlaylistExpansion}
            onPlayVideo={playVideo}
            currentVideo={currentVideo}
            onRefresh={onRefresh}
            refreshing={refreshing}
            refreshTrigger={playlistRefreshTrigger}
          />
        </LeftModal>
      )}

      {/* Custom Playlist Modal for Web - Sağ taraftan */}
      {Platform.OS === 'web' && (
        <CustomModal
          visible={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
          width={400}
          height={600}
        >
          <PlaylistModal 
            onClose={() => setShowPlaylistModal(false)} 
            onCreatePlaylist={(videoId, videoTitle) => {
              setCreatePlaylistVideoId(videoId || '');
              setCreatePlaylistVideoTitle(videoTitle || '');
              setShowPlaylistModal(false);
              setShowCreatePlaylistModal(true);
            }}
            refreshTrigger={playlistRefreshTrigger}
          />
        </CustomModal>
      )}

      {/* Custom Create Playlist Modal for Web */}
      {Platform.OS === 'web' && (
        <CustomModal
          visible={showCreatePlaylistModal}
          onClose={() => setShowCreatePlaylistModal(false)}
          width={400}
          height={600}
        >
          <CreatePlaylistModal 
            onClose={() => setShowCreatePlaylistModal(false)}
            onSuccess={() => {
              // Playlist'leri yenile
              refreshPlaylists();
              // PlaylistModal'ı refresh et
              setPlaylistRefreshTrigger(prev => prev + 1);
              // My Playlists modal'ını aç
              setShowPlaylistModal(true);
            }}
            videoId={createPlaylistVideoId}
            videoTitle={createPlaylistVideoTitle}
          />
        </CustomModal>
      )}

      {/* Share Modal */}
      {currentVideo && (
        <ShareModal
          video={currentVideo}
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
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
    backgroundColor: Platform.OS === 'web' ? 'transparent' : '#000000',
  },
  safeAreaTop: {
    height: 0, // Video'yu en yukarı taşı
    backgroundColor: Platform.OS === 'web' ? 'transparent' : '#000000',
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
    height: Platform.OS === 'web' ? '100vh' : 300, // Web'de tam ekran
    maxHeight: Platform.OS === 'web' ? '100vh' : 300, // Tam ekran max height
    minHeight: Platform.OS === 'web' ? '100vh' : 300, // Tam ekran minimum
    width: '100%', // Prevent horizontal expansion
    backgroundColor: Platform.OS === 'web' ? 'transparent' : '#000000', // Web'de transparent, mobile'da black
    marginTop: Platform.OS === 'web' ? 0 : 5, // Web'de margin yok
    position: Platform.OS === 'web' ? 'fixed' : 'relative', // Web'de fixed positioning
    top: Platform.OS === 'web' ? 0 : 'auto', // Web'de en üstten başla
    left: Platform.OS === 'web' ? 0 : 'auto', // Web'de en soldan başla
    zIndex: Platform.OS === 'web' ? -1 : 'auto', // Web'de arka planda
    overflow: 'hidden', // Prevent content from expanding beyond bounds
    // Debug styling (commented out)
    // borderWidth: 2,
    // borderColor: '#ff0000',
  },
  topGradientOverlay: {
    position: 'absolute',
    top: -10, // Gradient'i aşağı indir (was -30, now -10)
    left: 0,
    right: 0,
    height: 150, // Gradient'i 150'ye çıkar (was 120, now 150)
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
    backgroundColor: Platform.OS === 'web' ? 'transparent' : '#000000', // Web'de transparent
    position: 'relative',
  },
  noVideoBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  backgroundVideoStyle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  backgroundVideoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayImageStyle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -150 }, { translateY: -150 }], // 300px/2 = 150px offset
    zIndex: 10,
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
    backgroundColor: Platform.OS === 'web' ? 'rgba(0,0,0,0.9)' : 'transparent',
    position: 'relative',
    paddingBottom: 100, // Reduced padding since we now use spacer items for proper spacing
  },
  playlistHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  playlistHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e0af92',
  },
  playlistCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(224, 175, 146, 0.1)',
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
    backgroundColor: Platform.OS === 'web' ? 'rgba(0,0,0,0.95)' : '#000000',
  },
  userPlaylistScroll: {
    maxHeight: 500, // Large height for expanded playlist videos
    backgroundColor: Platform.OS === 'web' ? 'rgba(0,0,0,0.95)' : '#000000',
  },
  userPlaylistScrollExpanded: {
    maxHeight: 600, // Even larger height when playlist is the only one expanded
    backgroundColor: Platform.OS === 'web' ? 'rgba(0,0,0,0.95)' : '#000000',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111111', // Daha açık çizgi
    backgroundColor: Platform.OS === 'web' ? 'rgba(0,0,0,0.6)' : '#000000',
  },
  currentPlaylistItem: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(0,0,0,0.8)' : '#000000',
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
  
  // Web Video Controls Styles
  webVideoControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  webVideoInfo: {
    flex: 1,
    marginRight: 16,
  },
  webVideoTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, sans-serif' : undefined,
  },
  webVideoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webActionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
