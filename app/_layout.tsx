import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';

import { AuthProvider } from '@/contexts/AuthContext';
import { VimeoProvider } from '@/contexts/VimeoContext';
import { useColorScheme } from '@/hooks/useColorScheme';

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

  if (!loaded) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
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
                headerShown: false,
                headerStyle: { backgroundColor: '#000000' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { color: '#ffffff' },
                contentStyle: { backgroundColor: '#000000' },
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
                  animation: 'slide_from_right',
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                  contentStyle: { 
                    backgroundColor: '#000000',
                    width: 400,
                    maxWidth: 400
                  }
                }} 
              />
              <Stack.Screen 
                name="select-playlist" 
                options={{ 
                  headerShown: false,
                  presentation: 'modal',
                  animation: 'slide_from_right',
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                  contentStyle: { 
                    backgroundColor: '#000000',
                    width: 400,
                    maxWidth: 400
                  }
                }} 
              />
              <Stack.Screen 
                name="videos" 
                options={{ 
                  headerShown: false,
                  presentation: 'modal',
                  animation: 'slide_from_right',
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                  contentStyle: { 
                    backgroundColor: '#000000',
                    width: 400,
                    maxWidth: 400
                  }
                }} 
              />
              <Stack.Screen 
                name="profile" 
                options={{ 
                  headerShown: false,
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
                  headerShown: false,
                  title: 'Not Found',
                  headerStyle: { backgroundColor: '#000000' },
                  headerTintColor: '#ffffff',
                  headerTitleStyle: { color: '#ffffff' }
                }} 
              />
            </Stack>
            <StatusBar style="light" hideTransitionAnimation="fade" />
          </ThemeProvider>
        </VimeoProvider>
      </AuthProvider>
    </View>
  );
}