import React, { useCallback, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { hybridVimeoService } from '@/services/hybridVimeoService';

// Simple Vimeo wrapper - back to basics
export interface VimeoWrapperRef {
  play(): Promise<void>;
  pause(): Promise<void>;
  getCurrentTime(): Promise<number>;
  getDuration(): Promise<number>;
  setCurrentTime(seconds: number): Promise<void>;
  getWebViewRef(): React.RefObject<WebView>;
  destroy(): Promise<void>;
}

export interface VimeoWrapperProps {
  videoId: string;
  params?: string;
  reference?: string;
  isFullscreen?: boolean;
  playerHeight?: number;
  onMessage?: (event: any) => void;
  onReady?: () => void;
  onError?: (error: string) => void;
  style?: any;
  webViewProps?: any;
}

export const VimeoWrapper = forwardRef<VimeoWrapperRef, VimeoWrapperProps>(({
  videoId,
  params,
  reference,
  isFullscreen = false,
  playerHeight = 300,
  onMessage,
  onReady,
  onError,
  style,
  webViewProps,
  ...otherProps
}, ref) => {
  const webViewRef = useRef<WebView>(null);

  // Guard against invalid videoId
  if (!videoId || typeof videoId !== 'string' || videoId.trim().length === 0) {
    console.error('VimeoWrapper: Invalid videoId provided:', videoId);
    return null;
  }

  // Build Vimeo URL with enhanced access parameters
  const baseParams = params || '';
  const autoplayParams = baseParams.includes('autoplay=0') 
    ? baseParams.replace('autoplay=0', 'autoplay=1')
    : baseParams + '&autoplay=1';
  
  // 🎯 PREMIUM PARAMS: Clean premium parameters (avoid duplicates)
  const premiumParams = [
    'badge=0',              // Hide Vimeo badge (Premium)
    'player_id=naberla-mobile', // Custom player ID
    'referrer=naberla.org', // Domain referrer
    'quality=auto'          // Auto quality
  ].join('&');
  
  const url = `https://player.vimeo.com/video/${videoId}?${autoplayParams}&${premiumParams}`;

  console.log('🎬 VimeoWrapper (SIMPLE MODE) rendering with:', { videoId, url, autoplayParams });

  // Simple command execution with basic video control
  const executeCommand = useCallback((action: string, args: any[] = []): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!webViewRef.current) {
        reject(new Error('WebView not ready'));
        return;
      }

      console.log(`🎬 SIMPLE COMMAND: ${action} - Basic video control`);
      
      if (action === 'play') {
        const script = `
          (function() {
            console.log('🎵 Simple play - finding video element...');
            var videos = document.querySelectorAll('video');
            if (videos.length > 0) {
              var video = videos[0];
              video.play().then(function() {
                console.log('✅ Simple play SUCCESS');
              }).catch(function(e) {
                console.log('❌ Simple play failed:', e.message);
              });
            } else {
              console.log('⚠️ No video found for simple play');
            }
            return true;
          })();
        `;
        webViewRef.current.injectJavaScript(script);
        resolve('simple_play_sent');
        
      } else if (action === 'pause') {
        const script = `
          (function() {
            console.log('🎵 Simple pause - finding video element...');
            var videos = document.querySelectorAll('video');
            if (videos.length > 0) {
              var video = videos[0];
              video.pause();
              console.log('✅ Simple pause SUCCESS');
            } else {
              console.log('⚠️ No video found for simple pause');
            }
            return true;
          })();
        `;
        webViewRef.current.injectJavaScript(script);
        resolve('simple_pause_sent');
        
      } else if (action === 'getCurrentTime') {
        console.log('🎵 GetCurrentTime - Returning 0 (simple mode)');
        resolve(0);
      } else {
        resolve('simple_command_not_supported');
      }
    });
  }, []);

  useImperativeHandle(ref, () => ({
    play: () => executeCommand('play'),
    pause: () => executeCommand('pause'),
    getCurrentTime: () => executeCommand('getCurrentTime'),
    getDuration: () => Promise.resolve(0), // Not supported in simple mode
    setCurrentTime: (seconds: number) => executeCommand('setCurrentTime', [seconds]),
    getWebViewRef: () => webViewRef,
    destroy: destroyPlayer
  }), [executeCommand]);

  // Handle messages from WebView
  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📱 WebView message received:', data);
      
      // Forward all events to parent
      onMessage?.(event);
      
    } catch (error) {
      console.error('Failed to parse WebView message:', error);
    }
  }, [onMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 VimeoWrapper cleanup completed');
    };
  }, []);

  // Destroy method for safe cleanup
  const destroyPlayer = useCallback(async (): Promise<void> => {
    try {
      console.log('🧹 Destroying Vimeo player (simple mode)');
      // No complex cleanup needed in simple mode
    } catch (error) {
      console.error('Error destroying player:', error);
    }
  }, []);

  return (
    <WebView
      ref={webViewRef}
      allowsFullscreenVideo={isFullscreen}
      allowsInlineMediaPlayback={true}
      mixedContentMode="compatibility"
      cacheEnabled={true}
      source={{ 
        uri: url, 
        headers: { 
          'Referer': 'https://naberla.org/',
          'Origin': 'https://naberla.org',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'X-Requested-With': 'naberla-app',
          'X-Vimeo-Client': 'naberla-premium',
          'X-Player-ID': 'naberla-mobile'
        } 
      }}
      javaScriptEnabled={true}
      mediaPlaybackRequiresUserAction={false}
      allowsAirPlayForMediaPlayback={true}
      allowsLinkPreview={false}
      allowsBackForwardNavigationGestures={false}
      onMessage={handleMessage}
      onLoad={() => console.log('📱 WebView loaded successfully')}
      onLoadStart={() => console.log('📱 WebView load started')}
      onError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('❌ WebView ERROR:', nativeEvent);
        onError?.(nativeEvent.description || 'WebView error');
      }}
      onHttpError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        
        // Only log once per video to prevent spam
        const errorKey = `http_error_${videoId}_${nativeEvent.statusCode}`;
        if (!global.loggedErrors) global.loggedErrors = new Set();
        
        if (!global.loggedErrors.has(errorKey)) {
          global.loggedErrors.add(errorKey);
          console.error('❌ WebView HTTP ERROR:', nativeEvent.statusCode, 'for video:', videoId);
          
          if (nativeEvent.statusCode === 401) {
            console.warn('🔒 Video', videoId, 'access denied (401) - Premium features insufficient');
            console.log('💡 This video may have special restrictions beyond Premium access');
            
            // Add to private video list and log for monitoring
            hybridVimeoService.logAccessDeniedError(videoId, `401 Unauthorized - Premium bypass failed`);
            
            onError?.(`Video ${videoId} access denied. This video has special access restrictions.`);
          } else if (nativeEvent.statusCode === 403) {
            console.warn('🚫 Video', videoId, 'access forbidden (403) - Insufficient permissions');
            hybridVimeoService.logAccessDeniedError?.(videoId, `403 Forbidden - Insufficient permissions`);
            onError?.(`Video ${videoId} access forbidden. Check video permissions in Vimeo.`);
          } else if (nativeEvent.statusCode === 404) {
            console.warn('❓ Video', videoId, 'not found (404) - Video may be deleted');
            onError?.(`Video ${videoId} not found. This video may have been deleted.`);
          }
        }
      }}
      onLoadEnd={() => {
        console.log('📱 WebView load ended - Simple mode, no complex initialization');
        
        // Inject timeupdate listener after load
        const timeUpdateScript = `
          (function() {
            console.log('🎬 Injecting AGGRESSIVE timeupdate listener');
            
            // Multiple approaches to catch Vimeo events
            if (window.addEventListener) {
              // Method 1: Standard message listener
              window.addEventListener('message', function(event) {
                if (event.origin !== 'https://player.vimeo.com') return;
                
                const data = event.data;
                console.log('🎬 Vimeo message received:', data);
                
                if (data && data.event === 'timeupdate') {
                  console.log('🎬 TIMEUPDATE EVENT:', data.data);
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    name: 'timeupdate',
                    data: {
                      currentTime: data.data.seconds,
                      duration: data.data.duration
                    }
                  }));
                } else if (data && data.event === 'ended') {
                  console.log('🎬 ENDED EVENT');
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    name: 'ended',
                    data: {}
                  }));
                }
              });
              
              // Method 2: Try to access iframe directly
              setTimeout(function() {
                const iframe = document.querySelector('iframe');
                if (iframe) {
                  console.log('🎬 Found iframe, trying direct access');
                  // This might not work due to CORS, but worth trying
                }
              }, 2000);
            }
            
            console.log('✅ AGGRESSIVE timeupdate listener injected');
          })();
        `;
        
        webViewRef.current?.injectJavaScript(timeUpdateScript);
        onReady?.();
      }}
      style={[
        {
          flex: 1,
          backgroundColor: '#000000',
          height: playerHeight,
        },
        isFullscreen && { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
        style
      ]}
      // Suppress about:srcdoc warnings
      onShouldStartLoadWithRequest={(request) => {
        // Allow about:srcdoc URLs (used by Vimeo player internally)
        if (request.url.startsWith('about:srcdoc')) {
          return true;
        }
        return request.url.startsWith('https://player.vimeo.com') || 
               request.url.startsWith('https://vimeo.com');
      }}
      onError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        // Suppress about:srcdoc errors
        if (nativeEvent.description?.includes('about:srcdoc')) {
          return;
        }
        
        // Handle 401 errors for private videos
        if (nativeEvent.description?.includes('401') || nativeEvent.code === 401) {
          console.warn(`🔒 Video ${videoId} access denied (401). This video may be private.`);
          // Auto-add to private list
          // Log load error
          hybridVimeoService.logAccessDeniedError?.(videoId, `Load error - ${error}`);
        }
        
        onError?.(nativeEvent.description || 'WebView error');
      }}
      {...webViewProps}
      {...otherProps}
    />
  );
});

VimeoWrapper.displayName = 'VimeoWrapper';