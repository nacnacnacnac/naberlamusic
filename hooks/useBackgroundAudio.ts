import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Safely import expo-av with error handling
// Note: expo-av is deprecated in SDK 54, will migrate to expo-audio/expo-video
let Audio: any = null;
try {
  Audio = require('expo-av').Audio;
} catch (error) {
  console.warn('expo-av not available:', error);
}

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
    let isMounted = true;

    const configureAudioSession = async () => {
      try {
        // Only configure on native platforms
        if (Platform.OS === 'web' || !Audio) {
          if (isMounted) {
            setState({ isConfigured: true, error: null });
          }
          return;
        }

        // Check if Audio constants are available
        if (!Audio.InterruptionModeIOS && !Audio.INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS) {
          console.warn('[BackgroundAudio] Audio constants not available, skipping configuration');
          if (isMounted) {
            setState({ isConfigured: true, error: null });
          }
          return;
        }

        // Configure audio session for background playback with aggressive settings
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: Audio.InterruptionModeIOS?.DoNotMix || 2,
          shouldDuckAndroid: false,
          allowsRecordingIOS: false,
          interruptionModeAndroid: Audio.InterruptionModeAndroid?.DoNotMix || 1,
        });

        // Additional iOS-specific background audio configuration
        if (Platform.OS === 'ios') {
          try {
            // Set audio category to playback for background audio
            if (Audio.setAudioModeAsync) {
              await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                interruptionModeIOS: 2, // DoNotMix
                shouldDuckAndroid: false,
                allowsRecordingIOS: false,
              });
            }
          } catch (iosError) {
            console.warn('[BackgroundAudio] iOS-specific configuration failed:', iosError);
          }
        }

        if (__DEV__) {
          console.log('[BackgroundAudio] Audio session configured successfully');
        }

        // Enable background audio playback for iOS
        if (Platform.OS === 'ios' && Audio.setIsEnabledAsync) {
          await Audio.setIsEnabledAsync(true);
        }

        if (isMounted) {
          setState({ isConfigured: true, error: null });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown audio session error';
        
        if (__DEV__) {
          console.error('[BackgroundAudio] Failed to configure audio session:', errorMessage);
        }

        if (isMounted) {
          setState({ isConfigured: false, error: errorMessage });
        }
      }
    };

    configureAudioSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
};
