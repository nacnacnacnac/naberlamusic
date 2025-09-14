import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, AppState, TouchableOpacity } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
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

  // Hide navigation bar globally on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Force hide navigation bar with delay for simulator
      const hideNavBar = async () => {
        try {
          // Set to pure black first
          await NavigationBar.setBackgroundColorAsync('#000000');
          // Make it transparent
          await NavigationBar.setBackgroundColorAsync('transparent');
          // Hide it completely
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('overlay-swipe');
          console.log('🔧 Navigation bar hidden and transparent');
        } catch (error) {
          console.log('⚠️ Navigation bar error:', error);
        }
      };
      
      // Immediate hide
      hideNavBar();
      
      // Delayed hide for simulator
      setTimeout(hideNavBar, 1000);
      setTimeout(hideNavBar, 3000);
    }
  }, []);

  // Initialize background audio session (native platforms only)
  const { isConfigured, error } = useBackgroundAudio();

  // Maintain audio session on app state changes
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Reinforce background audio when app goes to background
        try {
          const { Audio } = require('expo-av');
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            interruptionModeIOS: 2, // DoNotMix
            shouldDuckAndroid: false,
            allowsRecordingIOS: false,
          });
          console.log('🔊 [LAYOUT] Background audio reinforced on app state change:', nextAppState);
        } catch (error) {
          console.warn('⚠️ [LAYOUT] Failed to reinforce background audio:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

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
              <Stack.Screen 
                name="create-playlist" 
                options={{ 
                  headerShown: Platform.OS === 'android',
                  title: 'Create Playlist',
                  headerStyle: { backgroundColor: '#000000' },
                  headerTintColor: '#ffffff',
                  headerTitleStyle: { color: '#ffffff' }
                }} 
              />
              <Stack.Screen 
                name="select-playlist" 
                options={{ 
                  headerShown: Platform.OS === 'android',
                  title: 'Select Playlist',
                  headerStyle: { backgroundColor: '#000000' },
                  headerTintColor: '#ffffff',
                  headerTitleStyle: { color: '#ffffff' }
                }} 
              />
              <Stack.Screen 
                name="videos" 
                options={{ 
                  headerShown: Platform.OS === 'android',
                  title: 'Videos',
                  headerStyle: { backgroundColor: '#000000' },
                  headerTintColor: '#ffffff',
                  headerTitleStyle: { color: '#ffffff' },
                  presentation: 'modal',
                  animation: 'slide_from_right'
                }} 
              />
              <Stack.Screen 
                name="profile" 
                options={{ 
                  headerShown: Platform.OS === 'android',
                  title: 'Profile',
                  headerStyle: { backgroundColor: '#000000' },
                  headerTintColor: '#ffffff',
                  headerTitleStyle: { color: '#ffffff' },
                  presentation: 'modal',
                  animation: 'slide_from_bottom'
                }} 
              />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} hideTransitionAnimation="fade" />
          </ThemeProvider>
        </VimeoProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
