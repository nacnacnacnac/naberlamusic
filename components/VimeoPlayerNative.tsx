import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, ActivityIndicator, Animated, DeviceEventEmitter, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
import { Video, Audio } from 'expo-av';
import { useVideoPlayer, VideoView } from 'expo-video';
import { hybridVimeoService } from '@/services/hybridVimeoService';
import { vimeoService } from '@/services/vimeoService';
import { useMediaSession } from '@/hooks/useMediaSession';

export interface VimeoPlayerRef {
  play(): Promise<void>;
  pause(): Promise<void>;
  getCurrentTime(): Promise<number>;
  getDuration(): Promise<number>;
  setCurrentTime(seconds: number): Promise<void>;
  destroy(): Promise<void>;
  isReady(): boolean;
}

interface VimeoPlayerProps {
  video: SimplifiedVimeoVideo;
  isFullscreen?: boolean;
  playerHeight?: number;
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
  onPlayStateChange,
  onTimeUpdate,
  onError,
  onReady,
  onNext,
}, ref) => {
  const videoRef = useRef<Video>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [shouldPlay, setShouldPlay] = useState(false);

  // Web için expo-video player
  const webVideoPlayer = Platform.OS === 'web' ? useVideoPlayer(videoUri || '', player => {
    console.log('🎬 Initializing web video player with:', videoUri);
    player.loop = false;
    player.muted = false;
    player.volume = 1.0;
    player.allowsExternalPlayback = true;
    player.staysActiveInBackground = false;
    console.log('🎬 Player initialized - muted:', player.muted, 'volume:', player.volume);
  }) : null;

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


  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    async play() {
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
              
              if (playPromise && typeof playPromise.then === 'function') {
                playPromise.then(() => {
                  console.log('🔊 HTML5 video play successful');
                  // Don't call onPlayStateChange to avoid loops
                }).catch((error: any) => {
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
              onError?.(error.message);
            }
          } else {
            console.error('❌ HTML5 video element not found');
          }
          return;
        }
        
        // Native: expo-av player
        console.log('📱 Playing native video');
        
        // AGGRESSIVELY stop any other audio sources first
        try {
          const { Audio } = require('expo-av');
          
          // Force unload all audio instances
          console.log('🔇 FORCE STOPPING ALL AUDIO INSTANCES');
          
          // Try to access and stop any global audio instances
          if (Audio._instances) {
            console.log('🔇 Found Audio._instances, clearing...');
            Audio._instances.forEach((instance: any) => {
              try {
                if (instance.unloadAsync) instance.unloadAsync();
                if (instance.stopAsync) instance.stopAsync();
              } catch (e) {}
            });
          }
          
          // Reset audio mode completely
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: false,
            staysActiveInBackground: false,
            interruptionModeIOS: 1, // MixWithOthers first to reset
          });
          
          // Then set our desired mode
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            interruptionModeIOS: 0, // DoNotMix - stop other audio
          });
          
          console.log('🔇 AUDIO CLEANUP COMPLETED');
        } catch (audioError) {
          console.log('⚠️ Audio mode setup error:', audioError);
        }
        
        setShouldPlay(true);
        if (videoRef.current && videoUri) {
          console.log('🎬 Video ref and URI available, playing...');
          await videoRef.current.playAsync();
          await updatePlaybackState(true);
          setTimeout(() => {
            onPlayStateChange?.(false);
          }, 100);
        } else {
          console.log('⚠️ Video ref or URI not available:', { 
            hasRef: !!videoRef.current, 
            hasUri: !!videoUri 
          });
        }
      } catch (error: any) {
        console.log('❌ Play error:', error);
        onError?.(error.message);
      }
    },

    async pause() {
      try {
        console.log('⏸️ VimeoPlayerNative.pause() called');
        
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
              // Don't call onPlayStateChange to avoid loops
              console.log('🔊 HTML5 video paused successfully');
            } catch (error: any) {
              console.error('❌ HTML5 video pause error:', error);
              onError?.(error.message);
            }
          } else {
            console.error('❌ HTML5 video element not found');
          }
          return;
        }
        
        // Native: expo-av player
        console.log('📱 Pausing native video');
        setShouldPlay(false);
        if (videoRef.current) {
          await videoRef.current.pauseAsync();
          await updatePlaybackState(false);
          setTimeout(() => {
            onPlayStateChange?.(true);
          }, 100);
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
        if (videoRef.current) {
          await videoRef.current.setPositionAsync(seconds * 1000);
        }
      } catch (error: any) {
        console.error('❌ Seek error:', error);
        onError?.(error.message);
      }
    },

    async destroy() {
      try {
        if (videoRef.current) {
          await videoRef.current.unloadAsync();
        }
      } catch (error: any) {
        console.error('❌ Destroy error:', error);
      }
    },

    isReady() {
      return isReady;
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
      if (videoRef.current) {
        videoRef.current.pauseAsync();
      }
      setShouldPlay(false);
    });

    return () => {
      stopMusicListener.remove();
    };
  }, []);


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
        const { Audio } = require('expo-av');
        
        console.log('🔇 FORCE CLEARING ALL AUDIO ON VIDEO SWITCH');
        
        // Try to access and stop any global audio instances
        if (Audio._instances) {
          console.log('🔇 Found Audio._instances during video switch, clearing...');
          Audio._instances.forEach((instance: any) => {
            try {
              if (instance.unloadAsync) instance.unloadAsync();
              if (instance.stopAsync) instance.stopAsync();
            } catch (e) {}
          });
        }
        
        // Reset audio mode completely
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
          staysActiveInBackground: false,
          interruptionModeIOS: 1, // MixWithOthers first to reset
        });
        
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
    if (!videoRef.current || !videoUri) return;
    
    // Add small delay for Android compatibility
    const timer = setTimeout(() => {
      if (videoRef.current && videoUri) {
        if (shouldPlay) {
          videoRef.current.playAsync().catch(error => {
          });
        } else {
          videoRef.current.pauseAsync().catch(error => {
          });
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [shouldPlay, videoUri]);

  // Handle video ready
  const handleVideoReady = () => {
    console.log('🎬 handleVideoReady called, shouldPlay:', shouldPlay);
    setIsLoading(false);
    setError(null);
    
    // If shouldPlay is true, trigger play for web - DISABLED FOR DEBUGGING
    if (Platform.OS === 'web' && shouldPlay) {
      console.log('🎬 Auto-triggering play on video ready (web) - DISABLED FOR DEBUGGING');
      // setTimeout(() => {
      //   const videoElement = document.querySelector('video');
      //   if (videoElement) {
      //     videoElement.muted = false; // Sesli başlasın
      //     videoElement.play().catch(error => {
      //       console.log('❌ Auto-play failed on ready:', error);
      //     });
      //   }
      // }, 100);
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
        setTimeout(async () => {
          if (videoRef.current) {
            try {
              await videoRef.current.setPositionAsync(0);
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
            <Video
              key={`video-${video?.id}`}
              ref={videoRef}
              source={{ uri: videoUri }}
              style={styles.video}
              useNativeControls={false}
              shouldPlay={shouldPlay}
              isLooping={false}
              isMuted={false}
              volume={1.0}
              showsTimecodes={false}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              onLoad={() => {
                handleVideoReady();
              }}
              resizeMode="contain"
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
    flex: 1,
    position: 'relative',
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
    flex: 1,
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
