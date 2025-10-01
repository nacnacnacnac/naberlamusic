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
import { useNativeMediaSession } from '@/hooks/useNativeMediaSession';
import { hybridPlaylistService } from '@/services/hybridPlaylistService';
import { hybridVimeoService } from '@/services/hybridVimeoService';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
import { logger } from '@/utils/logger';
// Video component now handled by expo-video in VimeoPlayerNative
import { Image as ExpoImage } from 'expo-image';
import { useVideoPlayer, VideoView, VideoSource } from 'expo-video';
import { useEvent, useEventListener } from 'expo';
// import * as VideoThumbnails from 'expo-video-thumbnails'; // Artık kullanmıyoruz - Vimeo thumbnail'ları kullanıyoruz
// Background audio handled by expo-video SDK 54
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, DeviceEventEmitter, Dimensions, Easing, Image as RNImage, Modal, Platform, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image'; // Use Expo Image for better caching and performance
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Clipboard from 'expo-clipboard';

// Background video imports
const backgroundVideo = require('@/assets/videos/NLA6.mp4'); // Desktop/web için
const mobileBackgroundVideo = require('@/assets/videos/NLA_mobil.mp4'); // Native mobile için
const heartImage = require('@/assets/hearto.png');
const loadingHeartImage = require('@/assets/images/animation/heart.png'); // Animated heart for loading

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

const { width } = Dimensions.get('screen');

// Safe mobile web detection - only check on web platform
const isMobileWeb = Platform.OS === 'web' && 
  width <= 768 && 
  (typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string' ? 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) : 
    false);

