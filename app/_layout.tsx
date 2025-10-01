import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/AuthContext';
import { VimeoProvider } from '@/contexts/VimeoContext';
import { useBackgroundAudio } from '@/hooks/useBackgroundAudio';
import { useColorScheme } from '@/hooks/useColorScheme';
// Background audio handled by expo-video SDK 54

// Set system UI background color outside of component (as per Expo docs)
SystemUI.setBackgroundColorAsync("#000000");

// Background audio handled by expo-video SDK 54

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (loaded) {
      // Hide splash immediately (no delay)
      SplashScreen.hideAsync();
    }
  }, [loaded]);

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

      // Playlist delete button styles ekle
      const playlistStyles = document.createElement('style');
      playlistStyles.innerHTML = `
        .playlist-delete-button:hover {
          background-color: #1a1a1a !important;
        }
      `;
      document.head.appendChild(playlistStyles);

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
          background-color: #000000 !important;
          margin: 0;
          padding: 0;
        }
        
        /* React Native Text elementleri için */
        [data-testid*="text"], 
        .css-text,
        span, p, h1, h2, h3, h4, h5, h6,
        input, textarea, button {
          font-family: 'Funnel Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        
        /* Root container */
        #root, #__next, 
        .expo-web-container,
        .css-view-175oi2r,
        [data-reactroot] {
          background-color: #000000 !important;
          min-height: 100vh;
        }
        
        /* Expo Web specific containers */
        .css-view-175oi2r {
          background-color: #000000 !important;
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
          // console.log('🔧 Navigation bar hidden and transparent'); // Debug log kaldırıldı
        } catch (error) {
          // console.log('⚠️ Navigation bar error:', error); // Debug log kaldırıldı
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
      console.log('🔊 App state changed to:', nextAppState);
      
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Background audio için iOS ayarları
        try {
          // expo-video için background audio mode
          console.log('🔊 Enabling background audio mode');
          
          // iOS için background audio session
          if (Platform.OS === 'ios') {
            // expo-video otomatik handle ediyor ama force edebiliriz
            console.log('🔊 iOS background audio should continue via expo-video');
          }
        } catch (error) {
          console.error('🔊 Background audio setup error:', error);
        }
      } else if (nextAppState === 'active') {
        console.log('🔊 App became active - audio should continue');
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
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
      <AuthProvider>
        <VimeoProvider>
          <ThemeProvider value={{
            ...DarkTheme,
            colors: {
              ...DarkTheme.colors,
              background: '#000000',
              card: '#000000',
              primary: '#ffffff'
            }
          }}>
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
