import React, { useCallback, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { vimeoService } from '@/services/vimeoService';

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

  // Build Vimeo URL with autoplay enabled and privacy-friendly params
  const baseParams = params || '';
  const autoplayParams = baseParams.includes('autoplay=0') 
    ? baseParams.replace('autoplay=0', 'autoplay=1')
    : baseParams + '&autoplay=1';
  
  // Add privacy-friendly parameters to reduce 401 errors
  const privacyParams = '&title=0&byline=0&portrait=0&badge=0&autopause=0&dnt=1';
  
  const url = `https://player.vimeo.com/video/${videoId}?${autoplayParams}${privacyParams}`;

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
          'Referer': 'https://naberla.com',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
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
            console.warn('🔒 Video', videoId, 'is private or has domain restrictions');
            // Add to private video list to prevent future attempts
            vimeoService.addToPrivateList(videoId);
            onError?.(`Video ${videoId} access denied (401). This video may be private.`);
          } else if (nativeEvent.statusCode === 403) {
            console.warn('🚫 Video', videoId, 'access forbidden');
            onError?.(`Video ${videoId} access forbidden (403).`);
          } else if (nativeEvent.statusCode === 404) {
            console.warn('❓ Video', videoId, 'not found');
            onError?.(`Video ${videoId} not found (404).`);
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
      {...webViewProps}
      {...otherProps}
    />
  );
});

VimeoWrapper.displayName = 'VimeoWrapper';