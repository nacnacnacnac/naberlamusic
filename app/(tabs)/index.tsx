import CreatePlaylistModal from '@/components/CreatePlaylistModal';
import CustomModal from '@/components/CustomModal';
import LeftModal from '@/components/LeftModal';
import MainPlaylistModal from '@/components/MainPlaylistModal';
import MusicPlayerTabBar from '@/components/MusicPlayerTabBar';
import PlaylistModal from '@/components/PlaylistModal';
import ProfileModal from '@/components/ProfileModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Toast from '@/components/Toast';
import { CustomIcon } from '@/components/ui/CustomIcon';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { VimeoPlayerNative } from '@/components/VimeoPlayerNative';
import { useAuth } from '@/contexts/AuthContext';
import { useVimeo } from '@/contexts/VimeoContext';
import { useBackgroundAudio } from '@/hooks/useBackgroundAudio';
import { autoSyncService } from '@/services/autoSyncService';
import { hybridPlaylistService } from '@/services/hybridPlaylistService';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
import { logger } from '@/utils/logger';
import { Video } from 'expo-av';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, DeviceEventEmitter, Dimensions, Image, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Background video import
const backgroundVideo = require('@/assets/videos/NLA6.mp4');
const heartImage = require('@/assets/hearto.png');

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
  const { isAuthenticated, user } = useAuth();
  
  // Check if user is logged in with Google (not guest/developer)
  const isGoogleUser = isAuthenticated && user && user.email && !user.email.includes('developer@') && !user.email.includes('guest@');
  
  // Query params for shared videos
  const params = useLocalSearchParams();
  const [sharedVideoId, setSharedVideoId] = useState<string | null>(null);
  const [isSharedVideoLoading, setIsSharedVideoLoading] = useState(false);
  
  // Also try to get from URL directly on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      const vParam = urlParams.get('v');
      if (vParam) {
        setSharedVideoId(vParam);
        setIsSharedVideoLoading(true); // Start loading when shared video detected
      }
    }
    
    // Also check Expo Router params
    if (params.v) {
      setSharedVideoId(params.v as string);
      setIsSharedVideoLoading(true); // Start loading when shared video detected
    }
  }, [params.v]);
  
  const [currentVideo, setCurrentVideo] = useState<SimplifiedVimeoVideo | null>(null);
  const [currentPlaylistContext, setCurrentPlaylistContext] = useState<{playlistId: string, playlistName: string} | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(-1);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [shareToastVisible, setShareToastVisible] = useState(false);
  const shareToastOpacity = useRef(new Animated.Value(0)).current;
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isPlaylistExpanded, setIsPlaylistExpanded] = useState(true);
  const playlistAnimation = useRef(new Animated.Value(1)).current;
  
  // Page fade-in animation
  const pageOpacity = useRef(new Animated.Value(0)).current;
  
  // Landscape detection
  const [isLandscape, setIsLandscape] = useState(false);
  
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showMainPlaylistModal, setShowMainPlaylistModal] = useState(false);
  const [mainPlaylistInitialView, setMainPlaylistInitialView] = useState<'main' | 'selectPlaylist' | 'createPlaylist' | 'profile'>('main');
  const [isFromLikeButton, setIsFromLikeButton] = useState(false); // Like butonundan gelip gelmediğini takip et
  const mainPlaylistModalRef = useRef<any>(null);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [createPlaylistVideoId, setCreatePlaylistVideoId] = useState<string>('');
  const [createPlaylistVideoTitle, setCreatePlaylistVideoTitle] = useState<string>('');
  const [playlistRefreshTrigger, setPlaylistRefreshTrigger] = useState(0);
  const videoHeightAnimation = useRef(new Animated.Value(Platform.OS === 'web' ? 0.7 : 0)).current;
  const [pendingAutoPlay, setPendingAutoPlay] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const playlistScrollRef = useRef<ScrollView>(null);

  // Video Overlay State
  const [showVideoOverlay, setShowVideoOverlay] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const overlayTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isHeartFavorited, setIsHeartFavorited] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;

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

  // Orientation detection
  useEffect(() => {
    const checkOrientation = () => {
      const { width, height } = Dimensions.get('window');
      setIsLandscape(width > height);
    };

    checkOrientation();
    const subscription = Dimensions.addEventListener('change', checkOrientation);
    return () => subscription?.remove();
  }, []);

  // Set web body background to black
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.body.style.backgroundColor = '#000000';
      document.documentElement.style.backgroundColor = '#000000';
      
      return () => {
        // Cleanup on unmount
        document.body.style.backgroundColor = '';
        document.documentElement.style.backgroundColor = '';
      };
    }
  }, []);

  // Set web body background to black
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.body.style.backgroundColor = '#000000';
      document.documentElement.style.backgroundColor = '#000000';
      
      return () => {
        document.body.style.backgroundColor = '';
        document.documentElement.style.backgroundColor = '';
      };
    }
  }, []);

  // Page animations on mount
  useEffect(() => {
    // Page fade-in animation
    Animated.timing(pageOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

  }, []);


  // Handle shared video from URL params
  useEffect(() => {
    
    if (sharedVideoId && videos.length > 0) {
      console.log('🔗 Playing shared video:', sharedVideoId);
      
      const sharedVideo = videos.find(video => 
        video.id === sharedVideoId || video.id === String(sharedVideoId)
      );
      
      if (sharedVideo) {
        console.log('🔗 Found shared video:', sharedVideo.name);
        playVideo(sharedVideo, undefined, true); // Pass true for isSharedVideo
        // Stop loading when video is found and loaded
        setIsSharedVideoLoading(false);
        // Clear the URL param after playing
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('v');
          window.history.replaceState({}, '', url.toString());
        }
      } else {
        console.log('🔗 Shared video not found in current videos');
        console.log('🔗 Available video IDs:', videos.map(v => `${v.id} (${v.name})`));
        console.log('🔗 Searching for exact matches...');
        
        // Try different matching strategies
        const exactMatch = videos.find(v => v.id === sharedVideoId);
        const stringMatch = videos.find(v => String(v.id) === String(sharedVideoId));
        const containsMatch = videos.find(v => v.id.includes(sharedVideoId) || sharedVideoId.includes(v.id));
        
        console.log('🔗 Exact match:', exactMatch?.name || 'None');
        console.log('🔗 String match:', stringMatch?.name || 'None');
        console.log('🔗 Contains match:', containsMatch?.name || 'None');
      }
    } else if (sharedVideoId && videos.length === 0) {
      console.log('🔗 Shared video ID present but videos not loaded yet');
    }
  }, [sharedVideoId, videos]);

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
        setPlaylistsLoading(true);
        
        const playlists = await hybridPlaylistService.getPlaylists();
        
        // Add a delay to ensure loading state is visible (even with cache)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Remove duplicates by ID
        const uniquePlaylists = playlists.filter((playlist, index, self) => 
          index === self.findIndex(p => p.id === playlist.id)
        );
        
        // Filter playlists based on user type
        let filteredPlaylists = uniquePlaylists;
        if (!isGoogleUser) {
          // Non-Google users: only show admin playlists
          filteredPlaylists = uniquePlaylists.filter(playlist => playlist.isAdminPlaylist);
          logger.system('🔒 Non-Google user: filtered to', filteredPlaylists.length, 'admin playlists');
        }
        
        setUserPlaylists(filteredPlaylists);
        logger.system('Initial playlists loaded:', filteredPlaylists.length, 'playlists for', isGoogleUser ? 'Google user' : 'non-Google user');
        
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
      } finally {
        setPlaylistsLoading(false);
      }
    };
    
    const initializeAutoSync = async () => {
      try {
        // Set callback for automatic refresh when sync notifications are received
        autoSyncService.setOnSyncCallback(() => {
          // Auto-refreshing playlists due to admin sync
          refreshPlaylists();
        });
        
        await autoSyncService.initialize();
      } catch (error) {
        console.error('Error initializing auto sync:', error);
      }
    };
    
    loadPlaylists();
    // Only initialize auto sync for Google users
    if (isGoogleUser) {
      initializeAutoSync();
    }
  }, [isGoogleUser]); // Re-run when Google user status changes

  // Manual refresh function for pull-to-refresh and admin sync
  const refreshPlaylists = async () => {
    try {
      // Refreshing playlists...
      setPlaylistsLoading(true);
      
      const playlists = await hybridPlaylistService.getPlaylists(true); // Force refresh
      
      // Add a delay to ensure loading state is visible (even with cache)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Remove duplicates by ID
      const uniquePlaylists = playlists.filter((playlist, index, self) => 
        index === self.findIndex(p => p.id === playlist.id)
      );
      
      setUserPlaylists(uniquePlaylists);
      // Playlists refreshed
      
      // Keep current expanded state (don't auto-expand)
      // Users can manually expand playlists they want to see
      
    } catch (error) {
      console.error('Error refreshing playlists:', error);
    } finally {
      // Loading complete
      setPlaylistsLoading(false);
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
    // Toggle playlist expansion
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

  const playVideo = (video: SimplifiedVimeoVideo, playlistContext?: {playlistId: string, playlistName: string}, isSharedVideo: boolean = false) => {
    const videoIndex = videos.findIndex(v => v.id === video.id);
    
    debugLog.main('PLAYING NEW VIDEO:', `${video.title || video.name || 'Unknown'} at index: ${videoIndex}`);
    
    // FORCE STOP ALL AUDIO BEFORE PLAYING NEW VIDEO
    try {
      const { Audio } = require('expo-av');
      
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
    }
    
    // Check if new video is liked
    checkIfVideoIsLiked(video.id);
    
    // Set playlist context if provided
    if (playlistContext) {
      setCurrentPlaylistContext(playlistContext);
    }
    
    // Direct video switching with proper state management
    setCurrentVideo(video);
    setCurrentVideoIndex(videoIndex);
    setIsPaused(isSharedVideo); // Shared video: paused, normal video: play immediately
    
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
    
    // Video ready, but no autoplay - wait for user interaction
    setPendingAutoPlay(false);
    debugLog.main('🎬 Video ready, waiting for user interaction');
  };

  const handleVideoReady = () => {
    debugLog.main('🎬 Video ready callback triggered');
    
    // If video should play (not paused), start it
    if (!isPaused && vimeoPlayerRef.current) {
      debugLog.main('🎬 Auto-playing video after ready (not paused)');
      setTimeout(() => {
        vimeoPlayerRef.current?.play().catch(error => {
          debugLog.error('❌ Auto-play failed:', error);
        });
      }, 100);
    } else {
      debugLog.main('🎬 Video ready, waiting for user interaction (paused)');
    }
    
    // Show video overlay immediately when song changes
    showVideoOverlayWithTimer();
  };

  // Video Overlay Functions
  const showVideoOverlayWithTimer = () => {
    
    // Clear any existing timeout first
    if (overlayTimeout.current) {
      clearTimeout(overlayTimeout.current);
      overlayTimeout.current = null;
    }

    // Show overlay
    setShowVideoOverlay(true);
    
    // Animate in
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Hide after 4 seconds
    overlayTimeout.current = setTimeout(() => {
      hideVideoOverlay();
    }, 4000);
  };

  const hideVideoOverlay = () => {
    // Just animate out, don't change showVideoOverlay state
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
    });

    // Clear timeout
    if (overlayTimeout.current) {
      clearTimeout(overlayTimeout.current);
      overlayTimeout.current = null;
    }
  };

  const handleVideoHover = () => {
    if (Platform.OS === 'web' && currentVideo) {
      showVideoOverlayWithTimer();
    }
  };

  const handleVideoTap = () => {
    
    if (currentVideo) {
      // Always show overlay on tap, regardless of current state
      showVideoOverlayWithTimer();
    }
  };

  // Test function to show overlay immediately
  const testShowOverlay = () => {
    showVideoOverlayWithTimer();
  };

  const checkIfVideoIsLiked = async (videoId: string) => {
    try {
      const isLiked = await hybridPlaylistService.isVideoLiked(videoId);
      setIsHeartFavorited(isLiked);
      console.log('💖 Video liked status:', isLiked);
    } catch (error) {
      console.error('Error checking if video is liked:', error);
      setIsHeartFavorited(false);
    }
  };

  // Handle share video functionality
  const handleShareVideo = async () => {
    if (!currentVideo) return;
    
    console.log('🔗 Sharing video:', {
      id: currentVideo.id,
      name: currentVideo.name,
      title: currentVideo.title
    });
    
    try {
      const shareUrl = Platform.OS === 'web' && typeof window !== 'undefined' 
        ? `${window.location.origin}/?v=${currentVideo.id}`
        : `naberla.music/?v=${currentVideo.id}`;
      
      console.log('🔗 Generated share URL:', shareUrl);
      
      if (Platform.OS === 'web' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        console.log('🔗 Link copied to clipboard:', shareUrl);
        
        // Show inline toast next to share button with animation
        setShareToastVisible(true);
        Animated.timing(shareToastOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        
        // Hide toast after 2 seconds with fade out
        setTimeout(() => {
          Animated.timing(shareToastOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShareToastVisible(false);
          });
        }, 2000);
      } else {
        // Mobile: Show inline toast like web
        console.log('🔗 Share URL:', shareUrl);
        
        // Show inline toast next to share button with animation
        setShareToastVisible(true);
        Animated.timing(shareToastOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        
        // Hide toast after 2 seconds with fade out
        setTimeout(() => {
          Animated.timing(shareToastOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShareToastVisible(false);
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Error sharing video:', error);
      setToastMessage('Failed to copy link');
      setToastType('error');
      setToastVisible(true);
      
      setTimeout(() => {
        setToastVisible(false);
      }, 2000);
    }
  };

  const handleHeartPress = async () => {
    if (!currentVideo) return;
    
    console.log('❤️ Heart pressed - isAuthenticated:', isAuthenticated, 'user:', user, 'isGoogleUser:', isGoogleUser);
    
    // Check if user is logged in with Google
    if (!isGoogleUser) {
      console.log('❌ Not Google user - opening MainPlaylistModal with profile view for sign in');
      setIsFromLikeButton(true); // Like butonundan geldiğini işaretle
      
      // Modal'ı her zaman kapat ve yeniden aç - state reset için
      setShowMainPlaylistModal(false);
      // Reset MainPlaylistModal internal state
      if (mainPlaylistModalRef.current && mainPlaylistModalRef.current.resetToMain) {
        mainPlaylistModalRef.current.resetToMain();
      }
      setTimeout(() => {
        setMainPlaylistInitialView('profile');
        setShowMainPlaylistModal(true);
      }, 100);
      return;
    }
    
    // User is logged in - this is not from like button context anymore
    setIsFromLikeButton(false);
    
    // User is logged in - proceed with like functionality
    try {
      console.log('❤️ Heart pressed for video:', currentVideo.name);
      const newLikedState = await hybridPlaylistService.toggleLikedSong(currentVideo);
      setIsHeartFavorited(newLikedState);
      
      // Update playlists state immediately for better UX - force refresh to avoid cache issues
      try {
        // Wait for Firestore to process the change
        console.log('⏳ Waiting for Firestore to process the change...');
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Clear cache again to ensure fresh data
        await hybridPlaylistService.clearPlaylistCache();
        console.log('🗑️ Cache cleared again before refresh');
        
        const updatedPlaylists = await hybridPlaylistService.getPlaylists(true); // Force refresh to clear cache
        const uniquePlaylists = updatedPlaylists.filter((playlist, index, self) => 
          index === self.findIndex(p => p.id === playlist.id)
        );
        setUserPlaylists(uniquePlaylists);
      } catch (error) {
        console.error('Error updating playlists after heart toggle:', error);
      }
      
      console.log(`${newLikedState ? '❤️ Added to' : '💔 Removed from'} Liked Songs:`, currentVideo.name);
    } catch (error) {
      console.error('Error toggling liked song:', error);
    }
    
    // Heart scale animation
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleHeartHover = (isHovering: boolean) => {
    Animated.timing(heartScale, {
      toValue: isHovering ? 1.1 : 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
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

  const handleMuteToggle = async () => {
    try {
      const newMutedState = !isMuted;
      console.log('🔇 Mute toggle - State change:', isMuted, '→', newMutedState);
      
      // Update state immediately for UI responsiveness
      setIsMuted(newMutedState);
      
      // Apply mute to video player
      if (vimeoPlayerRef.current && vimeoPlayerRef.current.setMuted) {
        await vimeoPlayerRef.current.setMuted(newMutedState);
        console.log('🔇 Video player muted set to:', newMutedState);
      } else {
        console.warn('⚠️ Video player ref or setMuted method not available');
      }
    } catch (error) {
      console.error('❌ Mute toggle error:', error);
      // Revert state on error
      setIsMuted(!isMuted);
    }
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
      // Web'de main playlist modal'ını main view ile aç (her zaman playlist göster)
      console.log('🎵 Heart icon pressed - opening MainPlaylistModal with main view');
      setIsFromLikeButton(false); // Like butonundan gelmediğini işaretle
      
      // Modal'ı her zaman kapat ve yeniden aç - state reset için
      setShowMainPlaylistModal(false);
      // Reset MainPlaylistModal internal state
      if (mainPlaylistModalRef.current && mainPlaylistModalRef.current.resetToMain) {
        mainPlaylistModalRef.current.resetToMain();
      }
      setTimeout(() => {
        setMainPlaylistInitialView('main');
        setShowMainPlaylistModal(true);
      }, 100);
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

  // Handle playlist plus button - always opens MainPlaylistModal
  const handlePlaylistPlusButton = () => {
    setShowMainPlaylistModal(true);
  };


  // Handle profile button press - opens MainPlaylistModal with profile view
  const handleProfilePress = () => {
    // Eğer modal zaten açıksa, önce kapat sonra profile view ile aç
    if (showMainPlaylistModal) {
      setShowMainPlaylistModal(false);
      setTimeout(() => {
        setMainPlaylistInitialView('profile');
        setShowMainPlaylistModal(true);
      }, 100);
    } else {
      setMainPlaylistInitialView('profile');
      setShowMainPlaylistModal(true);
    }
  };

  const toggleFullscreen = () => {
    // This only affects intentional fullscreen mode, not normal playback
    // Normal playback should always stay within the 300px height constraint
    setIsFullscreen(!isFullscreen);
  };

  const playNextVideo = () => {
    console.log('🎵 PLAY NEXT VIDEO CALLED - videos.length:', videos.length, 'currentIndex:', currentVideoIndex);
    console.log('🎵 userPlaylists.length:', userPlaylists.length);
    console.log('🎵 currentVideo:', currentVideo ? currentVideo.name : 'null');
    console.log('🎵 currentPlaylistContext:', currentPlaylistContext);
    
    // Find current video in the specific playlist context
    let currentPlaylist = null;
    let currentVideoIndexInPlaylist = -1;
    
    // If we have playlist context, use that specific playlist
    if (currentPlaylistContext) {
      currentPlaylist = userPlaylists.find(p => p.id === currentPlaylistContext.playlistId);
      if (currentPlaylist && currentPlaylist.videos) {
        console.log('🎵 Searching in playlist:', currentPlaylistContext.playlistName, 'with', currentPlaylist.videos.length, 'videos');
        console.log('🎵 Looking for video ID:', currentVideo?.id, 'or vimeo_id:', currentVideo?.vimeo_id);
        
        const videoIndex = currentPlaylist.videos.findIndex((v: any) => {
          // Sadece tanımlı değerler için eşleşme kontrol et
          const currentId = currentVideo?.id;
          const currentVimeoId = currentVideo?.vimeo_id;
          const playlistId = v.id;
          const playlistVimeoId = v.vimeo_id;
          
          const match = (currentId && playlistId && currentId === playlistId) ||
                       (currentId && playlistVimeoId && currentId === playlistVimeoId) ||
                       (currentVimeoId && playlistId && currentVimeoId === playlistId) ||
                       (currentVimeoId && playlistVimeoId && currentVimeoId === playlistVimeoId);
          
          console.log(`🎵 Checking video ${v.title} (ID: ${playlistId}, vimeo_id: ${playlistVimeoId}) against current ${currentVideo?.title || currentVideo?.name} (ID: ${currentId}, vimeo_id: ${currentVimeoId}) - Match: ${match}`);
          return match;
        });
        if (videoIndex !== -1) {
          currentVideoIndexInPlaylist = videoIndex;
          console.log('🎵 Using playlist context:', currentPlaylistContext.playlistName);
          console.log('🎵 Found current video at index:', videoIndex, 'Video:', currentVideo?.title || currentVideo?.name);
          console.log('🎵 Playlist order:');
          currentPlaylist.videos.forEach((v: any, i: number) => {
            console.log(`  ${i}: ${v.title} (ID: ${v.id || v.vimeo_id})`);
          });
        } else {
          console.log('🎵 ❌ Current video not found in playlist!');
        }
      }
    }
    
    // Fallback: Find current video in playlists (prioritize admin playlists over Liked Songs)
    if (!currentPlaylist) {
      // First, try to find in non-Liked Songs playlists (admin playlists have priority)
      for (const playlist of userPlaylists) {
        if (playlist.videos && playlist.videos.length > 0 && !playlist.isLikedSongs) {
          const videoIndex = playlist.videos.findIndex((v: any) => 
            v.id === currentVideo?.id || v.vimeo_id === currentVideo?.id ||
            v.id === currentVideo?.vimeo_id || v.vimeo_id === currentVideo?.vimeo_id
          );
          if (videoIndex !== -1) {
            currentPlaylist = playlist;
            currentVideoIndexInPlaylist = videoIndex;
            console.log('🎵 Found in admin playlist:', playlist.name);
            break;
          }
        }
      }
      
      // If not found in admin playlists, then check Liked Songs
      if (!currentPlaylist) {
        for (const playlist of userPlaylists) {
          if (playlist.videos && playlist.videos.length > 0 && playlist.isLikedSongs) {
            const videoIndex = playlist.videos.findIndex((v: any) => 
              v.id === currentVideo?.id || v.vimeo_id === currentVideo?.id ||
              v.id === currentVideo?.vimeo_id || v.vimeo_id === currentVideo?.vimeo_id
            );
            if (videoIndex !== -1) {
              currentPlaylist = playlist;
              currentVideoIndexInPlaylist = videoIndex;
              console.log('🎵 Found in Liked Songs playlist');
              break;
            }
          }
        }
      }
    }
    
    if (!currentPlaylist || !currentPlaylist.videos || currentPlaylist.videos.length === 0) {
      console.log('🎵 No playlist found or playlist empty');
      return;
    }
    
    const nextIndex = (currentVideoIndexInPlaylist + 1) % currentPlaylist.videos.length;
    console.log('🎵 Current index in playlist:', currentVideoIndexInPlaylist, 'Next index:', nextIndex, 'Playlist length:', currentPlaylist.videos.length);
    const nextPlaylistVideo = currentPlaylist.videos[nextIndex];
    
    // Convert playlist video to Vimeo format
    const vimeoIdToUse = nextPlaylistVideo.vimeo_id || nextPlaylistVideo.id;
    const nextVideo = {
      id: vimeoIdToUse,
      name: nextPlaylistVideo.title,
      title: nextPlaylistVideo.title, // Add title field for playVideo function
      description: '',
      duration: nextPlaylistVideo.duration,
      thumbnail: nextPlaylistVideo.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=',
      videoUrl: '',
      embedUrl: `https://player.vimeo.com/video/${vimeoIdToUse}`,
      createdAt: '',
      plays: 0,
      likes: 0,
      embed: {
        html: `<iframe src="https://player.vimeo.com/video/${vimeoIdToUse}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
      },
      pictures: {
        sizes: [{ link: nextPlaylistVideo.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=' }]
      }
    };
    
    console.log('🎵 Playing next video from playlist:', nextVideo.name, 'at playlist index:', nextIndex);
    
    // Use playVideo to properly set all states and maintain playlist context
    playVideo(nextVideo, currentPlaylistContext);
    
    debugLog.main('Playing next video:', `${nextVideo.name} at index: ${nextIndex}`);
  };

  const playPreviousVideo = () => {
    console.log('🎵 PLAY PREVIOUS VIDEO CALLED - videos.length:', videos.length, 'currentIndex:', currentVideoIndex);
    console.log('🎵 userPlaylists.length:', userPlaylists.length);
    console.log('🎵 currentVideo:', currentVideo ? currentVideo.name : 'null');
    console.log('🎵 currentPlaylistContext:', currentPlaylistContext);
    
    // Find current video in the specific playlist context
    let currentPlaylist = null;
    let currentVideoIndexInPlaylist = -1;
    
    // If we have playlist context, use that specific playlist
    if (currentPlaylistContext) {
      currentPlaylist = userPlaylists.find(p => p.id === currentPlaylistContext.playlistId);
      if (currentPlaylist && currentPlaylist.videos) {
        const videoIndex = currentPlaylist.videos.findIndex((v: any) => {
          // Sadece tanımlı değerler için eşleşme kontrol et
          const currentId = currentVideo?.id;
          const currentVimeoId = currentVideo?.vimeo_id;
          const playlistId = v.id;
          const playlistVimeoId = v.vimeo_id;
          
          const match = (currentId && playlistId && currentId === playlistId) ||
                       (currentId && playlistVimeoId && currentId === playlistVimeoId) ||
                       (currentVimeoId && playlistId && currentVimeoId === playlistId) ||
                       (currentVimeoId && playlistVimeoId && currentVimeoId === playlistVimeoId);
          
          return match;
        });
        if (videoIndex !== -1) {
          currentVideoIndexInPlaylist = videoIndex;
          console.log('🎵 Using playlist context:', currentPlaylistContext.playlistName);
        }
      }
    }
    
    // Fallback: Find current video in playlists (prioritize admin playlists over Liked Songs)
    if (!currentPlaylist) {
      // First, try to find in non-Liked Songs playlists (admin playlists have priority)
      for (const playlist of userPlaylists) {
        if (playlist.videos && playlist.videos.length > 0 && !playlist.isLikedSongs) {
          const videoIndex = playlist.videos.findIndex((v: any) => 
            v.id === currentVideo?.id || v.vimeo_id === currentVideo?.id ||
            v.id === currentVideo?.vimeo_id || v.vimeo_id === currentVideo?.vimeo_id
          );
          if (videoIndex !== -1) {
            currentPlaylist = playlist;
            currentVideoIndexInPlaylist = videoIndex;
            console.log('🎵 Found in admin playlist:', playlist.name);
            break;
          }
        }
      }
      
      // If not found in admin playlists, then check Liked Songs
      if (!currentPlaylist) {
        for (const playlist of userPlaylists) {
          if (playlist.videos && playlist.videos.length > 0 && playlist.isLikedSongs) {
            const videoIndex = playlist.videos.findIndex((v: any) => 
              v.id === currentVideo?.id || v.vimeo_id === currentVideo?.id ||
              v.id === currentVideo?.vimeo_id || v.vimeo_id === currentVideo?.vimeo_id
            );
            if (videoIndex !== -1) {
              currentPlaylist = playlist;
              currentVideoIndexInPlaylist = videoIndex;
              console.log('🎵 Found in Liked Songs playlist');
              break;
            }
          }
        }
      }
    }
    
    if (!currentPlaylist || !currentPlaylist.videos || currentPlaylist.videos.length === 0) {
      console.log('🎵 No playlist found or playlist empty');
      return;
    }
    
    const prevIndex = currentVideoIndexInPlaylist <= 0 ? currentPlaylist.videos.length - 1 : currentVideoIndexInPlaylist - 1;
    console.log('🎵 Current index in playlist:', currentVideoIndexInPlaylist, 'Previous index:', prevIndex, 'Playlist length:', currentPlaylist.videos.length);
    const prevPlaylistVideo = currentPlaylist.videos[prevIndex];
    
    // Convert playlist video to Vimeo format
    const vimeoIdToUse = prevPlaylistVideo.vimeo_id || prevPlaylistVideo.id;
    const prevVideo = {
      id: vimeoIdToUse,
      name: prevPlaylistVideo.title,
      title: prevPlaylistVideo.title, // Add title field for playVideo function
      description: '',
      duration: prevPlaylistVideo.duration,
      thumbnail: prevPlaylistVideo.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=',
      videoUrl: '',
      embedUrl: `https://player.vimeo.com/video/${vimeoIdToUse}`,
      createdAt: '',
      plays: 0,
      likes: 0,
      embed: {
        html: `<iframe src="https://player.vimeo.com/video/${vimeoIdToUse}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
      },
      pictures: {
        sizes: [{ link: prevPlaylistVideo.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=' }]
      }
    };
    
    console.log('🎵 Playing previous video from playlist:', prevVideo.name, 'at playlist index:', prevIndex);
    
    // Use playVideo to properly set all states and maintain playlist context
    playVideo(prevVideo, currentPlaylistContext);
    
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
        stopAllMusic,
        testShowOverlay, // Add overlay test function
        getCurrentVideo: () => currentVideo,
        getCurrentPlaylistContext: () => currentPlaylistContext,
        getUserPlaylists: () => userPlaylists,
        playNextVideo: () => playNextVideo(),
        playPreviousVideo: () => playPreviousVideo()
      };
    }
  }, []);

  // Cleanup overlay timeout on unmount
  useEffect(() => {
    return () => {
      if (overlayTimeout.current) {
        clearTimeout(overlayTimeout.current);
      }
    };
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

  // Show loading overlay for shared videos
  if (isSharedVideoLoading) {
    return (
      <ThemedView style={[styles.container, styles.darkContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.sharedVideoLoadingContainer}>
          <Image 
            source={require('@/assets/images/loading.gif')} 
            style={styles.sharedVideoLoadingGif}
            resizeMode="contain"
          />
          <ThemedText style={styles.sharedVideoLoadingText}>Loading video...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <Animated.View style={[
      styles.container, 
      styles.darkContainer, 
      Platform.OS === 'web' ? { justifyContent: 'flex-end', paddingBottom: 34 } : {},
      { opacity: pageOpacity }
    ]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Safe Area for Camera Notch */}
      <ThemedView style={styles.safeAreaTop} />
      
      {/* Video Player Area with smooth height animation */}
      <Animated.View style={[
        styles.playerArea, 
        isFullscreen && styles.fullscreenPlayer,
        isLandscape && styles.landscapePlayerArea, // New style for landscape
        Platform.OS === 'web' && {
          height: isLandscape ? '100vh' : videoHeightAnimation.interpolate({
            inputRange: [0.7, 1],
            outputRange: ['70vh', '100vh']
          })
        }
      ]}>
        {currentVideo ? (
          <>
            {/* Video Player Container with Interaction Handlers */}
            {Platform.OS === 'web' ? (
              <div 
                style={{ width: '100%', height: '100%' }}
                onMouseEnter={handleVideoHover}
                onClick={handleVideoTap}
                onMouseLeave={() => {
                  // Optional: Hide overlay on mouse leave if you want immediate hiding
                }}
              >
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
              </div>
            ) : (
              <View style={{ width: '100%', height: '100%', position: 'relative' }}>
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
              </View>
            )}

            {/* Universal tap area - ALL PLATFORMS */}
            {currentVideo && !isFullscreen && (
              <TouchableOpacity 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'transparent',
                  zIndex: 9999,
                }}
                onPress={() => {
                  // Smooth overlay animation
                  if (currentVideo) {
                    setShowVideoOverlay(true);
                    
                    // Animate in
                    Animated.timing(overlayOpacity, {
                      toValue: 1,
                      duration: 300,
                      useNativeDriver: true,
                    }).start();
                    
                    // Hide after 4 seconds with animation
                    setTimeout(() => {
                      Animated.timing(overlayOpacity, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                      }).start();
                    }, 4000);
                  }
                }}
                activeOpacity={0.8}
              />
            )}

            {/* Video Overlay - Song Title */}
            {currentVideo && !isFullscreen && (
              <Animated.View 
                style={[
                  styles.videoOverlay,
                  { opacity: overlayOpacity }
                ]}
                pointerEvents="none"
              >
                
                {/* Gradient Background */}
                <LinearGradient
                  colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.4)', 'transparent']}
                  style={styles.videoOverlayGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />
                
                {/* Content - Sadece text */}
                <View style={[
                  styles.videoOverlayContent,
                  { 
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    alignSelf: 'flex-start',
                    paddingVertical: 10,
                    paddingLeft: Platform.OS === 'web' ? 18 : 20, // Web'de minimal sol padding
                  }
                ]}>
                  {/* Sanatçı adı */}
                  <Text style={[
                    styles.videoOverlayArtist,
                    { 
                      textAlign: 'left',
                      marginBottom: 2,
                    }
                  ]} numberOfLines={1}>
                    {(() => {
                      const fullTitle = currentVideo.name || currentVideo.title || 'Untitled Video';
                      const parts = fullTitle.split(' - ');
                      return parts.length > 1 ? parts[0] : 'Unknown Artist';
                    })()}
                  </Text>
                  
                  {/* Şarkı adı */}
                  <Text style={[
                    styles.videoOverlaySong,
                    { 
                      textAlign: 'left',
                    }
                  ]} numberOfLines={1}>
                    {(() => {
                      const fullTitle = currentVideo.name || currentVideo.title || 'Untitled Video';
                      const parts = fullTitle.split(' - ');
                      return parts.length > 1 ? parts.slice(1).join(' - ') : fullTitle;
                    })()}
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Share and Heart Icons - OUTSIDE overlay */}
            {currentVideo && !isFullscreen && (
              <Animated.View 
                style={[
                  {
                    position: 'absolute',
                    ...(Platform.OS === 'web'
                      ? { top: 25, right: 25 } // Hem desktop hem mobile web'de üstte
                      : { bottom: 150, right: 25 } // Sadece native mobile'da altta
                    ),
                    opacity: overlayOpacity,
                    zIndex: 10001, // En yüksek z-index
                    flexDirection: (Platform.OS === 'web' && width > 768) ? 'row' : 'column', // Desktop web'de yan yana, mobil web'de alt alta
                    alignItems: 'center',
                    gap: (Platform.OS === 'web' && width > 768) ? 15 : 10, // Desktop web'de 15px, mobil web'de 10px
                  }
                ]}
                pointerEvents="box-none"
              >
                {/* Web'de: Share solda, Heart sağda | Mobilde: Heart üstte, Share altta */}
                {(Platform.OS === 'web' && width > 768) ? (
                  <>
                    {/* Share Button with Inline Toast - Web'de solda */}
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {/* Inline Toast - Sol tarafta */}
                      {shareToastVisible && (
                        <Animated.View
                          style={{
                            marginRight: 8,
                            backgroundColor: 'white',
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            shadowColor: '#000',
                            shadowOffset: {
                              width: 0,
                              height: 2,
                            },
                            shadowOpacity: 0.25,
                            shadowRadius: 3.84,
                            elevation: 5,
                            opacity: shareToastOpacity,
                          }}
                        >
                          <Text style={{
                            color: 'black',
                            fontSize: 12,
                            fontWeight: '500',
                          }}>
                            Link copied!
                          </Text>
                        </Animated.View>
                      )}
                      
                      <TouchableOpacity
                        onPress={() => {
                          console.log('🔗 SHARE BUTTON PRESSED!');
                          handleShareVideo();
                        }}
                        activeOpacity={0.7}
                        style={{ 
                          padding: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'transparent',
                        }}
                      >
                        <Image 
                          source={require('../../assets/images/link2.png')}
                          style={{ 
                            width: Platform.OS === 'web' ? 24 : 20, 
                            height: Platform.OS === 'web' ? 24 : 20, 
                            tintColor: 'white' 
                          }}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Heart Button - Web'de sağda */}
                    <TouchableOpacity
                      onPress={() => {
                        console.log('❤️ HEART BUTTON PRESSED!');
                        handleHeartPress();
                      }}
                      activeOpacity={0.7}
                      style={{ 
                        padding: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'transparent',
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        backgroundColor: isHeartFavorited ? '#e0af92' : 'white',
                        mask: 'url(/hearto.png) no-repeat center',
                        maskSize: 'contain',
                        WebkitMask: 'url(/hearto.png) no-repeat center',
                        WebkitMaskSize: 'contain',
                      }} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* Mobilde: Heart üstte, Share altta */}
                    {/* Heart Button - Mobilde üstte */}
                    <TouchableOpacity
                      onPress={() => {
                        console.log('❤️ HEART BUTTON PRESSED!');
                        handleHeartPress();
                      }}
                      activeOpacity={0.7}
                      style={{ 
                        padding: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'transparent',
                      }}
                    >
                      <Image
                        source={heartImage}
                        style={{
                          width: 35, // 25 * 1.4 = 35 (daha büyük)
                          height: 35,
                          tintColor: isHeartFavorited ? "#e0af92" : "white",
                        }}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>

                    {/* Share Button with Inline Toast - Mobilde altta */}
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative', // Toast için relative positioning
                    }}>
                      {/* Inline Toast - Sol tarafta */}
                      {shareToastVisible && (
                        <Animated.View
                          style={{
                            position: 'absolute',
                            right: 50, // Share butonunun solunda
                            backgroundColor: 'white',
                            borderRadius: 12,
                            paddingHorizontal: 16, // Daha geniş padding
                            paddingVertical: 6,
                            minWidth: 100, // Minimum genişlik
                            shadowColor: '#000',
                            shadowOffset: {
                              width: 0,
                              height: 2,
                            },
                            shadowOpacity: 0.25,
                            shadowRadius: 3.84,
                            elevation: 5,
                            zIndex: 10002, // Toast için yüksek z-index
                            opacity: shareToastOpacity,
                          }}
                        >
                          <Text 
                            numberOfLines={1}
                            style={{
                              color: 'black',
                              fontSize: 12,
                              fontWeight: '500',
                              textAlign: 'center',
                              whiteSpace: 'nowrap', // Web için tek satır
                            }}
                          >
                            Link copied!
                          </Text>
                        </Animated.View>
                      )}
                      
                      <TouchableOpacity
                        onPress={() => {
                          console.log('🔗 SHARE BUTTON PRESSED!');
                          handleShareVideo();
                        }}
                        activeOpacity={0.7}
                        style={{ 
                          padding: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'transparent',
                        }}
                      >
                        <Image 
                          source={require('../../assets/images/link2.png')}
                          style={{ 
                            width: 35, // Mobile: 25 * 1.4 = 35 (daha büyük)
                            height: 35, 
                            tintColor: 'white' 
                          }}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </Animated.View>
            )}
            
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
            
            
            {/* Dark overlay for better text readability */}
            <LinearGradient
              colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)']}
              style={styles.backgroundVideoOverlay}
            />
          </View>
        )}
      </Animated.View>

      {/* Header Gradient - Only over video - Portrait Mode - Hidden when song is playing */}
      {!isLandscape && !currentVideo && (
        <LinearGradient
          colors={['rgba(0,0,0,1)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']}
          style={styles.headerGradient}
        />
      )}

      {/* Side Gradients - Only in Landscape Mode - Hidden when song is playing */}
      {isLandscape && !currentVideo && (
        <>
          {/* Left Gradient */}
          <LinearGradient
            colors={['rgba(0,0,0,1)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.leftSideGradient}
          />
          {/* Right Gradient */}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.rightSideGradient}
          />
        </>
      )}

      {/* Video Info Area - Hidden on web and landscape for cleaner look */}
      {currentVideo && !isFullscreen && !isLandscape && Platform.OS !== 'web' && (
        <ThemedView style={styles.videoInfoArea}>
          <ThemedView style={styles.titleContainer}>
            <ThemedView style={styles.titleTextContainer}>
              <ThemedText style={styles.currentVideoTitle} numberOfLines={2}>
                {currentVideo.name || currentVideo.title || 'Untitled Video'}
              </ThemedText>
            </ThemedView>
            <View style={styles.headerActions}>
              
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

      {/* Playlist Area - Show only when expanded with smooth animation - Hidden on Web and Landscape */}
      {!isFullscreen && !isLandscape && Platform.OS !== 'web' && (
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
          {/* Playlist Header with Preview + Plus Button */}
          <ThemedView style={styles.playlistHeaderContainer}>
            <View style={styles.playlistPreviewContainer}>
              {/* Show first 2 playlists */}
              {userPlaylists.slice(0, 2).map((playlist, index) => (
                <TouchableOpacity
                  key={playlist.id}
                  style={styles.playlistPreviewItem}
                  onPress={() => togglePlaylistExpansion(playlist.id)}
                  activeOpacity={0.7}
                >
                  <ExpoImage 
                    source={require('@/assets/images/playlist.svg')}
                    style={styles.playlistPreviewIcon}
                    contentFit="contain"
                  />
                  <ThemedText style={styles.playlistPreviewTitle} numberOfLines={1}>
                    {playlist.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}
              
              {/* Plus Button - Available for all users */}
              <TouchableOpacity
                style={styles.playlistPlusButton}
                onPress={handlePlaylistPlusButton}
                activeOpacity={0.7}
              >
                <CustomIcon name="plus" size={20} color="#e0af92" />
              </TouchableOpacity>
            </View>
            
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
                              title: playlistVideo.title,
                              description: '',
                              duration: playlistVideo.duration,
                              thumbnail: playlistVideo.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=',
                              videoUrl: '',
                              embedUrl: `https://player.vimeo.com/video/${vimeoIdToUse}`,
                              createdAt: '',
                              plays: 0,
                              likes: 0,
                              embed: {
                                html: `<iframe src="https://player.vimeo.com/video/${vimeoIdToUse}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
                              },
                              pictures: {
                                sizes: [{ link: playlistVideo.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=' }]
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
      {(Platform.OS === 'web' ? !isFullscreen : true) && (
        <MusicPlayerTabBar
          currentVideo={currentVideo}
          isPaused={isPaused}
          isMuted={isMuted}
          onPlayPause={handlePlayPause}
          onPrevious={playPreviousVideo}
          onNext={playNextVideo}
          onAddToPlaylist={() => {
            handleAddToPlaylist(currentVideo);
          }}
          onMuteToggle={handleMuteToggle}
          onPlaylistToggle={handleHeartIconPress}
          testState={testState}
          onTestStateChange={setTestState}
        />
      )}

      {/* Main Playlist Modal for Web - Sol taraftan */}
      {Platform.OS === 'web' && (
        <LeftModal
          visible={showMainPlaylistModal}
          onClose={() => {
            console.log('🔄 LeftModal onClose - resetting states, isFromLikeButton:', isFromLikeButton);
            setShowMainPlaylistModal(false);
            // Sadece like butonundan gelmiyorsa main view'a reset et
            if (!isFromLikeButton) {
              setMainPlaylistInitialView('main'); // Reset to main when modal closes
              // Reset MainPlaylistModal internal state if ref exists
              if (mainPlaylistModalRef.current && mainPlaylistModalRef.current.resetToMain) {
                mainPlaylistModalRef.current.resetToMain();
              }
            }
            // Like button flag'ini her zaman reset et
            setIsFromLikeButton(false);
          }}
          height={600}
        >
          <MainPlaylistModal 
            ref={mainPlaylistModalRef}
            onClose={() => {
              setShowMainPlaylistModal(false);
              setMainPlaylistInitialView('main'); // Reset to main view when closing
            }}
            userPlaylists={userPlaylists}
            expandedPlaylists={expandedPlaylists}
            onTogglePlaylistExpansion={togglePlaylistExpansion}
            onPlayVideo={playVideo}
            currentVideo={currentVideo}
            onRefresh={onRefresh}
            refreshing={refreshing}
            refreshTrigger={playlistRefreshTrigger}
            initialView={mainPlaylistInitialView}
            disableAutoSwitch={isFromLikeButton}
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

          {/* Profile Modal for Web - Sağ alt köşeden açılır */}
          {Platform.OS === 'web' && (
            <CustomModal
              visible={showProfileModal}
              onClose={() => setShowProfileModal(false)}
              width={400}
              height={450} // Daha kompakt
              bottomOffset={0} // En altta
            >
              <ProfileModal 
                onClose={() => setShowProfileModal(false)}
              />
            </CustomModal>
          )}

    </Animated.View>
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
  
  // Shared Video Loading
  sharedVideoLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  sharedVideoLoadingGif: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  sharedVideoLoadingText: {
    fontSize: 18,
    color: 'white',
    fontWeight: '500',
  },
  playlistLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
    minHeight: 120,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  playlistLoadingGif: {
    width: 40,
    height: 40,
    marginBottom: 10,
  },
  playlistLoadingText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
  playlistPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playlistPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(224, 175, 146, 0.1)',
    borderRadius: 8,
    maxWidth: 120,
  },
  playlistPreviewIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  playlistPreviewTitle: {
    fontSize: 14,
    color: '#e0af92',
    fontWeight: '500',
    flex: 1,
  },
  playlistPlusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(224, 175, 146, 0.1)',
    borderWidth: 1,
    borderColor: '#e0af92',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
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

  // Video Overlay Styles
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'web' ? '30%' : 120,
    zIndex: 1000, // Çok yüksek z-index
    pointerEvents: 'box-none', // İçerideki elementlerin tıklanabilir olması için
  },
  videoOverlayGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoOverlayContent: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 15,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent kaldırıldı - şarkı ismi kadar yer kaplasın
    zIndex: 1001, // Content'in görünmesi için
    pointerEvents: 'box-none', // Heart'ın tıklanabilir olması için
  },
  videoOverlayTitle: {
    // Eski style - artık kullanılmıyor
    fontSize: Platform.OS === 'web' ? 32 : 14,
    fontWeight: 'bold',
    color: 'white',
    lineHeight: Platform.OS === 'web' ? 36 : 18,
  },
  videoOverlayArtist: {
    fontSize: Platform.OS === 'web' ? 28 : 13, // Sanatçı adı - mobilde 13px
    fontWeight: 'bold',
    color: 'white',
    lineHeight: Platform.OS === 'web' ? 32 : 16,
  },
  videoOverlaySong: {
    fontSize: Platform.OS === 'web' ? 20 : 8, // Şarkı adı - mobilde 8px
    fontWeight: '400', // Normal weight
    color: 'rgba(255,255,255,0.9)', // Biraz daha soluk
    lineHeight: Platform.OS === 'web' ? 24 : 10,
  },
  // Landscape Player Area
  landscapePlayerArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100vh',
    width: '100vw',
    zIndex: 1000, // En üstte olsun
  },
  // Gradient Overlays
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150, // Header'dan aşağı gradient
    zIndex: 2, // Overlay'in üzerinde ama content'in altında
  },
  leftSideGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 150, // Soldan sağa gradient
    zIndex: 2, // Overlay'in üzerinde ama content'in altında
  },
  rightSideGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 150, // Sağdan sola gradient
    zIndex: 2, // Overlay'in üzerinde ama content'in altında
  },
});
