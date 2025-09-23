import { useEffect } from 'react';
import { Platform } from 'react-native';

// Migrated from expo-av to expo-video for SDK 54+
// Media session now handled by expo-video player

interface MediaSessionInfo {
  title: string;
  artist?: string;
  duration?: number;
  currentTime?: number;
}

export const useMediaSession = (mediaInfo: MediaSessionInfo | null) => {
  useEffect(() => {
    if (!mediaInfo) {
      return;
    }

    // SDK 54: expo-video handles media session automatically
    if (__DEV__) {
      console.log('🎵 [MEDIA-SESSION] SDK 54: Media session handled by expo-video for:', mediaInfo.title);
    }
  }, [mediaInfo?.title, mediaInfo?.artist]);

  // Function to update media session when playback state changes
  const updatePlaybackState = async (isPlaying: boolean) => {
    // SDK 54: expo-video handles playback state automatically
    if (__DEV__) {
      console.log('🎵 [MEDIA-SESSION] SDK 54: Playback state handled by expo-video:', isPlaying ? 'playing' : 'paused');
    }
  };

  return { updatePlaybackState };
};