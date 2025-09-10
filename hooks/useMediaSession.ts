import { useEffect } from 'react';
import { Platform } from 'react-native';

// Safely import expo-av with error handling
let Audio: any = null;
try {
  Audio = require('expo-av').Audio;
} catch (error) {
  console.warn('expo-av not available for media session:', error);
}

interface MediaSessionInfo {
  title: string;
  artist?: string;
  duration?: number;
  currentTime?: number;
}

export const useMediaSession = (mediaInfo: MediaSessionInfo | null) => {
  useEffect(() => {
    if (!mediaInfo || Platform.OS !== 'ios' || !Audio) {
      return;
    }

    const setupMediaSession = async () => {
      try {
        // Set up media session for iOS Control Center
        if (Audio.setAudioModeAsync) {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            interruptionModeIOS: 2, // DoNotMix
            shouldDuckAndroid: false,
            allowsRecordingIOS: false,
          });
        }

        console.log('🎵 [MEDIA-SESSION] Media session configured for:', mediaInfo.title);
      } catch (error) {
        console.error('❌ [MEDIA-SESSION] Failed to setup media session:', error);
      }
    };

    setupMediaSession();
  }, [mediaInfo?.title, mediaInfo?.artist]);

  // Function to update media session when playback state changes
  const updatePlaybackState = async (isPlaying: boolean) => {
    if (Platform.OS !== 'ios' || !Audio) {
      return;
    }

    try {
      // Reinforce audio session on playback state change
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: 2, // DoNotMix
        shouldDuckAndroid: false,
        allowsRecordingIOS: false,
      });

      console.log('🎵 [MEDIA-SESSION] Playback state updated:', isPlaying ? 'playing' : 'paused');
    } catch (error) {
      console.error('❌ [MEDIA-SESSION] Failed to update playback state:', error);
    }
  };

  return { updatePlaybackState };
};
