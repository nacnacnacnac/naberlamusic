import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, ActivityIndicator, Animated, DeviceEventEmitter } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
import { Video, Audio } from 'expo-av';
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
  const [isReady, setIsReady] = useState(false);
  const heartbeatAnim = useRef(new Animated.Value(1)).current;

  // Media session for background controls - always active when video exists
  const { updatePlaybackState } = useMediaSession(
    video ? {
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
        setShouldPlay(true);
        if (videoRef.current) {
          await videoRef.current.playAsync();
          await updatePlaybackState(true);
          setTimeout(() => {
            onPlayStateChange?.(false);
          }, 100);
        }
      } catch (error: any) {
        onError?.(error.message);
      }
    },

    async pause() {
      try {
        setShouldPlay(false);
        if (videoRef.current) {
          await videoRef.current.pauseAsync();
          await updatePlaybackState(false);
          setTimeout(() => {
            onPlayStateChange?.(true);
          }, 100);
        }
      } catch (error: any) {
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
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Get video files directly from Vimeo API
        const response = await fetch(`https://api.vimeo.com/videos/${video.id}?fields=files`, {
          headers: {
            'Authorization': `Bearer ${await vimeoService.getCurrentToken()}`,
            'Accept': 'application/vnd.vimeo.*+json;version=3.4'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const videoData = await response.json();
        
        if (videoData?.files && videoData.files.length > 0) {
          // Find MP4 files
          const mp4Files = videoData.files.filter((file: any) => 
            file.type === 'video/mp4' && file.link
          );
          
          
          // Prefer HD quality, fallback to first available
          const bestFile = mp4Files.find((file: any) => 
            file.quality === 'hd' || file.rendition === '720p' || file.rendition === '1080p'
          ) || mp4Files[0];
          
          if (bestFile?.link) {
            setVideoUri(bestFile.link);
            // Reset video position for new video
            setCurrentTime(0);
            
            // Reset video position in player after a short delay
            setTimeout(async () => {
              if (videoRef.current) {
                try {
                  await videoRef.current.setPositionAsync(0);
                } catch (error) {
                }
              }
            }, 500);
          } else {
            throw new Error('No playable video file found');
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
    setIsLoading(false);
    setError(null);
    // DON'T trigger play state change on ready - video should start paused
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
    <ThemedView style={[styles.container, { height: playerHeight }]}>
      {/* Native Video Player */}
      <TouchableOpacity 
        style={styles.videoContainer}
        onPress={handleVideoTap}
        activeOpacity={1}
      >
        {videoUri && (
          <View style={{ overflow: 'hidden', flex: 1 }}>
            <Video
              key={`video-${video?.id}-${videoUri}`}
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
              }}
              resizeMode="contain"
            />
          </View>
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
    </ThemedView>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  video: {
    flex: 1,
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
