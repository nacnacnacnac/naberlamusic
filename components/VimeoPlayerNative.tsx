import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useMediaSession } from '@/hooks/useMediaSession';
import { hybridVimeoService } from '@/services/hybridVimeoService';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
// Migrated from expo-av to expo-video
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent, useEventListener } from 'expo';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, DeviceEventEmitter, Image, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

export interface VimeoPlayerRef {
  play(): Promise<void>;
  pause(): Promise<void>;
  getCurrentTime(): Promise<number>;
  getDuration(): Promise<number>;
  setCurrentTime(seconds: number): Promise<void>;
  destroy(): Promise<void>;
  isReady(): boolean;
  setMuted?(muted: boolean): Promise<void>;
  isMuted?(): boolean;
}

interface VimeoPlayerProps {
  video: SimplifiedVimeoVideo;
  isFullscreen?: boolean;
  playerHeight?: number;
  isPaused?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onError?: (error: string) => void;
  onReady?: () => void;
  onNext?: () => void;
}

export const VimeoPlayerNative = forwardRef<VimeoPlayerRef, VimeoPlayerProps>(({
  video,
  isFullscreen = false,
  playerHeight = 300,
  isPaused = false,
  onPlayStateChange,
  onTimeUpdate,
  onError,
  onReady,
  onNext,
}, ref) => {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // expo-video player for both web and native
  const videoPlayer = useVideoPlayer('', player => {
    console.log('🎬 Initializing empty video player');
    player.loop = false;
    player.muted = isMuted;
    player.volume = 1.0;
    if (Platform.OS === 'web') {
      player.allowsExternalPlayback = true;
      player.staysActiveInBackground = false;
    }
  });

  // Update video source when videoUri changes
  useEffect(() => {
    if (videoUri && videoPlayer) {
      console.log('🎬 Updating video player source:', videoUri);
      
      // Video source değiştiğinde loading state'ini resetle
      setIsLoading(true);
      setError(null);
      setIsReady(false);
      
      // Use replaceAsync to avoid UI freezes on iOS
      videoPlayer.replaceAsync(videoUri).catch(error => {
        console.error('❌ Failed to replace video source:', error);
        setIsLoading(false);
        setError(error.message || 'Failed to load video');
      });
    }
  }, [videoUri, videoPlayer]);

  // Use expo-video event listeners according to docs
  useEventListener(videoPlayer, 'playingChange', ({ isPlaying }) => {
    setIsPlaying(isPlaying);
    onPlayStateChange?.(isPlaying);
  });

  useEventListener(videoPlayer, 'statusChange', ({ status, error }) => {
    console.log('🎬 Status change:', status, error ? `Error: ${error}` : '');
    
    if (status === 'loading') {
      console.log('🎬 Video loading started - setting isLoading: true');
      setIsLoading(true);
      setError(null);
    } else if (status === 'readyToPlay') {
      console.log('🎬 Video ready to play - setting isLoading: false');
      
      setIsLoading(false);
      setIsReady(true);
      onReady?.();
      
      // Always call handleVideoReady when video is ready
      handleVideoReady();
    } else if (status === 'error' && error) {
      const errorMessage = typeof error === 'string' ? error : 
                          error?.message || 
                          JSON.stringify(error) || 
                          'Unknown video error';
      // Handle specific error cases
      if (errorMessage.includes('Cannot Open') || errorMessage.includes('Failed to load')) {
        console.log('🎬 Video not available, will try next video');
        console.log('📹 Skipping unavailable video:', errorMessage);
        setError('Video not available');
        // Don't call onError for unavailable videos - this is expected behavior
        
        // Auto-skip to next video after a short delay
        setTimeout(() => {
          onNext?.();
        }, 2000);
      } else {
        console.error('❌ Video player error:', errorMessage);
        setError(errorMessage);
        onError?.(errorMessage);
      }
    }
  });

  useEventListener(videoPlayer, 'timeUpdate', ({ currentTime, duration }) => {
    setCurrentTime(currentTime || 0);
    setDuration(duration || 0);
    onTimeUpdate?.(currentTime || 0, duration || 0);
  });

  // Simplified: Only handle video ready state, let main app control play/pause via ref methods

  // Web video player state
  const [webVideoReady, setWebVideoReady] = useState(false);

  const [isReady, setIsReady] = useState(false);
  const heartbeatAnim = useRef(new Animated.Value(1)).current;

  // Media session for background controls - only for native platforms
  const { updatePlaybackState } = useMediaSession(
    Platform.OS !== 'web' && video ? {
      title: video.name || 'Naber-la Video',
      artist: 'Naber-la',
      duration: duration || 0,
      currentTime: currentTime || 0,
    } : null
  );

  // Web Media Session API for lock screen controls
  useEffect(() => {
    if (Platform.OS === 'web' && video && 'mediaSession' in navigator) {
      try {
        // Set metadata for lock screen
        (navigator as any).mediaSession.metadata = new (window as any).MediaMetadata({
          title: video.name || 'Naber LA Music',
          artist: 'Naber LA',
          album: 'Naber LA',
          artwork: [
            { src: '/naber-la-128.png', sizes: '128x128', type: 'image/png' },
            { src: '/naber-la-256.png', sizes: '256x256', type: 'image/png' },
            { src: '/naber-la-512.png', sizes: '512x512', type: 'image/png' }
          ]
        });

        // Set action handlers for lock screen controls
        (navigator as any).mediaSession.setActionHandler('play', () => {
          console.log('🎵 Media Session: Play requested');
          playVideo();
        });

        (navigator as any).mediaSession.setActionHandler('pause', () => {
          console.log('🎵 Media Session: Pause requested');
          pauseVideo();
        });

        (navigator as any).mediaSession.setActionHandler('previoustrack', () => {
          console.log('🎵 Media Session: Previous track requested');
          // You can add previous track functionality here if needed
        });

        (navigator as any).mediaSession.setActionHandler('nexttrack', () => {
          console.log('🎵 Media Session: Next track requested');
          if (onNext) onNext();
        });

        console.log('🎵 Web Media Session configured for:', video.name);
      } catch (error) {
        console.warn('🎵 Media Session setup failed:', error);
      }
    }
  }, [video?.name, video?.id]);

  // Page Visibility API - prevent pause on screen lock (web only)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleVisibilityChange = () => {
        // Only try to resume if we were playing and video is ready
        if (document.hidden && isPlaying && (globalThis as any).webVideoElement) {
          console.log('🎵 Screen locked, attempting to keep audio playing');
          
          // Small delay to let the system settle
          setTimeout(() => {
            const videoElement = (globalThis as any).webVideoElement;
            if (videoElement && videoElement.paused && isPlaying) {
              videoElement.play().catch((error) => {
                console.log('🎵 Background play attempt failed (expected on iOS):', error.message);
              });
            }
          }, 100);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [isPlaying]);

  // Define play/pause functions for both ref and media session
  const playVideo = async () => {
    try {
      console.log('🎬 VimeoPlayerNative.play() called');
      
      if (Platform.OS === 'web') {
        // Web: HTML5 video player
        console.log('🌐 Playing HTML5 video with sound');
        
        const videoElement = (globalThis as any).webVideoElement;
        if (videoElement) {
          try {
            videoElement.muted = false;
            videoElement.volume = 1.0;
            
            console.log('🎬 HTML5 video state:', {
              muted: videoElement.muted,
              volume: videoElement.volume,
              paused: videoElement.paused,
              readyState: videoElement.readyState
            });
            
            const playPromise = videoElement.play();
            
            // Update state immediately
            setIsPlaying(true);
            setShouldPlay(true);
            
            // Update web media session playback state
            if (Platform.OS === 'web' && 'mediaSession' in navigator) {
              (navigator as any).mediaSession.playbackState = 'playing';
            }
            
            if (playPromise && typeof playPromise.then === 'function') {
              playPromise.then(() => {
                console.log('🔊 HTML5 video play successful');
                // Don't call onPlayStateChange to avoid loops
              }).catch((error) => {
                console.error('❌ HTML5 video play failed:', error);
                // Revert state on error
                setIsPlaying(false);
                setShouldPlay(false);
                onError?.(error.message);
              });
            } else {
              console.log('🔊 HTML5 video play called (sync)');
              // Don't call onPlayStateChange to avoid loops
            }
          } catch (error: any) {
            console.error('❌ HTML5 video play error:', error);
            setIsPlaying(false);
            setShouldPlay(false);
            onError?.(error.message);
          }
        }
      } else {
        // Native: expo-video player
        if (player) {
          player.play();
          setIsPlaying(true);
          setShouldPlay(true);
          
          // Update native media session
          updatePlaybackState(true);
        }
      }
      
      onPlayStateChange?.(true);
    } catch (error: any) {
      console.error('❌ Play error:', error);
      onError?.(error.message);
    }
  };

  const pauseVideo = async () => {
    try {
      console.log('🎬 VimeoPlayerNative.pause() called');
      
      if (Platform.OS === 'web') {
        // Web: HTML5 video player
        console.log('🌐 Pausing HTML5 video');
        
        const videoElement = (globalThis as any).webVideoElement;
        if (videoElement) {
          try {
            videoElement.pause();
            // Update state immediately
            setIsPlaying(false);
            setShouldPlay(false);
            
            // Update web media session playback state
            if (Platform.OS === 'web' && 'mediaSession' in navigator) {
              (navigator as any).mediaSession.playbackState = 'paused';
            }
            // Don't call onPlayStateChange to avoid loops
            console.log('🔊 HTML5 video paused successfully');
          } catch (error: any) {
            console.error('❌ HTML5 video pause error:', error);
            onError?.(error.message);
          }
        }
      } else {
        // Native: expo-video player
        if (player) {
          player.pause();
          setIsPlaying(false);
          setShouldPlay(false);
          
          // Update native media session
          updatePlaybackState(false);
        }
      }
      
      onPlayStateChange?.(false);
    } catch (error: any) {
      console.error('❌ Pause error:', error);
      onError?.(error.message);
    }
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    async play() {
      try {
        console.log('🎬 VimeoPlayerNative.play() called');
        
        if (videoPlayer) {
          videoPlayer.play();
          setIsPlaying(true);
          setShouldPlay(true);
          
          // Update web media session playback state
          if (Platform.OS === 'web' && 'mediaSession' in navigator) {
            (navigator as any).mediaSession.playbackState = 'playing';
          }
          
          onPlayStateChange?.(true);
          console.log('🔊 expo-video play successful');
        } else {
          console.error('❌ Video player not available');
        }
      } catch (error: any) {
        console.log('❌ Play error:', error);
        onError?.(error.message);
      }
    },

    async pause() {
      try {
        console.log('⏸️ VimeoPlayerNative.pause() called');
        
        if (videoPlayer) {
          videoPlayer.pause();
          setIsPlaying(false);
          setShouldPlay(false);
          
          // Update web media session playback state
          if (Platform.OS === 'web' && 'mediaSession' in navigator) {
            (navigator as any).mediaSession.playbackState = 'paused';
          }
          
          onPlayStateChange?.(false);
          console.log('🔊 expo-video paused successfully');
        } else {
          console.error('❌ Video player not available');
        }
      } catch (error: any) {
        console.log('❌ Pause error:', error);
        onError?.(error.message);
      }
    },

    async getCurrentTime() {
      return currentTime;
    },

    async getDuration() {
      return duration;
    },

    async setCurrentTime(seconds: number) {
      try {
        if (videoPlayer) {
          videoPlayer.currentTime = seconds;
          setCurrentTime(seconds);
        }
      } catch (error: any) {
        console.error('❌ Seek error:', error);
        onError?.(error.message);
      }
    },

    async destroy() {
      try {
        if (videoPlayer) {
          videoPlayer.release();
        }
      } catch (error: any) {
        console.error('❌ Destroy error:', error);
      }
    },

    isReady() {
      return isReady;
    },

    async setMuted(muted: boolean) {
      try {
        console.log('🔇 VimeoPlayerNative.setMuted() called with:', muted);
        
        if (videoPlayer) {
          videoPlayer.muted = muted;
          setIsMuted(muted);
          console.log('🔇 expo-video muted set to:', muted);
        } else {
          console.error('❌ Video player not available for mute');
        }
      } catch (error: any) {
        console.error('❌ setMuted error:', error);
        onError?.(error.message);
      }
    },

    isMuted() {
      return isMuted;
    }
  }));

  // Heartbeat animation for loading
  useEffect(() => {
    if (isLoading) {
      const heartbeat = Animated.loop(
        Animated.sequence([
          Animated.timing(heartbeatAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(heartbeatAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      heartbeat.start();
      return () => heartbeat.stop();
    }
  }, [isLoading]);

  // Web video ready handling - NO AUTOPLAY
  useEffect(() => {
    if (Platform.OS === 'web' && videoUri) {
      console.log('🌐 HTML5 video ready, waiting for user interaction');
      
      setTimeout(() => {
        const videoElement = (globalThis as any).webVideoElement;
        if (videoElement) {
          // Just prepare the video, don't autoplay
          videoElement.muted = false;
          videoElement.volume = 1.0;
          
          // Set initial state as paused
          setIsPlaying(false);
          
          console.log('🎬 HTML5 video prepared, ready for user interaction');
        }
      }, 100);
    }
  }, [videoUri]);

  // Listen for global stop music events
  useEffect(() => {
    const stopMusicListener = DeviceEventEmitter.addListener('STOP_ALL_MUSIC', () => {
      if (videoPlayer) {
        videoPlayer.pause();
      }
      setShouldPlay(false);
    });

    return () => {
      stopMusicListener.remove();
    };
  }, [videoPlayer]);


  // Fetch video URL from Vimeo API
  useEffect(() => {
    const fetchVideoUrl = async () => {
      if (!video?.id) return;
      
      console.log('🎬 Loading new video:', video.id, video.name);
      setIsLoading(true);
      setError(null);
      setWebVideoReady(false); // Reset web video ready state
      
      // AGGRESSIVELY stop any existing audio when switching videos
      try {
        // Audio cleanup now handled by expo-video
        
        // SDK 54: expo-video handles audio cleanup automatically
        console.log('🔇 SDK 54: Audio cleanup handled by expo-video on video switch');
        
        console.log('🔇 VIDEO SWITCH AUDIO CLEANUP COMPLETED');
      } catch (audioError) {
        console.log('⚠️ Audio cleanup error:', audioError);
      }
      
      try {
        // Eski çalışan yöntem: Backend token ile MP4 URL al
        console.log('🎬 Using backend token for video:', video.id);
        const token = await hybridVimeoService.getCurrentToken();
        
        const response = await fetch(`https://api.vimeo.com/videos/${video.id}?fields=files`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.vimeo.*+json;version=3.4'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const videoData = await response.json();
        
        if (videoData?.files && videoData.files.length > 0) {
          // En basit filtreleme: sadece MP4 ve M3U8 değil
          const mp4Files = videoData.files.filter((file: any) => 
            file.type === 'video/mp4' && 
            file.link && 
            !file.link.includes('.m3u8')
          );
          
          // En iyi kaliteyi seç
          const bestFile = mp4Files.find((file: any) => 
            file.quality === 'hd' || file.rendition === '720p' || file.rendition === '1080p'
          ) || mp4Files[0];
          
          if (bestFile?.link) {
            console.log('🎬 Setting video URI for:', video.id, video.name);
            console.log('🎬 Video URL:', bestFile.link.substring(0, 50) + '...');
            setVideoUri(bestFile.link);
            setCurrentTime(0);
            
            // Update web video player source
            if (Platform.OS === 'web' && webVideoPlayer) {
              console.log('🌐 Updating web video player source with sound');
              webVideoPlayer.replace(bestFile.link);
              webVideoPlayer.muted = false;
              webVideoPlayer.volume = 1.0;
              
              // Set ready after a short delay
              setTimeout(() => {
                setWebVideoReady(true);
                setIsLoading(false);
                setIsReady(true);
                onReady?.();
              }, 1000);
            }
            
            setIsLoading(false);
          } else {
            throw new Error('No MP4 file found');
          }
        } else {
          throw new Error('No video files available');
        }
      } catch (error: any) {
        console.error('❌ [VIMEO-NATIVE] Failed to fetch video URL:', error);
        handleVideoError(error.message || 'Failed to load video');
      }
    };

    fetchVideoUrl();
  }, [video?.id]);

  // Handle shouldPlay changes
  useEffect(() => {
    if (!videoPlayer || !videoUri) return;
    
    // Add small delay for Android compatibility
    const timer = setTimeout(() => {
      if (videoPlayer && videoUri) {
        if (shouldPlay) {
          videoPlayer.play();
        } else {
          videoPlayer.pause();
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [shouldPlay, videoUri, videoPlayer]);

  // Handle video ready
  const handleVideoReady = () => {
    console.log('🎬 handleVideoReady called, shouldPlay:', shouldPlay);
    setIsLoading(false);
    setError(null);
    
    // Auto-start video playback when ready
    console.log('🎬 Video ready, starting playback');
    setShouldPlay(true);
    
    if (videoPlayer) {
      videoPlayer.play();
      console.log('🎬 Started video playback');
    }
    
    onReady?.();
  };

  // Handle video error
  const handleVideoError = (errorMessage: string) => {
    console.error('❌ Native video error:', errorMessage);
    setError(errorMessage);
    setIsLoading(false);
    onError?.(errorMessage);
  };

  // Handle playback status updates
  const handlePlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded && !status.error) {
      const newCurrentTime = (status.positionMillis || 0) / 1000;
      const newDuration = (status.durationMillis || 0) / 1000;
      const newIsPlaying = status.isPlaying || false;
      
      // Update time and duration
      setCurrentTime(newCurrentTime);
      if (newDuration > 0) {
        setDuration(newDuration);
      }
      
      // Check if video finished
      if (status.didJustFinish) {
        console.log('🔚 Video finished - didJustFinish triggered, calling onNext');
        onNext?.();
        return;
      }
      
      // Only update local state, don't notify main app automatically
      if (newIsPlaying !== isPlaying) {
        setIsPlaying(newIsPlaying);
        // Update media session for background controls
        updatePlaybackState(newIsPlaying);
        // DON'T call onPlayStateChange here - only call it from user actions
      }
      
      onTimeUpdate?.(newCurrentTime, newDuration);
      
      // Call ready only once when first loaded
      if (isLoading) {
        setIsReady(true);
        handleVideoReady();
        
        // Ensure video starts from beginning
        setTimeout(() => {
          if (videoPlayer) {
            try {
              videoPlayer.currentTime = 0;
            } catch (error) {
            }
          }
        }, 100);
      }
    } else if (status.error) {
      console.error('❌ [VIMEO-NATIVE] Playback error:', status.error);
      handleVideoError(status.error);
    }
  };

  // Handle video tap - disable for now to avoid state conflicts
  const handleVideoTap = async () => {
    // Disabled to prevent state sync issues
    // Users should use footer play/pause buttons
  };

  return (
    <ThemedView style={Platform.OS === 'web' ? styles.webContainer : [styles.container, { height: playerHeight }]}>
      {Platform.OS === 'web' ? (
        // Web: HTML5 Video Player
        <TouchableOpacity 
          style={styles.webVideoContainer}
          onPress={handleVideoTap}
          activeOpacity={1}
        >
          {videoUri && (
            <video
              ref={(video) => {
                if (video) {
                  // Store video element reference
                  (globalThis as any).webVideoElement = video;
                  
                  // Set up video properties
                  video.muted = false;
                  video.volume = 1.0;
                  video.loop = false;
                  video.playsInline = true;
                  video.controls = false;
                  
                  // Handle video events
                  video.onloadeddata = () => {
                    console.log('🎬 HTML5 video loaded');
                    setIsLoading(false);
                    setIsReady(true);
                    onReady?.();
                  };
                  
                  video.onplay = () => {
                    console.log('🎬 HTML5 video playing (event)');
                    // Don't update state here to avoid conflicts
                  };
                  
                  video.onpause = () => {
                    console.log('🎬 HTML5 video paused (event)');
                    // Don't update state here to avoid conflicts
                  };
                  
                  video.onerror = (e) => {
                    console.error('❌ HTML5 video error:', e);
                    setError('Video playback error');
                  };
                  
                  video.onended = () => {
                    console.log('🔚 HTML5 video ended - calling onNext');
                    onNext?.();
                  };
                }
              }}
              src={videoUri}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                objectFit: 'cover',
                zIndex: -1,
              }}
              autoPlay={false}
              muted={false}
            />
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <View style={styles.overlay}>
              <Animated.View style={{ transform: [{ scale: heartbeatAnim }] }}>
                <Image 
                  source={require('@/assets/images/animation/heart.png')} 
                  style={{ width: 48, height: 48 }}
                />
              </Animated.View>
            </View>
          )}

          {/* Error Overlay */}
          {error && (
            <View style={styles.overlay}>
              <IconSymbol name="exclamationmark.triangle" size={48} color="#ff4444" />
              <ThemedText style={styles.errorText}>Video Error</ThemedText>
              <ThemedText style={styles.errorDetail}>{error}</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        // Native: Expo AV Video Player
        <TouchableOpacity 
          style={styles.videoContainer}
          onPress={handleVideoTap}
          activeOpacity={1}
        >
          {videoUri && (
            <VideoView
              key={`video-${video?.id}`}
              style={{
                position: 'absolute',
                top: -100, // Yukarıya taşı
                left: -100, // Sola taşı
                right: -100, // Sağa taşı
                bottom: -100, // Aşağıya taşı
                width: '120%', // Daha büyük genişlik
                height: '120%', // Daha büyük yükseklik
                backgroundColor: 'blue', // Debug - mavi alan görünmeli
              }}
              player={videoPlayer}
              allowsFullscreen
              allowsPictureInPicture
              contentFit="fill"
              surfaceType="textureView"
              nativeControls={false}
            />
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <View style={styles.overlay}>
              <Animated.View style={{ transform: [{ scale: heartbeatAnim }] }}>
                <Image 
                  source={require('@/assets/images/animation/heart.png')} 
                  style={{ width: 48, height: 48 }}
                />
              </Animated.View>
            </View>
          )}

          {/* Error Overlay */}
          {error && (
            <View style={styles.overlay}>
              <IconSymbol name="exclamationmark.triangle" size={48} color="#ff4444" />
              <ThemedText style={styles.errorText}>Video Error</ThemedText>
              <ThemedText style={styles.errorDetail}>{error}</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      )}
    </ThemedView>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  webContainer: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    overflow: 'visible',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    width: '100%',
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    zIndex: -1,
    overflow: 'hidden',
  },
  webVideoContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    minWidth: '100vw',
    minHeight: '100vh',
    zIndex: -1,
    overflow: 'hidden',
    // Browser'ın tüm alanını kapla
    margin: 0,
    padding: 0,
    boxSizing: 'border-box',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: -1, // Background video
    backgroundColor: 'transparent',
    // Tam ekran zorla - aspect ratio'yu boz
    aspectRatio: undefined,
    flex: 1,
    transform: [
      { scale: 2.0 } // Daha da büyük scale
    ],
  },
  webVideo: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: -1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#ff4444',
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorDetail: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

VimeoPlayerNative.displayName = 'VimeoPlayerNative';