export default function HomeScreen() {
  const { videos, isConfigured, isLoading, refreshVideos } = useVimeo();
  const { isConfigured: isBackgroundAudioConfigured } = useBackgroundAudio();
  const { isAuthenticated, user } = useAuth();
  
  // Background video player for native
  const backgroundVideoPlayer = useVideoPlayer(mobileBackgroundVideo, player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  // Background video control - pause when main video is playing
  useEffect(() => {
    if (backgroundVideoPlayer) {
      if (currentVideo) {
        // Main video var, background'u duraklat
        backgroundVideoPlayer.pause();
        console.log('🎬 Background video paused - main video playing');
      } else {
        // Main video yok, background'u başlat
        backgroundVideoPlayer.play();
        console.log('🎬 Background video resumed - no main video');
      }
    }
  }, [currentVideo, backgroundVideoPlayer]);


  
  // Web-specific DOM setup
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Set body background and styles
      document.body.style.backgroundColor = '#000000';
      document.documentElement.style.backgroundColor = '#000000';
      
      // Add CSS for safe areas
      document.body.style.cssText += `
        background-color: #000000 !important;
        margin: 0 !important;
        padding-top: env(safe-area-inset-top, 0) !important;
        padding-bottom: env(safe-area-inset-bottom, 0) !important;
        padding-left: env(safe-area-inset-left, 0) !important;
        padding-right: env(safe-area-inset-right, 0) !important;
      `;
      document.documentElement.style.cssText += `
        background-color: #000000 !important;
      `;
      
      // Disable scroll
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      
      // Cleanup on unmount
      return () => {
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
      };
    }
  }, []);
  
  // Debug: Log video selection
  useEffect(() => {
    console.log('📱 Mobile Web Detection:', {
      isMobileWeb,
      width,
      userAgent: Platform.OS === 'web' && typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string' ? navigator.userAgent : 'N/A',
      selectedVideo: isMobileWeb ? 'NLA_mobil.mp4 (Mobile)' : 'NLA6.mp4 (Desktop)'
    });
  }, []);
  
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
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [currentMetadata, setCurrentMetadata] = useState<any>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false); // Track if video is actually playing
  const [isTransitioning, setIsTransitioning] = useState(false); // Hide video during swipe
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev' | null>(null); // Track swipe direction
  const transitionThumbnailRef = useRef<string | null>(null); // Store thumbnail BEFORE state changes
  
  // Swipeable video states
  const [nextVideoThumbnail, setNextVideoThumbnail] = useState<string | null>(null);
  const [prevVideoThumbnail, setPrevVideoThumbnail] = useState<string | null>(null);
  const swipeTranslateY = useRef(new Animated.Value(0)).current;
  const thumbnailOpacity = useRef(new Animated.Value(0)).current;
  
  // Loading overlay heartbeat animation
  const loadingHeartScale = useRef(new Animated.Value(1)).current;
  
  // Loading heartbeat animation function
  const startLoadingHeartbeat = useCallback(() => {
    // Sadece loading durumunda çalışsın
    if (!currentVideo || isVideoReady) {
      return;
    }
    
    const animationRef = Animated.loop(
      Animated.sequence([
        // First beat
        Animated.timing(loadingHeartScale, {
          toValue: 1.3,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(loadingHeartScale, {
          toValue: 0.9,
          duration: 150,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // Second beat
        Animated.timing(loadingHeartScale, {
          toValue: 1.2,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(loadingHeartScale, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        // Pause between beats
        Animated.timing(loadingHeartScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    
    animationRef.start();
    
    // Cleanup function
    return () => {
      animationRef.stop();
    };
  }, [loadingHeartScale, currentVideo, isVideoReady]);

  // Animation reference to control it
  const loadingAnimationRef = useRef<any>(null);

  // Start loading heartbeat when video is loading
  useEffect(() => {
    // Stop any existing animation first
    if (loadingAnimationRef.current) {
      loadingAnimationRef.current.stop();
      loadingAnimationRef.current = null;
    }
    
    if (currentVideo && !isVideoReady) {
      // Start animation only when loading overlay is visible
      const cleanup = startLoadingHeartbeat();
      if (cleanup) {
        loadingAnimationRef.current = { stop: cleanup };
      }
    } else {
      // Reset scale when not loading
      loadingHeartScale.stopAnimation();
      loadingHeartScale.setValue(1);
    }
    
    return () => {
      if (loadingAnimationRef.current) {
        loadingAnimationRef.current.stop();
        loadingAnimationRef.current = null;
      }
    };
  }, [currentVideo, isVideoReady, startLoadingHeartbeat, loadingHeartScale]);

  // Thumbnail visibility state tracking (removed verbose logging)
  useEffect(() => {
    const shouldShowNext = (isTransitioning && transitionDirection === 'next') || (transitionDirection === 'next' && !isVideoPlaying);
    // Removed: THUMBNAIL STATE log (too verbose)
  }, [isTransitioning, transitionDirection, isVideoPlaying, isVideoReady]);

  // Background audio handled by expo-video SDK 54 automatically

  // Media session handled by expo-video SDK 54 automatically
  const { setMediaMetadata, updatePlaybackState } = useNativeMediaSession();


  // Ana video için player - currentVideo'dan sonra tanımla
  const mainVideoPlayer = useVideoPlayer('', player => {
    player.loop = false;
    player.muted = false; // Normal ses çıkışı
    
    // Background audio ve media session için ayarlar
    if (Platform.OS !== 'web') {
      try {
        // Audio session category ayarla - background audio için
        player.audioMixingMode = 'duckOthers'; // Background'da çalmaya devam et
        
        // Media session için metadata ayarla
        player.showNowPlayingNotification = true; // Lock screen kontrolleri
        
        // Background playback için ek ayarlar
        player.staysActiveInBackground = true; // Background'da aktif kal
        
        // iOS Remote Command Center için - API kontrolü
        console.log('🎵 🎛️ Configuring lock screen controls...');
        
        // Multiple attempts to disable skip commands
        if (typeof player.setRemoteCommandsEnabled === 'function') {
          try {
            player.setRemoteCommandsEnabled({
              nextTrack: true, // ⏭️ Next şarkı (sağ ok)
              previousTrack: true, // ⏮️ Previous şarkı (sol ok)
              skipForward: false, // ❌ 10s ileri kapatıldı
              skipBackward: false, // ❌ 10s geri kapatıldı
              seekForward: false, // ❌ Seek forward kapatıldı
              seekBackward: false, // ❌ Seek backward kapatıldı
              seek: false, // ❌ Seek bar kapatıldı (skip'i önlemek için)
              play: true, // ▶️ Play
              pause: true // ⏸️ Pause
            });
            console.log('🎵 ✅ Lock screen: All skip/seek disabled, only track change enabled');
          } catch (error) {
            console.log('🎵 ❌ Remote commands setup error:', error);
          }
        }
        
        // Alternative API attempts - More aggressive
        if (typeof player.disableRemoteCommand === 'function') {
          try {
            player.disableRemoteCommand('skipForward');
            player.disableRemoteCommand('skipBackward');
            player.disableRemoteCommand('seekForward');
            player.disableRemoteCommand('seekBackward');
            player.disableRemoteCommand('changePlaybackPosition');
            player.enableRemoteCommand('nextTrack');
            player.enableRemoteCommand('previousTrack');
            console.log('🎵 ✅ Alternative API: All skip/seek commands disabled');
          } catch (error) {
            console.log('🎵 ❌ Alternative API error:', error);
          }
        }
        
        // Try to set skip intervals to empty
        try {
          if (typeof player.setSkipIntervals === 'function') {
            player.setSkipIntervals([]);
            console.log('🎵 ✅ Skip intervals cleared');
          }
          
          if (typeof player.setPreferredSkipIntervals === 'function') {
            player.setPreferredSkipIntervals([]);
            console.log('🎵 ✅ Preferred skip intervals cleared');
          }
          
          // Additional properties to try
          if (player.skipForwardInterval !== undefined) {
            player.skipForwardInterval = 0;
            console.log('🎵 ✅ Skip forward interval set to 0');
          }
          
          if (player.skipBackwardInterval !== undefined) {
            player.skipBackwardInterval = 0;
            console.log('🎵 ✅ Skip backward interval set to 0');
          }
          
        } catch (error) {
          console.log('🎵 ⚠️ Additional skip config error:', error);
        }
        
        // iOS-specific remote command center
        if (typeof player.configureRemoteCommandCenter === 'function') {
          try {
            player.configureRemoteCommandCenter({
              skipForwardCommand: { enabled: false },
              skipBackwardCommand: { enabled: false },
              nextTrackCommand: { enabled: true },
              previousTrackCommand: { enabled: true }
            });
            console.log('🎵 ✅ iOS Remote Command Center configured');
          } catch (error) {
            console.log('🎵 ❌ iOS Remote Command Center error:', error);
          }
        }
        
        if (!player.setRemoteCommandsEnabled && !player.disableRemoteCommand && !player.configureRemoteCommandCenter) {
          console.log('🎵 ⚠️ No remote command APIs available - relying on app.json config');
        }
        
        // iOS Media Session için ek ayarlar
        if (player.allowsExternalPlayback !== undefined) {
          player.allowsExternalPlayback = true; // AirPlay desteği
        }
        
        console.log('🎵 Background audio and media session configured');
      } catch (error) {
        console.log('🎵 Audio/Media session setup error:', error);
      }
    }
  });

  // 🎬 Instagram Style: Single VideoView + Thumbnails
  // Stack state tracking - Only thumbnails, no extra players
  const [prevVideo, setPrevVideo] = useState<any>(null);
  const [nextVideo, setNextVideo] = useState<any>(null);
  const isRotatingRef = useRef(false); // Prevent concurrent rotations

  // Aggressive thumbnail preloading - preload next 5 videos
  useEffect(() => {
    if (!currentVideo || !currentPlaylistContext) return;

    const playlist = userPlaylists.find(p => p.id === currentPlaylistContext.playlistId);
    if (!playlist?.videos) return;

    const currentIndex = playlist.videos.findIndex(v => 
      v.id === currentVideo.id || v.vimeo_id === currentVideo.id
    );
    
    if (currentIndex === -1) return;

    // Preload next 5 videos' thumbnails
    const videosToPreload = [];
    for (let i = 1; i <= 5; i++) {
      const nextIndex = (currentIndex + i) % playlist.videos.length;
      const video = playlist.videos[nextIndex];
      if (video?.thumbnail) {
        videosToPreload.push(video);
      }
    }

    // Preload previous video
    const prevIndex = (currentIndex - 1 + playlist.videos.length) % playlist.videos.length;
    const prevVid = playlist.videos[prevIndex];
    if (prevVid?.thumbnail) {
      videosToPreload.unshift(prevVid);
    }

    // Start preloading with expo-image (better caching!)
    videosToPreload.forEach((video) => {
      const url = getHighResolutionThumbnail(video.thumbnail);
      // expo-image prefetch with disk cache (memory + disk)
      Image.prefetch([url], { cachePolicy: 'disk' }).catch(() => {
        // Silent fail - not critical
      });
    });
  }, [currentVideo?.id, currentPlaylistContext?.playlistId, userPlaylists]);

  // Video player events - Component'in en üst seviyesinde
  // Use useEventListener (not useEvent!) for VideoPlayer events
  useEventListener(mainVideoPlayer, 'statusChange', (event) => {
    console.log('🎵 📡 statusChange EVENT FIRED!!! Platform:', Platform.OS, 'Event:', event);
    if (Platform.OS !== 'web' && event) {
      console.log('🎵 📡 statusChange event details - Type:', typeof event, 'Event:', event);
      
      const status = event.status || event;
      if (status === 'readyToPlay' || status === 'loaded') {
        console.log('🎵 ✅ Video ready via event - setting isVideoReady: true');
        setIsVideoReady(true);
        
        // AUTO PLAY when video is ready!
        console.log('🎵 🎬 Auto-playing video now that it\'s ready...');
        try {
          const playResult = mainVideoPlayer.play();
          if (playResult && typeof playResult.then === 'function') {
            playResult.then(() => {
              console.log('🎵 ✅ Video playing successfully!');
            }).catch(error => {
              console.log('🎵 ❌ Play error:', error);
            });
          } else {
            console.log('🎵 ✅ Video play() called (no promise)');
          }
        } catch (error) {
          console.log('🎵 ❌ Play error:', error);
        }
        
        // Clear transition state when video is ready (but keep transitionDirection until playing)
        if (isTransitioning) {
          setTimeout(() => {
            setIsTransitioning(false);
            // DON'T clear transitionDirection yet - wait until video is playing
          }, 100);
        }
      } else if (status === 'loading') {
        console.log('🎵 🔄 Video loading - setting isVideoReady: false');
        setIsVideoReady(false);
      }
    }
  });

  useEventListener(mainVideoPlayer, 'playingChange', ({ isPlaying }) => {
    if (Platform.OS !== 'web') { // ✅ REMOVED currentVideo check - allow loading to clear
      console.log('🎵 🔴 playingChange EVENT:', {
        isPlaying,
        hasCurrentVideo: !!currentVideo,
        hasTransitionDirection: !!transitionDirection,
        transitionDirection
      });
      
      setIsVideoPlaying(isPlaying); // Update playing state
      
      // Clear transition direction when video starts playing (NO DELAY for playlist loading!)
      if (isPlaying) {
        console.log('🎵 ✅ Video is playing - clearing loading overlay!');
        setTransitionDirection(null);
        transitionThumbnailRef.current = null;
      }
      
      // Video durduysa ve sonuna gelmiş olabilir
      if (!isPlaying && mainVideoPlayer.currentTime > 0) {
        const currentTime = mainVideoPlayer.currentTime;
        const duration = mainVideoPlayer.duration;
        
        // Video sonuna %95'i geçmişse sonraki şarkıya geç
        if (duration > 0 && (currentTime / duration) >= 0.95) {
          console.log('🎵 🔚 Video near end detected - playing next video', {
            currentTime: currentTime.toFixed(2),
            duration: duration.toFixed(2),
            percentage: ((currentTime / duration) * 100).toFixed(1) + '%'
          });
          playNextVideo();
        }
      }
    }
  });

  // ✅ PiP mode - Keep playing when returning from background
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('📱 AppState changed:', nextAppState, '| isPaused:', isPaused, '| hasVideo:', !!currentVideo);
      
      // Uygulama background'dan foreground'a geçtiğinde
      if (nextAppState === 'active' && currentVideo && !isPaused) {
        console.log('📱 App became active - checking if video needs to resume');
        
        // Video durmuşsa tekrar başlat
        setTimeout(() => {
          if (mainVideoPlayer && !mainVideoPlayer.playing) {
            console.log('📱 🎵 Resuming video after returning from background/PiP');
            mainVideoPlayer.play();
          }
        }, 300); // Biraz daha uzun delay - state stabilize olsun
      }
    });

    return () => subscription.remove();
  }, [currentVideo, isPaused, mainVideoPlayer]);

  // ✅ FALLBACK: Clear loading if video is playing (in case playingChange event is missed)
  useEffect(() => {
    if (mainVideoPlayer && mainVideoPlayer.playing && transitionDirection) {
      console.log('🎵 ⚠️ FALLBACK: Video is playing but loading still visible - force clearing!');
      setIsVideoPlaying(true);
      setTransitionDirection(null);
      transitionThumbnailRef.current = null;
    }
  }, [mainVideoPlayer?.playing, transitionDirection]);

  // ✅ BATTERY OPTIMIZED: Video end detection - Only when PLAYING
  useEffect(() => {
    if (Platform.OS !== 'web' && currentVideo && mainVideoPlayer && !isPaused) {
      let interval: NodeJS.Timeout;
      let hasReachedNearEnd = false;
      
      const checkVideoEnd = () => {
        try {
          const currentTime = mainVideoPlayer.currentTime || 0;
          const duration = mainVideoPlayer.duration || 0;
          
          if (duration > 0 && currentTime > 0) {
            const percentage = (currentTime / duration) * 100;
            
            // Video %90'a geldiğinde daha sık kontrol et
            if (percentage >= 90 && !hasReachedNearEnd) {
              hasReachedNearEnd = true;
              clearInterval(interval);
              // Son %10'da her 500ms kontrol et
              interval = setInterval(checkVideoEnd, 500);
              console.log('🎵 ⚡ Switched to fast checking mode at 90%');
            }
            
            // Video %98'ine geldiğinde sonraki şarkıya geç
            if (percentage >= 98) {
              console.log('🎵 🔚 Video end detected - playing next video', {
                percentage: percentage.toFixed(1) + '%'
              });
              clearInterval(interval);
              playNextVideo();
            }
          }
        } catch (error) {
          // Silent error - performans için log azaltıldı
        }
      };
      
      // İlk %90'a kadar her 3 saniyede kontrol et (performans optimizasyonu)
      interval = setInterval(checkVideoEnd, 3000);
      
      return () => clearInterval(interval);
    }
    // ✅ Video pause olunca interval temizlenir (battery save!)
  }, [currentVideo, mainVideoPlayer, isPaused]);

  // Event-based detection (backup) - Silent mode
  useEvent(mainVideoPlayer, 'playbackStatusUpdate', (status) => {
    if (Platform.OS !== 'web' && currentVideo && status) {
      if (status.didJustFinish || status.isLoaded === false) {
        console.log('🎵 🔚 Video ended via event - playing next video');
        playNextVideo();
      }
    }
  });

  // Remote command event - Lock screen controls
  useEvent(mainVideoPlayer, 'remoteCommand', (command) => {
    if (Platform.OS !== 'web' && command) {
      console.log('🎵 🎛️ Lock screen command received:', command.type || 'unknown');
      
      switch (command.type) {
        case 'nextTrack':
          console.log('🎵 ⏭️ Next track from lock screen → Playing next video');
          playNextVideo();
          break;
          
        case 'previousTrack':
          console.log('🎵 ⏮️ Previous track from lock screen → Playing previous video');
          playPreviousVideo();
          break;
          
        case 'skipForward':
          console.log('🎵 ⏩ Skip forward disabled - using next track instead');
          playNextVideo();
          break;
          
        case 'skipBackward':
          console.log('🎵 ⏪ Skip backward disabled - using previous track instead');
          playPreviousVideo();
          break;
          
        case 'play':
          console.log('🎵 ▶️ Play command from lock screen');
          handlePlayPause();
          break;
          
        case 'pause':
          console.log('🎵 ⏸️ Pause command from lock screen');
          handlePlayPause();
          break;
          
        default:
          console.log('🎵 ❓ Unhandled remote command:', command.type || 'undefined');
      }
    } else if (Platform.OS !== 'web') {
      console.log('🎵 ⚠️ Empty remote command received');
    }
  });

  // Ana video source'unu güncelle - Debug ile - Double loading önle
  useEffect(() => {
    console.log('🎬 useEffect triggered - currentVideo:', currentVideo?.name, 'mainVideoPlayer:', !!mainVideoPlayer);
    
    if (currentVideo && mainVideoPlayer) {
      console.log('🎬 ✅ Both currentVideo and mainVideoPlayer available');
      console.log('🎬 Loading main video:', currentVideo.name || currentVideo.title, 'ID:', currentVideo.id);
      
      // Video değiştiğinde ready state'ini resetle
      console.log('🎵 🔄 New video loading - setting isVideoReady: false');
      setIsVideoReady(false);
      
      // Double loading önlemek için loading state kontrol et - Daha güçlü kontrol
      if (mainVideoPlayer.source && typeof mainVideoPlayer.source === 'object' && 
          mainVideoPlayer.source.uri) {
        
        // Video ID'yi URI'den çıkar ve karşılaştır
        const currentSourceId = mainVideoPlayer.source.uri.match(/\/(\d+)[\/?]/)?.[1];
        const newVideoId = currentVideo.id.toString();
        
        if (currentSourceId === newVideoId) {
          console.log('🎬 ⚠️ SAME VIDEO - Skipping reload to prevent restart');
          console.log('🎬 Current source ID:', currentSourceId, 'New video ID:', newVideoId);
          console.log('🎵 ✅ Video already ready - setting isVideoReady: true');
          setIsVideoReady(true); // Zaten yüklüyse ready
          
          // Eğer video duraklatılmışsa devam ettir
          if (isPaused && mainVideoPlayer.currentTime > 0) {
            console.log('🎵 ▶️ Resuming paused video from:', mainVideoPlayer.currentTime);
            mainVideoPlayer.play().catch(error => {
              console.log('🎵 Resume play error:', error);
            });
          }
          
          return;
        } else {
          console.log('🎬 🆕 DIFFERENT VIDEO - Current:', currentSourceId, 'New:', newVideoId);
        }
      }
      
      console.log('🎬 🆕 Loading new video - ID:', currentVideo.id);
      console.log('🎬 Current source:', mainVideoPlayer.source ? 'EXISTS' : 'NULL');
      
      // Direkt gerçek video loading
      const loadMainVideo = async () => {
        try {
          console.log('🎬 🔄 Loading real video directly...');
          const token = await hybridVimeoService.getCurrentToken();
          
          // Alternative API endpoint - daha güvenilir
          console.log('🎬 🎯 Using alternative API for video:', currentVideo.id);
          const altResponse = await fetch(`https://api.vimeo.com/videos/${currentVideo.id}?fields=files,pictures`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (altResponse.ok) {
            const altData = await altResponse.json();
            console.log('🎬 📦 Alternative API response received');
            const files = altData?.files || [];
            const mp4Files = files.filter((file: any) => file.type === 'video/mp4');
            const bestFile = mp4Files.find((file: any) => file.quality === 'hd') || mp4Files[0];
            
            if (bestFile?.link) {
              console.log('🎬 🎯 Loading video URL:', bestFile.link.substring(0, 50) + '...');
              
              // Get Vimeo thumbnail first - iOS can handle URLs directly
              let vimeoThumbnail = null;
              try {
                if (Platform.OS !== 'web' && altData.pictures?.sizes) {
                  // Use Vimeo's own thumbnail - no conversion needed
                  const sizes = altData.pictures.sizes.sort((a: any, b: any) => b.width - a.width);
                  const mediumSize = sizes.find((size: any) => size.width >= 640 && size.width <= 800);
                  vimeoThumbnail = mediumSize?.link || sizes[Math.floor(sizes.length / 2)]?.link || sizes[0]?.link;
                  
                  if (vimeoThumbnail) {
                    console.log('🎵 🖼️ Using Vimeo thumbnail (instant!):', vimeoThumbnail.substring(0, 50) + '...');
                    setVideoThumbnail(vimeoThumbnail);
                  } else {
                    console.log('🎵 ⚠️ No Vimeo thumbnail found in pictures array');
                  }
                } else {
                  console.log('🎵 ⚠️ No pictures data in Vimeo response');
                }
              } catch (error) {
                console.log('🎵 ❌ Vimeo thumbnail extraction error:', error);
                vimeoThumbnail = null;
              }
              
              // VideoSource with Vimeo thumbnail directly in metadata
              const videoSourceWithThumbnail: VideoSource = {
                uri: bestFile.link,
                metadata: {
                  title: currentVideo.name || currentVideo.title || 'Naber LA Music',
                  artist: 'Naber LA',
                  album: 'Naber LA Collection',
                  ...(vimeoThumbnail && { artwork: vimeoThumbnail })
                }
              };
              
              console.log('🎵 VideoSource with Vimeo thumbnail:', {
                title: videoSourceWithThumbnail.metadata?.title,
                artist: videoSourceWithThumbnail.metadata?.artist,
                artwork: vimeoThumbnail ? 'YES (Vimeo URL)' : 'NO'
              });
              await mainVideoPlayer.replaceAsync(videoSourceWithThumbnail);
              
              console.log('🎵 🔄 replaceAsync completed - source:', mainVideoPlayer.currentSource ? 'SET' : 'NULL');
              
              // Media session metadata'sını player'a ayarla
              if (Platform.OS !== 'web') {
                try {
                  // Player'a metadata ayarla - Vimeo thumbnail ile
                  const metadata = {
                    title: currentVideo.name || currentVideo.title || 'Naber LA Music',
                    artist: 'Naber LA',
                    album: 'Naber LA Collection', // iOS için album
                    albumTitle: 'Naber LA Collection', // Fallback
                    ...(vimeoThumbnail && { 
                      artwork: vimeoThumbnail, // Primary
                      artworkUri: vimeoThumbnail, // iOS fallback
                      artworkUrl: vimeoThumbnail // Additional fallback
                    }),
                    duration: 180, // Default 3 dakika
                    playbackRate: 1.0,
                    elapsedTime: 0
                  };
                  
                  // SDK 54'te farklı API kullanılıyor olabilir - tüm yöntemleri dene
                  let metadataSet = false;
                  
                  // Yöntem 1: setNowPlayingInfo
                  if (typeof mainVideoPlayer.setNowPlayingInfo === 'function') {
                    try {
                      mainVideoPlayer.setNowPlayingInfo(metadata);
                      metadataSet = true;
                      console.log('🎵 Metadata set via setNowPlayingInfo');
                    } catch (error) {
                      console.log('🎵 setNowPlayingInfo failed:', error);
                    }
                  }
                  
                  // Yöntem 2: nowPlayingInfo property - Daha detaylı
                  if (!metadataSet && mainVideoPlayer.nowPlayingInfo !== undefined) {
                    try {
                      // iOS için daha spesifik format
                      const iosMetadata = {
                        title: metadata.title,
                        artist: metadata.artist,
                        albumTitle: metadata.albumTitle || metadata.album,
                        artwork: metadata.artwork, // Vimeo thumbnail URL
                        duration: metadata.duration,
                        playbackRate: metadata.playbackRate,
                        elapsedTime: metadata.elapsedTime
                      };
                      
                      mainVideoPlayer.nowPlayingInfo = iosMetadata;
                      metadataSet = true;
                      console.log('🎵 ✅ Metadata set via nowPlayingInfo property with artwork:', {
                        title: iosMetadata.title,
                        artwork: iosMetadata.artwork ? 'YES' : 'NO'
                      });
                    } catch (error) {
                      console.log('🎵 nowPlayingInfo property failed:', error);
                    }
                  }
                  
                  // Yöntem 3: VideoView metadata prop (fallback)
                  if (!metadataSet) {
                    console.log('🎵 Using VideoView metadata prop as fallback');
                  }
                  
                  // Metadata'yı state'e kaydet VideoView için
                  setCurrentMetadata(metadata);
                  
                  // Native iOS Media Session'a da gönder
                  setMediaMetadata(metadata);
                  
                  console.log('🎵 Now playing info set:', {
                    title: metadata.title,
                    artist: metadata.artist,
                    artwork: metadata.artwork ? 'YES (Vimeo URL)' : 'NO',
                    artworkUrl: metadata.artwork ? metadata.artwork.substring(0, 60) + '...' : 'NONE',
                    method: metadataSet ? 'Player API' : 'VideoView Prop'
                  });
                } catch (error) {
                  console.log('🎵 Now playing info error:', error);
                }
              }
              
              // DON'T call play() here - let statusChange event handle it!
              console.log('🎵 ⏰ Waiting for video to be ready... Status:', mainVideoPlayer.status);
              console.log('🎵 🎬 Player state after replaceAsync:', {
                status: mainVideoPlayer.status,
                playing: mainVideoPlayer.playing,
                source: mainVideoPlayer.currentSource ? 'SET' : 'NULL'
              });
              
              // Video will auto-play when statusChange event fires with 'readyToPlay'
                      
                      // Play state'ini media session'a bildir
                      if (Platform.OS !== 'web') {
                try {
                  // Playing state'ini güncelle
                  mainVideoPlayer.nowPlayingInfo = {
                    ...mainVideoPlayer.nowPlayingInfo,
                    playbackRate: 1.0, // Çalıyor
                    elapsedTime: 0
                  };
                  
                  // Native media session'a da bildir
                  updatePlaybackState(true, 0);
                  
                  console.log('🎵 Media session play state updated');
                } catch (error) {
                  console.log('🎵 Play state update error:', error);
                }
              }
              
              console.log('🎬 ✅ Video loaded and playing successfully!');
            } else {
              console.log('🎬 ❌ No suitable video file found in API response');
            }
          } else {
            console.error('🎬 ❌ Alternative API failed with status:', altResponse.status);
          }
        } catch (error) {
          console.error('❌ Video load error:', error);
        }
      };
      
      loadMainVideo();
    } else {
      console.log('🎬 ❌ Missing requirements - currentVideo:', !!currentVideo, 'mainVideoPlayer:', !!mainVideoPlayer);
    }
  }, [currentVideo, mainVideoPlayer]);

  // Metadata güncelleme artık gereksiz - Vimeo thumbnail direkt video yüklenirken alınıyor
  // useEffect(() => {
  //   if (Platform.OS !== 'web' && currentVideo && mainVideoPlayer && videoThumbnail) {
  //     console.log('🎵 Updating metadata with thumbnail - Video:', currentVideo.name, 'Thumbnail:', videoThumbnail ? 'YES' : 'NO');
  //     
  //     const metadata = {
  //       title: currentVideo.name || currentVideo.title || 'Naber LA Music',
  //       artist: 'Naber LA',
  //       albumTitle: 'Naber LA Collection', // iOS için albumTitle
  //       artworkUri: videoThumbnail, // iOS için artworkUri
  //       artwork: videoThumbnail // Fallback
  //     };
  //     
  //     try {
  //       // VideoView metadata'sını güncelle
  //       setCurrentMetadata(metadata);
  //       
  //       // Player metadata'sını güncelle
  //       if (mainVideoPlayer.nowPlayingInfo !== undefined) {
  //         mainVideoPlayer.nowPlayingInfo = metadata;
  //         console.log('🎵 Final metadata update with thumbnail:', {
  //           title: metadata.title,
  //           artist: metadata.artist,
  //           artwork: metadata.artwork ? 'YES' : 'NO',
  //           thumbnailPath: metadata.artwork ? metadata.artwork.substring(0, 60) + '...' : 'NONE'
  //         });
  //       }
  //       
  //       // VideoView metadata debug
  //       console.log('🎵 📱 VideoView metadata updated:', {
  //         title: metadata.title,
  //         artist: metadata.artist,
  //         artwork: metadata.artwork ? 'YES' : 'NO',
  //         artworkPath: metadata.artwork || 'NONE'
  //       });
  //       
  //       // Native media session'a da gönder
  //       setMediaMetadata(metadata);
  //       
  //     } catch (error) {
  //       console.log('🎵 Final metadata update error:', error);
  //     }
  //   }
  // }, [currentVideo, videoThumbnail, mainVideoPlayer]);
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
  const videoHeightAnimation = useRef(new Animated.Value(Platform.OS === 'web' ? 0.7 : 1)).current;
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





  // Unlock orientation ve detection
  useEffect(() => {
    let lastWidth = 0;
    
    // Unlock all orientations
    ScreenOrientation.unlockAsync().then(() => {
      console.log('✅ Orientation unlocked!');
    }).catch(err => {
      console.log('❌ Orientation unlock error:', err);
    });
    
    const checkOrientation = () => {
      const screen = Dimensions.get('screen');
      const isLandscapeNow = screen.width > screen.height;
      
      if (screen.width !== lastWidth) {
        console.log('🔄 SCREEN CHANGED!', screen.width, 'x', screen.height, isLandscapeNow ? 'LANDSCAPE' : 'PORTRAIT');
        lastWidth = screen.width;
      }
      
      setIsLandscape(isLandscapeNow);
    };

    // İlk kontrol
    checkOrientation();
    
    // ScreenOrientation listener
    const orientationSubscription = ScreenOrientation.addOrientationChangeListener(() => {
      console.log('📱 Native orientation changed!');
      checkOrientation();
    });
    
    // Dimensions listener
    const dimensionsSubscription = Dimensions.addEventListener('change', checkOrientation);
    
    // ✅ BATTERY FIX: Removed 2-second polling - events are enough!
    // Event listeners (orientationSubscription + dimensionsSubscription) catch all orientation changes
    
    return () => {
      ScreenOrientation.removeOrientationChangeListener(orientationSubscription);
      dimensionsSubscription?.remove();
    };
  }, []);

  // Page animations on mount
  useEffect(() => {
    // Page fade-in animation
    Animated.timing(pageOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      // After page animation completes, auto-open playlist modal for new users
      const autoOpenPlaylistModal = () => {
        console.log('🎵 Auto-opening MainPlaylistModal for user guidance after page load');
        if (!currentVideo && Platform.OS !== 'web') {
          console.log('🎵 Opening MainPlaylistModal with smooth animation - will show loading if needed');
          setTimeout(() => {
            setShowMainPlaylistModal(true);
          }, 500); // Small delay for smooth transition
        } else {
          console.log('🎵 MainPlaylistModal auto-open skipped - video already playing or on web');
        }
      };
      
      // Auto-open after page animation completes
      autoOpenPlaylistModal();
    });

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
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location && window.history) {
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('v');
            window.history.replaceState({}, '', url.toString());
          } catch (error) {
            console.warn('Failed to update URL:', error);
          }
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
        
        // ✅ ALWAYS fetch fresh data on app start (bypass 5-minute cache)
        const playlists = await hybridPlaylistService.getPlaylists(true);
        
        // ✅ REMOVED: Unnecessary 1-second delay - playlists load instantly now!
        // await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ✅ REMOVED: Duplicate check - service already handles this
        // Service deduplicates at 2 points: cache return and fresh API return
        
        // Filter playlists based on user type
        let filteredPlaylists = playlists;
        if (!isGoogleUser) {
          // Non-Google users: only show admin playlists
          filteredPlaylists = playlists.filter(playlist => playlist.isAdminPlaylist);
          logger.system('🔒 Non-Google user: filtered to', filteredPlaylists.length, 'admin playlists');
        }
        
        setUserPlaylists(filteredPlaylists);
        
        // Auto-expand only "Naber LA - AI" playlist
        const naberLAAIPlaylist = filteredPlaylists.find(playlist => 
          playlist.name === 'Naber LA - AI' || playlist.name === 'NABER LA AI'
        );
        
        if (naberLAAIPlaylist) {
          setExpandedPlaylists(new Set([naberLAAIPlaylist.id]));
          console.log('🎵 Auto-expanded only "Naber LA - AI" playlist for better performance');
        } else {
          setExpandedPlaylists(new Set());
          console.log('🎵 "Naber LA - AI" playlist not found - all playlists start closed');
        }
        
        logger.system('Initial playlists loaded:', filteredPlaylists.length, 'playlists for', isGoogleUser ? 'Google user' : 'non-Google user');
        
        // ✅ REMOVED: Unnecessary web-only check - service already filters at 3 layers:
        // 1. webOnlyPlaylistService only runs on web
        // 2. Cache layer filters isWebOnlyPlaylist
        // 3. Admin API filters 🌐 prefix and [WEB_ONLY] tag
      } catch (error) {
        console.error('Error loading playlists:', error);
      } finally {
        setPlaylistsLoading(false);
      }
    };
    
    loadPlaylists();
    
    // ✅ REMOVED AutoSync: Playlists refresh manually (app open + pull-to-refresh)
    // No more 10-minute polling in background → Better battery life
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
    
    // 🖼️ CAPTURE THUMBNAIL FOR LOADING (when coming from playlist)
    if (playlistContext && video.thumbnail) {
      console.log('🖼️ Capturing thumbnail for playlist video:', video.thumbnail);
      transitionThumbnailRef.current = video.thumbnail;
    }
    
    // ✅ START LOADING ANIMATION (from playlist selection)
    if (playlistContext) {
      console.log('🎵 Starting loading animation for playlist video');
      setIsVideoPlaying(false); // Hide current video
      setTransitionDirection('next'); // Trigger loading overlay
      startLoadingHeartbeat(); // Start pulse animation
    }
    
    // FORCE STOP ALL AUDIO BEFORE PLAYING NEW VIDEO
    // SDK 54: expo-video handles audio cleanup automatically
    if (__DEV__) {
      console.log('🔇 SDK 54: Audio cleanup handled by expo-video');
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
    
    // playVideo completed
    
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
    console.log('🎬 showVideoOverlayWithTimer called - animating overlay to visible');
    console.log('🎬 Conditions - currentVideo:', currentVideo?.title || 'null', 
                'isFullscreen:', isFullscreen, 'isLandscape:', isLandscape);
    
    // Clear any existing timeout first
    if (overlayTimeout.current) {
      clearTimeout(overlayTimeout.current);
      overlayTimeout.current = null;
    }

    // Show overlay
    setShowVideoOverlay(true);
    console.log('🎬 setShowVideoOverlay(true) - state updated');
    
    // DEBUG: Log current opacity value
    // @ts-ignore - accessing internal value for debugging
    console.log('🎬 Current overlayOpacity value:', overlayOpacity._value);
    
    // Animate in
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start((result?: { finished: boolean }) => {
      console.log('🎬 Overlay animation completed - finished:', result?.finished);
      // @ts-ignore - accessing internal value for debugging
      console.log('🎬 Final overlayOpacity value:', overlayOpacity._value);
    });

    // Hide after 4 seconds
    overlayTimeout.current = setTimeout(() => {
      hideVideoOverlay();
    }, 4000);
  };

  const hideVideoOverlay = () => {
    console.log('🎬 hideVideoOverlay called - animating to 0');
    // Just animate out, don't change showVideoOverlay state
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      console.log('🎬 Hide animation completed');
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
      // Her platformda web URL'sini kullan
      const shareUrl = `https://naber.la/?v=${currentVideo.id}`;
      
      console.log('🔗 Generated share URL:', shareUrl);
      
      if (Platform.OS === 'web' && navigator.clipboard) {
        // Web: Navigator clipboard kullan
        await navigator.clipboard.writeText(shareUrl);
        console.log('🔗 Link copied to clipboard (web):', shareUrl);
      } else {
        // iOS/Android: Expo clipboard kullan
        await Clipboard.setStringAsync(shareUrl);
        console.log('🔗 Link copied to clipboard (mobile):', shareUrl);
      }
      
      // Show inline toast next to share button with animation (tüm platformlar)
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
    
    if (Platform.OS === 'web') {
      // Web'de heart icon davranışı - MainPlaylistModal aç
      if (!isGoogleUser) {
        console.log('❌ Not Google user - opening MainPlaylistModal with profile view for sign in');
        setIsFromLikeButton(true); // Like butonundan geldiğini işaretle
        
        // Modal'ı her zaman kapat ve yeniden aç - state reset için
        setShowMainPlaylistModal(false);
        // Reset MainPlaylistModal internal state
        if (mainPlaylistModalRef.current && mainPlaylistModalRef.current.resetToMain) {
          mainPlaylistModalRef.current.resetToMain();
        }
        setMainPlaylistInitialView('profile');
        setShowMainPlaylistModal(true);
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
    } else {
      // iOS'da heart icon davranışı
      if (!isGoogleUser) {
        console.log('❌ Not Google user on iOS - opening MainPlaylistModal with profile view for sign in');
        setIsFromLikeButton(true); // Like butonundan geldiğini işaretle
        
        // Modal'ı her zaman kapat ve yeniden aç - state reset için
        setShowMainPlaylistModal(false);
        // Reset MainPlaylistModal internal state
        if (mainPlaylistModalRef.current && mainPlaylistModalRef.current.resetToMain) {
          mainPlaylistModalRef.current.resetToMain();
        }
        setMainPlaylistInitialView('profile');
        setShowMainPlaylistModal(true);
        return;
      }
      
      // User is logged in - proceed with like functionality on iOS
      setIsFromLikeButton(false);
      
      try {
        console.log('❤️ iOS Heart pressed for video:', currentVideo.name);
        const newLikedState = await hybridPlaylistService.toggleLikedSong(currentVideo);
        setIsHeartFavorited(newLikedState);
        
        // Update playlists state immediately for better UX
        try {
          // Wait for Firestore to process the change
          console.log('⏳ Waiting for Firestore to process the change...');
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Clear cache and refresh playlists
          await hybridPlaylistService.clearPlaylistCache();
          console.log('🗑️ Cache cleared before refresh');
          
          const updatedPlaylists = await hybridPlaylistService.getPlaylists(true);
          const uniquePlaylists = updatedPlaylists.filter((playlist, index, self) => 
            index === self.findIndex(p => p.id === playlist.id)
          );
          setUserPlaylists(uniquePlaylists);
          
          // Keep current expanded state after refresh - don't auto-expand
          // setExpandedPlaylists remains unchanged
        } catch (error) {
          console.error('Error updating playlists after heart toggle:', error);
        }
        
        console.log(`${newLikedState ? '❤️ Added to' : '💔 Removed from'} Liked Songs:`, currentVideo.name);
      } catch (error) {
        console.error('Error toggling liked song on iOS:', error);
      }
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

  const handlePlayStateChange = (isPlayingFromPlayer: boolean) => {
    const responseTime = Date.now() - commandStartTimeRef.current;
    const newPausedState = !isPlayingFromPlayer; // Convert isPlaying to isPaused
    
    debugLog.player(`Play state change callback - isPlayingFromPlayer: ${isPlayingFromPlayer}, newPaused: ${newPausedState}`);
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

  const handlePlayPause = async () => {
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
    
      // Control mainVideoPlayer directly
      if (mainVideoPlayer) {
        if (newPausedState) {
          mainVideoPlayer.pause();
          console.log('🎬 Main video paused');
          
          // Media session state güncelle
          if (Platform.OS !== 'web') {
            try {
              mainVideoPlayer.nowPlayingInfo = {
                ...mainVideoPlayer.nowPlayingInfo,
                playbackRate: 0.0 // Durdu
              };
              
              // Native media session'a da bildir
              updatePlaybackState(false);
              
              console.log('🎵 Media session paused');
            } catch (error) {
              console.log('🎵 Media session pause error:', error);
            }
          }
        } else {
          mainVideoPlayer.play();
          console.log('🎬 Main video playing');
          
          // Media session state güncelle
          if (Platform.OS !== 'web') {
            try {
              mainVideoPlayer.nowPlayingInfo = {
                ...mainVideoPlayer.nowPlayingInfo,
                playbackRate: 1.0 // Çalıyor
              };
              
              // Native media session'a da bildir
              updatePlaybackState(true);
              
              console.log('🎵 Media session playing');
            } catch (error) {
              console.log('🎵 Media session play error:', error);
            }
          }
        }
      }
    
    // Eski VimeoPlayerNative tamamen devre dışı
    // if (vimeoPlayerRef.current) {
    //   debugLog.main(`🎬 DEBUG: newPausedState=${newPausedState}, should send ${newPausedState ? 'PAUSE' : 'PLAY'}`);
    //   if (newPausedState) {
    //     debugLog.main('🎬 Sending PAUSE command to player');
    //     vimeoPlayerRef.current.pause().catch(error => {
    //       debugLog.error('❌ Player pause failed:', error);
    //     });
    //   } else {
    //     debugLog.main('🎬 Sending PLAY command to player');
    //     vimeoPlayerRef.current.play().catch(error => {
    //       debugLog.error('❌ Player play failed:', error);
    //     });
    //   }
    // } else {
    //   debugLog.error('❌ Player ref not available');
    // }
    
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
      
      // Apply mute to mainVideoPlayer
      if (mainVideoPlayer) {
        mainVideoPlayer.muted = newMutedState;
        console.log('🔇 Main video player muted set to:', newMutedState);
      } else {
        console.warn('⚠️ Main video player not available');
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
    console.log('🎵 Heart icon pressed - IMMEDIATE response');
    
    // Set states immediately without any delays
    setIsFromLikeButton(false);
    setMainPlaylistInitialView('main');
    setShowMainPlaylistModal(true);
    
    console.log('🔍 Debug - Modal state updated immediately');
    
    // Reset internal state if needed
    if (mainPlaylistModalRef.current && mainPlaylistModalRef.current.resetToMain) {
      mainPlaylistModalRef.current.resetToMain();
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
    
    // 🖼️ Don't set isTransitioning here - let swipe handler do it
    // Only capture thumbnail for potential use
    if (nextPlaylistVideo?.thumbnail && currentVideo) {
      transitionThumbnailRef.current = nextPlaylistVideo.thumbnail;
      console.log('🖼️ ✅ [playNextVideo] Captured thumbnail for:', nextPlaylistVideo.title || nextPlaylistVideo.name, 
                  'URL:', nextPlaylistVideo.thumbnail.substring(0, 60));
    } else {
      console.log('🖼️ ⚠️ [playNextVideo] No thumbnail - nextPlaylistVideo.thumbnail:', 
                  nextPlaylistVideo?.thumbnail ? 'exists' : 'null', 
                  'currentVideo:', currentVideo ? 'exists' : 'null');
    }
    
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
    
    // 🖼️ Don't set isTransitioning here - let swipe handler do it
    // Only capture thumbnail for potential use
    if (prevPlaylistVideo?.thumbnail && currentVideo) {
      transitionThumbnailRef.current = prevPlaylistVideo.thumbnail;
      console.log('🖼️ ✅ [playPreviousVideo] Captured thumbnail for:', prevPlaylistVideo.title || prevPlaylistVideo.name, 
                  'URL:', prevPlaylistVideo.thumbnail.substring(0, 60));
    } else {
      console.log('🖼️ ⚠️ [playPreviousVideo] No thumbnail - prevPlaylistVideo.thumbnail:', 
                  prevPlaylistVideo?.thumbnail ? 'exists' : 'null', 
                  'currentVideo:', currentVideo ? 'exists' : 'null');
    }
    
    // Use playVideo to properly set all states and maintain playlist context
    playVideo(prevVideo, currentPlaylistContext);
    
    debugLog.main('Playing previous video:', `${prevVideo.name} at index: ${prevIndex}`);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // 🎬 Instagram Style: Load prev/next thumbnails when current video changes
  useEffect(() => {
    if (!currentVideo || !currentPlaylistContext) return;

    const currentPlaylist = userPlaylists.find(p => p.id === currentPlaylistContext.playlistId);
    if (!currentPlaylist || !currentPlaylist.videos || currentPlaylist.videos.length === 0) return;

    const videoIndex = currentPlaylist.videos.findIndex((v: any) => 
      v.id === currentVideo.id || v.vimeo_id === currentVideo.id || v.id === currentVideo.vimeo_id
    );

    if (videoIndex !== -1) {
      // Next video
      const nextIndex = videoIndex < currentPlaylist.videos.length - 1 ? videoIndex + 1 : 0;
      const nextVideoData = currentPlaylist.videos[nextIndex];
      
      // Previous video
      const prevIndex = videoIndex > 0 ? videoIndex - 1 : currentPlaylist.videos.length - 1;
      const prevVideoData = currentPlaylist.videos[prevIndex];

      console.log('🎬 Loading thumbnails - Prev:', prevVideoData?.title, 'Next:', nextVideoData?.title);

      // Update state (only thumbnails needed)
      setPrevVideo(prevVideoData || null);
      setNextVideo(nextVideoData || null);

      // Set thumbnails (for backward compatibility)
      setNextVideoThumbnail(nextVideoData?.thumbnail || null);
      setPrevVideoThumbnail(prevVideoData?.thumbnail || null);
    }
  }, [currentVideo, currentPlaylistContext, userPlaylists]);

  // Swipe gesture handler
  const onSwipeGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: swipeTranslateY } }],
    { useNativeDriver: true }
  );

  // 🎬 Get high resolution thumbnail from Vimeo
  const getHighResolutionThumbnail = (thumbnailUrl: string | undefined): string | undefined => {
    if (!thumbnailUrl) return undefined;
    
    // Vimeo URL format:
    // API'den: https://i.vimeocdn.com/video/123-hash-d_295x166?&r=pad&region=us
    // Web'den: https://i.vimeocdn.com/video/123-hash-d?mw=1100&mh=620
    
    // Remove size suffix (_295x166) and query params
    let baseUrl = thumbnailUrl.split('?')[0]; // Remove existing params
    baseUrl = baseUrl.replace(/_\d+x\d+$/, ''); // Remove _295x166
    
    // Add Vimeo's web parameters for high quality
    const highResUrl = baseUrl + '?mw=1100&mh=620';
    
    return highResUrl;
  };

  // 🎬 Instagram Style: Simple rotation (just change current video)
  const rotateVideoStack = (direction: 'next' | 'prev') => {
    if (isRotatingRef.current) {
      console.log('🎬 ⚠️ Rotation in progress, skipping...');
      return;
    }
    
    isRotatingRef.current = true;

    try {
      if (direction === 'next') {
        console.log('🎬 🔄 Rotating NEXT - Play next video');
        playNextVideo();
      } else {
        console.log('🎬 🔄 Rotating PREV - Play previous video');
        playPreviousVideo();
      }
    } catch (error) {
      console.log('🎬 ❌ Rotation error:', error);
    } finally {
      setTimeout(() => {
        isRotatingRef.current = false;
      }, 300); // Allow animation to complete
    }
  };

  const onSwipeHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;
      const screenHeight = Dimensions.get('screen').height;
      const SWIPE_THRESHOLD = screenHeight * 0.15; // 15% of screen height
      const VELOCITY_THRESHOLD = 500;

      console.log('📱 Swipe ended:', { translationY, velocityY, threshold: SWIPE_THRESHOLD });

      // Swipe up (next video)
      if (translationY < -SWIPE_THRESHOLD || velocityY < -VELOCITY_THRESHOLD) {
        console.log('⬆️ Swipe UP detected - Next video');
        console.log('📊 nextVideo state:', nextVideo ? `${nextVideo.title} - thumb: ${nextVideo.thumbnail?.substring(0, 40)}` : 'NULL');
        
        // 1. Calculate ACTUAL next video from playlist (don't trust state!)
        let actualNextVideo = nextVideo;
        if (currentPlaylistContext && userPlaylists) {
          const currentPlaylist = userPlaylists.find(p => p.id === currentPlaylistContext.playlistId);
          if (currentPlaylist?.videos) {
            const currentIndex = currentPlaylist.videos.findIndex((v: any) => 
              v.id === currentVideo?.id || v.vimeo_id === currentVideo?.id || v.id === currentVideo?.vimeo_id
            );
            if (currentIndex !== -1) {
              const nextIndex = currentIndex < currentPlaylist.videos.length - 1 ? currentIndex + 1 : 0;
              actualNextVideo = currentPlaylist.videos[nextIndex];
            }
          }
        }
        
        const targetThumbnail = actualNextVideo?.thumbnail;
        if (targetThumbnail) {
          transitionThumbnailRef.current = targetThumbnail;
          setNextVideo(actualNextVideo);
        }
        
        // 2. Pause current video immediately
        if (mainVideoPlayer) {
          mainVideoPlayer.pause();
          console.log('⏸️ Current video paused');
        }
        
        // 3. Animate next thumbnail to CENTER (full screen)
        Animated.timing(swipeTranslateY, {
          toValue: -screenHeight,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          // Thumbnail is at center - show loading overlay
          setIsTransitioning(true);
          setTransitionDirection('next');
          
          // 6. Load new video after short delay
          setTimeout(() => {
            rotateVideoStack('next');
            
            // 7. Clear after video loads (but keep direction until playing)
            setTimeout(() => {
              swipeTranslateY.setValue(0);
              setIsTransitioning(false);
              // transitionDirection will be cleared when video starts playing
            }, 100);
          }, 400); // Show thumbnail + loading for 400ms
        });
      }
      // Swipe down (previous video)
      else if (translationY > SWIPE_THRESHOLD || velocityY > VELOCITY_THRESHOLD) {
        console.log('⬇️ Swipe DOWN detected - Previous video');
        console.log('📊 prevVideo state:', prevVideo ? `${prevVideo.title} - thumb: ${prevVideo.thumbnail?.substring(0, 40)}` : 'NULL');
        
        // 1. CAPTURE prev thumbnail IMMEDIATELY (before any state change)
        const targetThumbnail = prevVideo?.thumbnail;
        if (targetThumbnail) {
          transitionThumbnailRef.current = targetThumbnail;
        }
        
        // 2. Pause current video immediately
        if (mainVideoPlayer) {
          mainVideoPlayer.pause();
          console.log('⏸️ Current video paused');
        }
        
        // 3. Animate prev thumbnail to CENTER (full screen)
        Animated.timing(swipeTranslateY, {
          toValue: screenHeight,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          // Thumbnail is at center - show loading overlay
          setIsTransitioning(true);
          setTransitionDirection('prev');
          
          // 6. Load new video after short delay
          setTimeout(() => {
            rotateVideoStack('prev');
            
            // 7. Clear after video loads (but keep direction until playing)
            setTimeout(() => {
              swipeTranslateY.setValue(0);
              setIsTransitioning(false);
              // transitionDirection will be cleared when video starts playing
            }, 100);
          }, 400); // Show thumbnail + loading for 400ms
        });
      }
      // Reset if not enough swipe
      else {
        console.log('↩️ Swipe canceled - Reset');
        Animated.parallel([
          Animated.spring(swipeTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.timing(thumbnailOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
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
        { opacity: pageOpacity },
        isLandscape && styles.landscapeContainer
      ]}>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor="#000000" 
          hidden={isLandscape && currentVideo} 
        />
        
        {/* Background Video - Only when no main video */}
        {backgroundVideoPlayer && !currentVideo && (
          <VideoView
            player={backgroundVideoPlayer}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
            }}
            contentFit="cover"
            nativeControls={false}
          />
        )}
        
        {/* Main container content */}

      {/* Main Video - Full Screen - Completely Independent */}
      {currentVideo && Platform.OS !== 'web' && (
        <PanGestureHandler
          onGestureEvent={onSwipeGestureEvent}
          onHandlerStateChange={onSwipeHandlerStateChange}
          enabled={!isLandscape} // Disable swipe in landscape mode
        >
          <Animated.View style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'transparent',
            },
            isLandscape && (console.log('🔄 Video container landscape styles applied!'), {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              zIndex: 10000, // Landscape'de en üstte
            })
          ]}>
            {/* Touch handler for showing overlay */}
            {!isLandscape && (
              <Pressable
                onPress={() => {
                  console.log('📱 Screen tapped - showing overlay');
                  showVideoOverlayWithTimer();
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 100, // Above everything except overlay itself
                }}
              />
            )}

            {/* 🎬 Instagram Style: Single VideoView + Thumbnail Previews */}
            {!isLandscape && (
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
              }}>
                {/* RENDER ORDER: Current first (bottom), then prev/next (top) */}
                
                {/* Current Video - Center (main) - ONLY VideoView - RENDER FIRST (stays at bottom) */}
                {/* Always render but hide during transition and until playing */}
                {mainVideoPlayer && currentVideo && (
                  <Animated.View 
                    key={`current-${currentVideo.id || currentVideo.vimeo_id}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#000000', // Black background for VideoView
                      zIndex: (transitionDirection && !isVideoPlaying) ? -999 : 1, // Hide ONLY during loading (not pause!)
                      opacity: (transitionDirection && !isVideoPlaying) ? 0 : 1, // Hide ONLY during loading (not pause!)
                      transform: (isTransitioning || (transitionDirection && !isVideoPlaying)) ? [] : [{ translateY: swipeTranslateY }],
                    }}>
                    <VideoView
                      key={`current-video-${currentVideo.id || currentVideo.vimeo_id}`}
                      player={mainVideoPlayer}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'transparent',
                      }}
                      contentFit="cover"
                      fullscreenOptions={{ enterFullscreenButton: false, exitFullscreenButton: false }}
                      allowsPictureInPicture={true}
                      nativeControls={false}
                      showsPlaybackControls={false}
                      staysActiveInBackground={true}
                    />
                  </Animated.View>
                )}

                {/* Previous Video Thumbnail - Above current - Show during swipe OR loading */}
                {prevVideo && prevVideo.thumbnail && (
                  <>
                    <Animated.View 
                      key={`prev-${prevVideo.id || prevVideo.vimeo_id}`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: Dimensions.get('screen').height,
                        // Show in front when transitionDirection is 'prev'
                        zIndex: transitionDirection === 'prev' ? 0 : -2,
                        // Freeze at center when transitionDirection is 'prev', otherwise follow swipe
                        transform: transitionDirection === 'prev'
                          ? [{ translateY: 0 }]
                          : [{
                              translateY: Animated.add(
                                swipeTranslateY,
                                new Animated.Value(-Dimensions.get('screen').height)
                              )
                            }],
                        // Fade out when video starts playing
                        opacity: (transitionDirection === 'prev' && isVideoPlaying) ? 0 : 1,
                      }}>
                    {/* Crisp Thumbnail - Full Screen */}
                    <Image
                      key={transitionDirection === 'prev' && transitionThumbnailRef.current 
                        ? transitionThumbnailRef.current 
                        : prevVideo.thumbnail}
                      source={{ uri: getHighResolutionThumbnail(
                        transitionDirection === 'prev' && transitionThumbnailRef.current 
                          ? transitionThumbnailRef.current 
                          : prevVideo.thumbnail
                      ) }}
                      style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                      }}
                      contentFit="cover"
                      priority="high"
                      cachePolicy="disk"
                      transition={0}
                    />
                    {/* Loading pulse animation - show when loading AND transition is PREV */}
                    {transitionDirection === 'prev' && !isVideoPlaying && (
                      <View style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.7)', // Daha karanlık background
                      }}>
                        <Animated.View style={{ transform: [{ scale: loadingHeartScale }] }}>
                          <Image source={loadingHeartImage} style={{ width: 60, height: 60, opacity: 1.0 }} resizeMode="contain" />
                        </Animated.View>
                      </View>
                    )}
                  </Animated.View>
                  </>
                )}

                {/* Next Video Thumbnail - Below current - Show during swipe OR loading */}
                {nextVideo && nextVideo.thumbnail && (
                  <>
                    <Animated.View 
                      key={`next-${nextVideo.id || nextVideo.vimeo_id}`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: Dimensions.get('screen').height,
                        // Show in front when transitionDirection is 'next'
                        zIndex: transitionDirection === 'next' ? 0 : -3,
                        // Freeze at center when transitionDirection is 'next', otherwise follow swipe
                        transform: transitionDirection === 'next' 
                          ? [{ translateY: 0 }]
                          : [{
                              translateY: Animated.add(
                                swipeTranslateY,
                                new Animated.Value(Dimensions.get('screen').height)
                              )
                            }],
                        // Fade out when video starts playing
                        opacity: (transitionDirection === 'next' && isVideoPlaying) ? 0 : 1,
                      }}>
                    {/* Crisp Thumbnail - Full Screen */}
                    <Image
                      key={transitionDirection === 'next' && transitionThumbnailRef.current 
                        ? transitionThumbnailRef.current 
                        : nextVideo.thumbnail}
                      source={{ uri: getHighResolutionThumbnail(
                        transitionDirection === 'next' && transitionThumbnailRef.current 
                          ? transitionThumbnailRef.current 
                          : nextVideo.thumbnail
                      ) }}
                      style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                      }}
                      contentFit="cover"
                      priority="high"
                      cachePolicy="disk"
                      transition={0}
                    />
                    {/* Loading pulse animation - show when loading AND transition is NEXT */}
                    {transitionDirection === 'next' && !isVideoPlaying && (
                      <View style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.7)', // Daha karanlık background
                      }}>
                        <Animated.View style={{ transform: [{ scale: loadingHeartScale }] }}>
                          <Image source={loadingHeartImage} style={{ width: 60, height: 60, opacity: 1.0 }} resizeMode="contain" />
                        </Animated.View>
                      </View>
                    )}
                  </Animated.View>
                  </>
                )}
              </View>
            )}

            {/* Landscape Mode - Only current video full screen */}
            {isLandscape && mainVideoPlayer && currentVideo && (
              <Animated.View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                zIndex: 9999,
              }}>
                <VideoView
                  player={mainVideoPlayer}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#000000',
                    ...styles.landscapePlayerArea
                  }}
                  fullscreenOptions={{ enterFullscreenButton: false, exitFullscreenButton: false }}
                  allowsPictureInPicture={true}
                  allowsExternalPlayback={true}
                  contentFit="contain"
                  nativeControls={false}
                  requiresLinearPlayback={false}
                  showNowPlayingNotification={true}
                  startPlaybackAutomatically={false}
                  showsPlaybackControls={false}
                  staysActiveInBackground={true}
                  metadata={currentMetadata ? {
                    ...currentMetadata,
                    albumTitle: currentMetadata.albumTitle || currentMetadata.album || 'Naber LA Collection',
                    duration: currentMetadata.duration || 180
                  } : {
                    title: currentVideo?.name || currentVideo?.title || 'Naber LA Music',
                    artist: 'Naber LA',
                    albumTitle: 'Naber LA Collection'
                  }}
                />
              </Animated.View>
            )}

          {/* Video Loading Overlay - COMPLETELY DISABLED for clean swipe experience */}
          {/* Loading overlay removed - thumbnails provide visual feedback during loading */}

          {/* VimeoPlayerNative tamamen devre dışı */}
          </Animated.View>
        </PanGestureHandler>
      )}

      {/* OVERLAYS - OUTSIDE PanGestureHandler for better rendering */}
      {/* Video Overlay - Song Title */}
      {currentVideo && !isFullscreen && !isLandscape && (
        <Animated.View 
          style={[
            styles.videoOverlay,
            { 
              opacity: overlayOpacity,
              zIndex: 99999,
            }
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
              paddingLeft: Platform.OS === 'web' ? 18 : 20,
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

      {/* Share and Heart Icons */}
      {currentVideo && !isFullscreen && !isLandscape && (
        <Animated.View 
          style={[
            {
              position: 'absolute',
              ...(Platform.OS === 'web'
                ? { top: 25, right: 25 }
                : { top: 60, right: 25 }
              ),
              opacity: overlayOpacity,
              zIndex: 99999,
              flexDirection: (Platform.OS === 'web' && width > 768) ? 'row' : 'column',
              alignItems: 'center',
              gap: (Platform.OS === 'web' && width > 768) ? 15 : 10,
            }
          ]}
          pointerEvents="box-none"
        >
          {(Platform.OS === 'web' && width > 768) ? (
            <>
              {/* Web layout */}
              <View style={{ position: 'relative' }}>
                <TouchableOpacity
                  onPress={() => {
                    console.log('🔗 SHARE BUTTON PRESSED!');
                    handleShareVideo();
                  }}
                  activeOpacity={0.7}
                  style={{ padding: 8 }}
                >
                  <Image 
                    source={require('../../assets/images/link2.png')}
                    style={{ width: 24, height: 24, tintColor: 'white' }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                
                {/* Inline "Link copied" toast - LEFT of share button (web) */}
                {shareToastVisible && (
                  <Animated.View
                    style={{
                      position: 'absolute',
                      right: 45, // Icon width 24 + padding 8 + margin 13
                      top: 8,
                      width: 92,
                      height: 22,
                      opacity: shareToastOpacity,
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', // Beyaz kutu
                      borderRadius: 11, // Uzun ince pill shape
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ 
                      color: '#000000', 
                      fontSize: 10, 
                      fontWeight: '400', 
                      whiteSpace: 'nowrap',
                      letterSpacing: 0.2,
                    }}>
                      Link Copied!
                    </Text>
                  </Animated.View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => {
                  console.log('❤️ HEART BUTTON PRESSED!');
                  handleHeartPress();
                }}
                activeOpacity={0.7}
                style={{ padding: 8 }}
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
              {/* Mobile layout */}
              <TouchableOpacity
                onPress={() => {
                  console.log('❤️ HEART BUTTON PRESSED!');
                  handleHeartPress();
                }}
                activeOpacity={0.7}
                style={{ padding: 8 }}
              >
                <Image
                  source={heartImage}
                  style={{
                    width: 35,
                    height: 35,
                    tintColor: isHeartFavorited ? "#e0af92" : "white",
                  }}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <View style={{ position: 'relative' }}>
                <TouchableOpacity
                  onPress={() => {
                    console.log('🔗 SHARE BUTTON PRESSED!');
                    handleShareVideo();
                  }}
                  activeOpacity={0.7}
                  style={{ padding: 8 }}
                >
                  <Image 
                    source={require('../../assets/images/link2.png')}
                    style={{ width: 35, height: 35, tintColor: 'white' }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                
                {/* Inline "Link copied" toast - LEFT of share button (mobile) */}
                {shareToastVisible && (
                  <Animated.View
                    style={{
                      position: 'absolute',
                      right: 55, // Icon width 35 + padding 8 + margin 12
                      top: 14,
                      width: 95,
                      height: 24,
                      opacity: shareToastOpacity,
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', // Beyaz kutu
                      borderRadius: 12, // Uzun ince pill shape
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ 
                      color: '#000000', 
                      fontSize: 11, 
                      fontWeight: '400',
                      letterSpacing: 0.2,
                    }}>
                      Link Copied!
                    </Text>
                  </Animated.View>
                )}
              </View>
            </>
          )}
        </Animated.View>
      )}
      
      {/* Safe Area for Camera Notch - Hidden in landscape */}
      {!isLandscape && <ThemedView style={styles.safeAreaTop} />}
      
      {/* Video Player Area with smooth height animation */}
      <Animated.View style={[
        styles.playerArea, 
        isFullscreen && styles.fullscreenPlayer,
        isLandscape && (console.log('🔄 Applying landscape styles with safe area override'), {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: '100%',
          width: '100%',
          zIndex: 99999, // Much higher z-index to cover safe areas
          // Override safe areas completely
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
          marginTop: 0,
          marginBottom: 0,
          marginLeft: 0,
          marginRight: 0,
        }), // Inline landscape styles
        Platform.OS === 'web' && {
          height: isLandscape ? '100vh' : videoHeightAnimation.interpolate({
            inputRange: [0.7, 1],
            outputRange: ['70vh', '100vh']
          })
        },
        Platform.OS !== 'web' && {
          height: '100%', // Mobile'da her zaman tam ekran
          width: '100%'
        }
      ]}>
        {currentVideo ? (
          <>
            {/* Video Player Container - UNIFIED FOR ALL PLATFORMS */}
            <View style={{ width: '100%', height: '100%', position: 'relative' }}>
              {/* Artık tüm platformlarda mainVideoPlayer kullanılıyor */}
              {/* VimeoPlayerNative tamamen kaldırıldı - media session conflict önlendi */}
            </View>

            {/* Universal tap area - ALL PLATFORMS */}
            {currentVideo && !isFullscreen && isVideoReady && (
              <TouchableOpacity 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'transparent',
                  zIndex: 100, // Loading overlay'inin altında
                }}
                onPress={() => {
                  // Use the centralized overlay function
                  if (currentVideo && isVideoReady) {
                    console.log('📱 Universal tap area pressed - showing overlay');
                    showVideoOverlayWithTimer();
                  }
                }}
                activeOpacity={0.8}
              />
            )}

            {/* Top Gradient Overlay - REMOVED */}
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
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                >
                  <source src={isMobileWeb ? mobileBackgroundVideo : backgroundVideo} type="video/mp4" />
                </video>
              </div>
            ) : (
              <VideoView
                player={backgroundVideoPlayer}
                style={styles.backgroundVideoMobile}
                contentFit="cover"
                nativeControls={false}
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

      {/* Video Info Area - REMOVED for cleaner look */}

      {/* Playlist Area - REMOVED for cleaner video-focused UI */}
      {false && !isFullscreen && !isLandscape && Platform.OS !== 'web' && (
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
      {(Platform.OS === 'web' ? !isFullscreen : true) && !isLandscape && (
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

      {/* Main Playlist Modal for iOS - Native bottom sheet */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={showMainPlaylistModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            console.log('🔄 iOS MainPlaylistModal onClose - resetting states, isFromLikeButton:', isFromLikeButton);
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
        >
          <View style={{
            flex: 1,
            backgroundColor: '#000000',
            paddingTop: 0, // Safe area padding'i kaldır
          }}>
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
          </View>
        </Modal>
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
    position: 'relative',
    zIndex: 2000, // Video'nun çok üstünde görünsün
  },
  darkContainer: {
    backgroundColor: 'transparent', // Hem web'de hem iOS'ta transparent
  },
  safeAreaTop: {
    height: 0, // Video'yu en yukarı taşı
    backgroundColor: 'transparent', // Hem web'de hem iOS'ta transparent
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    zIndex: -1, // Background video
    overflow: 'hidden',
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
    paddingTop: Platform.OS !== 'web' ? 0 : 0, // Safe area için padding
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
    height: 220, // Yukarı doğru daha uzun (180'den 220'ye)
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
    height: Platform.OS === 'web' ? '40%' : 180, // Daha uzun gradient (120 -> 180)
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
    top: Platform.OS === 'web' ? 20 : 60, // Mobile'da top 60px
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
    fontSize: Platform.OS === 'web' ? 28 : 26, // %200 büyütüldü (13 * 2 = 26)
    fontWeight: 'bold',
    color: 'white',
    lineHeight: Platform.OS === 'web' ? 32 : 32, // Line height de büyütüldü
  },
  videoOverlaySong: {
    fontSize: Platform.OS === 'web' ? 20 : 16, // %200 büyütüldü (8 * 2 = 16)
    fontWeight: '400', // Normal weight
    color: 'rgba(255,255,255,0.9)', // Biraz daha soluk
    lineHeight: Platform.OS === 'web' ? 24 : 20, // Line height de büyütüldü
  },
  // Landscape Container
  landscapeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  // Landscape Player Area
  landscapePlayerArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: Platform.OS === 'web' ? '100vh' : '100%',
    width: Platform.OS === 'web' ? '100vw' : '100%',
    zIndex: 1000, // En üstte olsun
  },
  // Gradient Overlays
  headerGradient: {
    position: 'absolute',
    top: -10, // Gradient'i mobilde daha da aşağı indir
    left: 0,
    right: 0,
    height: 200, // Header'dan aşağı gradient
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
  // Background Video Mobile Style with Safe Area
  backgroundVideoMobile: {
    position: 'absolute',
    top: 0, // Safe area'nın üstünden başla
    left: 0,
    right: 0,
    bottom: 0, // Safe area'nın altına kadar
    width: '100%',
    height: '100%',
    zIndex: -1,
  },
});
