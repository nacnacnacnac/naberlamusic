import React from 'react';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import VimeoSetup from '@/components/VimeoSetup';
import { VimeoConfig } from '@/types/vimeo';
import { vimeoService } from '@/services/vimeoService';

export default function VimeoSetupScreen() {
  const handleSetupComplete = async (config: VimeoConfig) => {
    try {
      console.log('Vimeo setup completed:', config);
      
      // Initialize Vimeo service
      await vimeoService.initialize(config);
      
      // Show success message and navigate
      Alert.alert(
        'Kurulum Tamamlandı!',
        'Vimeo entegrasyonu başarıyla kuruldu. Artık videolarınıza erişebilirsiniz.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              console.log('Navigating to main app...');
              // Navigate back to main app
              setTimeout(() => {
                router.replace('/(tabs)');
              }, 100);
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('Setup completion error:', error);
      Alert.alert(
        'Hata',
        'Kurulum tamamlanırken bir hata oluştu. Lütfen tekrar deneyin.',
        [
          {
            text: 'Tamam',
          },
        ]
      );
    }
  };

  const handleSkip = () => {
    console.log('Vimeo setup skipped');
    Alert.alert(
      'Kurulum Atlandı',
      'Vimeo entegrasyonu olmadan devam ediyorsunuz. Daha sonra ayarlardan kurabilirsiniz.',
      [
        {
          text: 'Tamam',
          onPress: () => {
            console.log('Skipping setup, navigating to main app...');
            // Navigate back to main app
            setTimeout(() => {
              router.replace('/(tabs)');
            }, 100);
          },
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <VimeoSetup 
      onSetupComplete={handleSetupComplete}
      onSkip={handleSkip}
    />
  );
}
