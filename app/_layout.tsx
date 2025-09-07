import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { VimeoProvider } from '@/contexts/VimeoContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { useBackgroundAudio } from '@/hooks/useBackgroundAudio';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Initialize background audio session (native platforms only)
  const { isConfigured, error } = useBackgroundAudio();

  if (__DEV__ && Platform.OS !== 'web') {
    if (error) {
      console.warn('[RootLayout] Background audio setup failed:', error);
    } else if (isConfigured) {
      console.log('[RootLayout] Background audio configured successfully');
    }
  }

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <VimeoProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="create-playlist" options={{ headerShown: false }} />
              <Stack.Screen name="select-playlist" options={{ headerShown: false }} />
              <Stack.Screen 
                name="videos" 
                options={{ 
                  headerShown: false,
                  presentation: 'modal',
                  animation: 'slide_from_right'
                }} 
              />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="light" hideTransitionAnimation="fade" />
          </ThemeProvider>
        </VimeoProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
