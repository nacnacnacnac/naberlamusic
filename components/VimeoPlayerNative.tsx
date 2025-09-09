import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
import { NativeVideoPlayer, NativeVideoPlayerRef } from './NativeVideoPlayer';
// import { WebView } from 'react-native-webview'; // Removed to fix RNCWebView conflict
import { nativeVideoService } from '@/services/nativeVideoService';

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
}

export const VimeoPlayerNative = forwardRef<VimeoPlayerRef, VimeoPlayerProps>(({
  video,
  isFullscreen = false,
  playerHeight = 300,
  onPlayStateChange,
  onTimeUpdate,
  onError,
  onReady,
}, ref) => {
  const playerRef = useRef<NativeVideoPlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Removed WebView fallback state
  
  // Removed iOS Simulator detection to fix WebView conflicts

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    async play() {
      try {
        console.log('🎵 [VIMEO-NATIVE] Play command received');
        await playerRef.current?.play();
        setIsPlaying(true);
        console.log('🎵 [VIMEO-NATIVE] Calling onPlayStateChange(false) - playing=true means paused=false');
        onPlayStateChange?.(false); // Playing = not paused
      } catch (error: any) {
        console.error('❌ [VIMEO-NATIVE] Play error:', error);
        onError?.(error.message);
      }
    },

    async pause() {
      try {
        console.log('⏸️ [VIMEO-NATIVE] Pause command received');
        await playerRef.current?.pause();
        setIsPlaying(false);
        console.log('⏸️ [VIMEO-NATIVE] Calling onPlayStateChange(true) - paused=true means paused=true');
        onPlayStateChange?.(true); // Paused = paused
      } catch (error: any) {
        console.error('❌ [VIMEO-NATIVE] Pause error:', error);
        onError?.(error.message);
      }
    },

    async getCurrentTime() {
      try {
        return await playerRef.current?.getCurrentTime() || 0;
      } catch (error) {
        return 0;
      }
    },

    async getDuration() {
      try {
        return await playerRef.current?.getDuration() || 0;
      } catch (error) {
        return 0;
      }
    },

    async setCurrentTime(seconds: number) {
      try {
        await playerRef.current?.setCurrentTime(seconds);
      } catch (error: any) {
        console.error('❌ Seek error:', error);
        onError?.(error.message);
      }
    },

    async destroy() {
      try {
        await playerRef.current?.destroy();
      } catch (error: any) {
        console.error('❌ Destroy error:', error);
      }
    },

    isReady() {
      return !isLoading && !error;
    }
  }));


  // Handle video ready
  const handleVideoReady = () => {
    console.log('✅ [VIMEO-NATIVE] Video ready:', video.title);
    setIsLoading(false);
    setError(null);
    // DON'T trigger play state change on ready - video should start paused
    console.log('🎬 [VIMEO-NATIVE] Video ready but staying paused (isPlaying: false)');
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
      
      console.log('🎬 [VIMEO-NATIVE] Status update - isPlaying:', newIsPlaying, 'current:', isPlaying);
      
        // Only update and notify if state actually changed
        if (newIsPlaying !== isPlaying) {
          console.log('🎬 [VIMEO-NATIVE] Play state changed from status:', isPlaying, '→', newIsPlaying);
          setIsPlaying(newIsPlaying);
          // Convert isPlaying to isPaused for main app (inverted logic)
          const isPausedForMainApp = !newIsPlaying;
          console.log('🎬 [VIMEO-NATIVE] Sending to main app - isPaused:', isPausedForMainApp);
          onPlayStateChange?.(isPausedForMainApp);
        }
      
      onTimeUpdate?.(newCurrentTime, newDuration);
      
      // Call ready only once when first loaded
      if (isLoading) {
        handleVideoReady();
      }
    }
  };

  // Handle video tap
  const handleVideoTap = async () => {
    console.log('🎬 [VIMEO-NATIVE] Video tapped - current isPlaying:', isPlaying);
    if (isPlaying) {
      console.log('🎬 [VIMEO-NATIVE] Video tap → PAUSE');
      try {
        await playerRef.current?.pause();
        setIsPlaying(false);
        onPlayStateChange?.(true); // Paused = true
      } catch (error: any) {
        console.error('❌ [VIMEO-NATIVE] Tap pause error:', error);
      }
    } else {
      console.log('🎬 [VIMEO-NATIVE] Video tap → PLAY');
      try {
        await playerRef.current?.play();
        setIsPlaying(true);
        onPlayStateChange?.(false); // Playing = not paused
      } catch (error: any) {
        console.error('❌ [VIMEO-NATIVE] Tap play error:', error);
      }
    }
  };

  return (
    <ThemedView style={[styles.container, { height: playerHeight }]}>
      {/* Native Video Player */}
      <TouchableOpacity 
        style={styles.videoContainer}
        onPress={handleVideoTap}
        activeOpacity={1}
      >
        <NativeVideoPlayer
          ref={playerRef}
          videoId={video.id}
          isFullscreen={isFullscreen}
          playerHeight={playerHeight}
          onReady={handleVideoReady}
          onError={handleVideoError}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          style={styles.video}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#fff" />
            <ThemedText style={styles.loadingText}>Loading video...</ThemedText>
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
