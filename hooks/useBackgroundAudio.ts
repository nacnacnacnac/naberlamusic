import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Migrated from expo-av to expo-video for SDK 54+
// Audio functionality now handled by expo-video player

interface BackgroundAudioState {
  isConfigured: boolean;
  error: string | null;
}

export const useBackgroundAudio = (): BackgroundAudioState => {
  const [state, setState] = useState<BackgroundAudioState>({
    isConfigured: false,
    error: null,
  });

  useEffect(() => {
    // SDK 54: expo-video handles background audio automatically
    // No manual audio session configuration needed
    setState({ isConfigured: true, error: null });
    
    if (__DEV__) {
      console.log('[BackgroundAudio] SDK 54: Background audio handled by expo-video');
    }
  }, []);

  return state;
};
