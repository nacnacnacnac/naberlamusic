import React, { useRef, forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { hybridVimeoService } from '@/services/hybridVimeoService';

export interface NativeVideoPlayerRef {
  play(): Promise<void>;
  pause(): Promise<void>;
  getCurrentTime(): Promise<number>;
  getDuration(): Promise<number>;
  setCurrentTime(seconds: number): Promise<void>;
  destroy(): Promise<void>;
}

export interface NativeVideoPlayerProps {
  videoId: string;
  isFullscreen?: boolean;
  playerHeight?: number;
  onReady?: () => void;
  onError?: (error: string) => void;
  onPlaybackStatusUpdate?: (status: any) => void;
  style?: any;
}

export const NativeVideoPlayer = forwardRef<NativeVideoPlayerRef, NativeVideoPlayerProps>(({
  videoId,
  isFullscreen = false,
  playerHeight = 300,
  onReady,
  onError,
  onPlaybackStatusUpdate,
  style,
}, ref) => {
  const videoRef = useRef<Video>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shouldPlay, setShouldPlay] = useState(false);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    async play() {
      try {
        console.log('🎵 [NATIVE-PLAYER] Play command - setting shouldPlay=true');
        setShouldPlay(true);
        if (videoRef.current) {
          await videoRef.current.playAsync();
          console.log('🎵 [NATIVE-PLAYER] playAsync() called');
        }
      } catch (error) {
        console.error('❌ [NATIVE-PLAYER] Play error:', error);
      }
    },

    async pause() {
      try {
        console.log('⏸️ [NATIVE-PLAYER] Pause command - setting shouldPlay=false');
        setShouldPlay(false);
        if (videoRef.current) {
          await videoRef.current.pauseAsync();
          console.log('⏸️ [NATIVE-PLAYER] pauseAsync() called');
        }
      } catch (error) {
        console.error('❌ [NATIVE-PLAYER] Pause error:', error);
      }
    },

    async getCurrentTime() {
      try {
        if (videoRef.current) {
          const status = await videoRef.current.getStatusAsync();
          return status.isLoaded ? (status.positionMillis || 0) / 1000 : 0;
        }
        return 0;
      } catch (error) {
        console.error('❌ Native video getCurrentTime error:', error);
        return 0;
      }
    },

    async getDuration() {
      try {
        if (videoRef.current) {
          const status = await videoRef.current.getStatusAsync();
          return status.isLoaded ? (status.durationMillis || 0) / 1000 : 0;
        }
        return 0;
      } catch (error) {
        console.error('❌ Native video getDuration error:', error);
        return 0;
      }
    },

    async setCurrentTime(seconds: number) {
      try {
        if (videoRef.current) {
          await videoRef.current.setPositionAsync(seconds * 1000);
          console.log(`⏭️ Native video seek to ${seconds}s`);
        }
      } catch (error) {
        console.error('❌ Native video setCurrentTime error:', error);
      }
    },

    async destroy() {
      try {
        if (videoRef.current) {
          await videoRef.current.unloadAsync();
          console.log('🧹 Native video destroyed');
        }
      } catch (error) {
        console.error('❌ Native video destroy error:', error);
      }
    }
  }));

  // Fetch direct video URL from Vimeo API
  useEffect(() => {
    const fetchVideoUrl = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('🔍 [NATIVE-PLAYER] Fetching direct video URL for:', videoId);
        
        // Get current token
        const token = await hybridVimeoService.getCurrentToken();
        console.log('🔑 [NATIVE-PLAYER] Token available:', !!token);
        
        if (!token) {
          throw new Error('No access token available');
        }
        
        // Get video files from Vimeo API
        const response = await fetch(`https://api.vimeo.com/videos/${videoId}?fields=files`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.vimeo.*+json;version=3.4'
          }
        });

        console.log('📡 [NATIVE-PLAYER] API Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [NATIVE-PLAYER] API Error:', response.status, errorText);
          throw new Error(`Failed to fetch video: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('📊 [NATIVE-PLAYER] Video data received:', {
          hasFiles: !!data.files,
          fileCount: data.files?.length || 0
        });
        
        const files = data.files || [];

        // Find best quality MP4 file
        const mp4Files = files.filter((file: any) => 
          file.type === 'video/mp4' && 
          file.quality !== 'hls' &&
          file.link
        );

        console.log('🎬 [NATIVE-PLAYER] MP4 files found:', mp4Files.length);
        mp4Files.forEach((file: any, index: number) => {
          console.log(`📹 [NATIVE-PLAYER] File ${index + 1}:`, {
            quality: file.quality,
            rendition: file.rendition,
            hasLink: !!file.link
          });
        });

        if (mp4Files.length === 0) {
          console.error('❌ [NATIVE-PLAYER] No MP4 files found in:', files);
          throw new Error('No compatible video files found');
        }

        // Sort by quality (prefer HD, then SD)
        mp4Files.sort((a: any, b: any) => {
          const qualityOrder = { 'hd': 3, 'sd': 2, 'mobile': 1 };
          return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
        });

        const bestFile = mp4Files[0];
        console.log('✅ [NATIVE-PLAYER] Selected video:', {
          quality: bestFile.quality,
          rendition: bestFile.rendition,
          url: bestFile.link.substring(0, 50) + '...'
        });
        
        setVideoUri(bestFile.link);
        console.log('🎯 [NATIVE-PLAYER] Video URI set, loading should end');

      } catch (error: any) {
        console.error('💥 [NATIVE-PLAYER] Failed to fetch video URL:', error);
        setError(error.message);
        onError?.(error.message);
      } finally {
        setIsLoading(false);
        console.log('🏁 [NATIVE-PLAYER] Fetch process completed');
      }
    };

    if (videoId) {
      console.log('🚀 [NATIVE-PLAYER] Starting fetch for video:', videoId);
      fetchVideoUrl();
    }
  }, [videoId]);

  // Monitor shouldPlay changes
  useEffect(() => {
    console.log('🎬 [NATIVE-PLAYER] shouldPlay changed to:', shouldPlay);
    if (videoRef.current && videoUri) {
      if (shouldPlay) {
        console.log('🎵 [NATIVE-PLAYER] Triggering playAsync due to shouldPlay=true');
        videoRef.current.playAsync().catch(error => {
          console.error('❌ [NATIVE-PLAYER] Auto-play failed:', error);
        });
      } else {
        console.log('⏸️ [NATIVE-PLAYER] Triggering pauseAsync due to shouldPlay=false');
        videoRef.current.pauseAsync().catch(error => {
          console.error('❌ [NATIVE-PLAYER] Auto-pause failed:', error);
        });
      }
    }
  }, [shouldPlay, videoUri]);

  // Handle playback status updates
  const handlePlaybackStatusUpdate = (status: any) => {
    console.log('🎬 [NATIVE-PLAYER] Status update:', {
      isLoaded: status.isLoaded,
      isPlaying: status.isPlaying,
      shouldPlay: shouldPlay,
      positionMillis: status.positionMillis,
      durationMillis: status.durationMillis,
      error: status.error
    });

    if (status.isLoaded && !status.error) {
      // Video loaded successfully
      if (status.durationMillis && !status.didJustFinish) {
        setDuration((status.durationMillis || 0) / 1000);
        setCurrentTime((status.positionMillis || 0) / 1000);
        
        if (isLoading) {
          setIsLoading(false);
          onReady?.();
          console.log('✅ [NATIVE-PLAYER] Video ready, loading ended');
        }
      }
    } else if (status.error) {
      console.error('❌ [NATIVE-PLAYER] Playback error:', status.error);
      setError(status.error);
      setIsLoading(false);
      onError?.(status.error);
    }

    onPlaybackStatusUpdate?.(status);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { height: playerHeight }, style]}>
        <View style={styles.loading}>
          {/* Loading indicator could go here */}
        </View>
      </View>
    );
  }

  if (error || !videoUri) {
    return (
      <View style={[styles.container, { height: playerHeight }, style]}>
        <View style={styles.error}>
          {/* Error message could go here */}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: playerHeight }, style]}>
      <View style={styles.videoWrapper}>
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri: videoUri }}
          useNativeControls={false}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={shouldPlay}
          isLooping={false}
          isMuted={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

NativeVideoPlayer.displayName = 'NativeVideoPlayer';
