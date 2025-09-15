import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, AppState, TouchableOpacity } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
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

  // Web için Google Font import ve Google Analytics
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Google Analytics (gtag.js) ekle
      const gtagScript = document.createElement('script');
      gtagScript.async = true;
      gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-PDK56CL49Y';
      document.head.appendChild(gtagScript);

      const gtagConfig = document.createElement('script');
      gtagConfig.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-PDK56CL49Y');
      `;
      document.head.appendChild(gtagConfig);
      console.log('✅ Google Analytics (gtag.js) loaded');

      // Funnel Display fontunu import et
      const funnelLink = document.createElement('link');
      funnelLink.href = 'https://fonts.googleapis.com/css2?family=Funnel+Display:wght@300;400;500;600;700;800&display=swap';
      funnelLink.rel = 'stylesheet';
      funnelLink.onload = () => console.log('✅ Funnel Display font loaded');
      document.head.appendChild(funnelLink);
      
      
      // Global CSS style ekle
      const style = document.createElement('style');
      style.textContent = `
        * {
          font-family: 'Funnel Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        
        body, html {
          font-family: 'Funnel Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        
        /* React Native Text elementleri için */
        [data-testid*="text"], 
        .css-text,
        span, p, h1, h2, h3, h4, h5, h6,
        input, textarea, button {
          font-family: 'Funnel Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        
      `;
      document.head.appendChild(style);
    }
  }, []);

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
            <Stack
              screenOptions={{
                headerShown: false, // Tüm header'ları gizle
                headerStyle: { backgroundColor: '#000000' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { color: '#ffffff' },
                contentStyle: { backgroundColor: '#000000' }, // Tüm sayfalar siyah background
                animation: 'fade'
              }}
            >
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen 
                name="create-playlist" 
                options={{ 
                  headerShown: false,
                  presentation: 'modal',
                  animation: Platform.OS === 'web' ? 'slide_from_right' : 'slide_from_bottom',
                  gestureEnabled: true,
                  gestureDirection: Platform.OS === 'web' ? 'horizontal' : 'vertical',
                  contentStyle: { 
                    backgroundColor: '#000000',
                    width: Platform.OS === 'web' ? 400 : undefined,
                    maxWidth: Platform.OS === 'web' ? 400 : undefined
                  }
                }} 
              />
              <Stack.Screen 
                name="select-playlist" 
                options={{ 
                  headerShown: false,
                  presentation: 'modal',
                  animation: Platform.OS === 'web' ? 'slide_from_right' : 'slide_from_bottom',
                  gestureEnabled: true,
                  gestureDirection: Platform.OS === 'web' ? 'horizontal' : 'vertical',
                  contentStyle: { 
                    backgroundColor: '#000000',
                    width: Platform.OS === 'web' ? 400 : undefined,
                    maxWidth: Platform.OS === 'web' ? 400 : undefined
                  }
                }} 
              />
              <Stack.Screen 
                name="videos" 
                options={{ 
                  headerShown: false,
                  presentation: Platform.OS === 'web' ? 'modal' : 'modal',
                  animation: Platform.OS === 'web' ? 'slide_from_right' : 'slide_from_bottom',
                  gestureEnabled: true,
                  gestureDirection: Platform.OS === 'web' ? 'horizontal' : 'vertical',
                  contentStyle: { 
                    backgroundColor: '#000000',
                    width: Platform.OS === 'web' ? 400 : undefined,
                    maxWidth: Platform.OS === 'web' ? 400 : undefined
                  }
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
              <Stack.Screen 
                name="+not-found" 
                options={{ 
                  headerShown: Platform.OS !== 'web', // Web'de header gizle
                  title: 'Not Found',
                  headerStyle: { backgroundColor: '#000000' },
                  headerTintColor: '#ffffff',
                  headerTitleStyle: { color: '#ffffff' }
                }} 
              />
            </Stack>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} hideTransitionAnimation="fade" />
          </ThemeProvider>
        </VimeoProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
