import React, { useState, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator, TouchableOpacity, Alert, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SimplifiedVimeoVideo } from '@/types/vimeo';

interface VimeoPlayerProps {
  video: SimplifiedVimeoVideo;
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
  onError?: (error: string) => void;
}

export default function VimeoPlayer({ 
  video, 
  isFullscreen = false, 
  onFullscreenToggle,
  onError 
}: VimeoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Vimeo embed URL oluştur
  const getEmbedUrl = () => {
    // Video ID'yi temizle (sadece sayısal kısım)
    let cleanVideoId = video.id.replace(/\D/g, '');
    
    // Eğer video ID boşsa veya çok kısaysa, test video kullan
    if (!cleanVideoId || cleanVideoId.length < 6) {
      console.warn('Invalid video ID, using test video');
      cleanVideoId = '76979871'; // Vimeo test video
    }
    
    const baseUrl = `https://player.vimeo.com/video/${cleanVideoId}`;
    const params = new URLSearchParams({
      autoplay: '1',
      loop: '0',
      muted: '0',
      controls: '1',
      title: '0',
      byline: '0',
      portrait: '0',
      badge: '0',
      autopause: '0', // Kritik: Background'da otomatik pause'u engelle
      background: '0',
      responsive: '1',
      dnt: '1', // Do not track
      pip: '1', // Picture-in-picture support
      playsinline: '1', // iOS için inline playback
    });
    
    const finalUrl = `${baseUrl}?${params.toString()}`;
    console.log('Vimeo Embed URL:', finalUrl);
    console.log('Original Video ID:', video.id);
    console.log('Clean Video ID:', cleanVideoId);
    console.log('Video Title:', video.title);
    
    return finalUrl;
  };

  // WebView mesajlarını handle et
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Vimeo Player Message:', data);
      
      // Player events'leri handle edebiliriz
      switch (data.event) {
        case 'ready':
          console.log('Vimeo player ready');
          break;
        case 'play':
          console.log('Video started playing');
          break;
        case 'pause':
          console.log('Video paused');
          break;
        case 'ended':
          console.log('Video ended');
          break;
      }
    } catch (error) {
      console.log('Message parsing error:', error);
    }
  };

  // Loading başladı
  const handleLoadStart = () => {
    console.log('WebView loading started');
    setIsLoading(true);
    setHasError(false);
  };

  // Loading tamamlandı
  const handleLoadEnd = () => {
    console.log('WebView loading ended');
    setIsLoading(false);
    setHasError(false);
  };

  // Hata durumu
  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView Error:', nativeEvent);
    console.error('Error description:', nativeEvent.description);
    console.error('Error code:', nativeEvent.code);
    setIsLoading(false);
    setHasError(true);
    onError?.(`Video yüklenemedi: ${nativeEvent.description || 'Bilinmeyen hata'}`);
  };

  // HTTP error handling
  const handleHttpError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView HTTP Error:', nativeEvent);
    console.error('Status code:', nativeEvent.statusCode);
    console.error('URL:', nativeEvent.url);
    
    if (nativeEvent.statusCode >= 400) {
      setIsLoading(false);
      setHasError(true);
      const errorMsg = nativeEvent.statusCode === 404 
        ? `Video bulunamadı veya embed edilmeye kapalı (ID: ${video.id})`
        : `HTTP Error ${nativeEvent.statusCode}: Video yüklenemedi`;
      onError?.(errorMsg);
    }
  };

  // Retry fonksiyonu
  const retry = () => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  // Hata durumu UI
  if (hasError) {
    return (
      <ThemedView style={[styles.container, isFullscreen && styles.fullscreenContainer]}>
        <ThemedView style={styles.errorContainer}>
          <IconSymbol name="exclamationmark.triangle" size={48} color="#FF6B6B" />
          <ThemedText style={styles.errorTitle}>Video Yüklenemedi</ThemedText>
          <ThemedText style={styles.errorText}>
            {video.title}
          </ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={retry}>
            <IconSymbol name="arrow.clockwise" size={20} color="white" />
            <ThemedText style={styles.retryText}>Tekrar Dene</ThemedText>
          </TouchableOpacity>
        </ThemedView>
        
        {/* Fullscreen Toggle */}
        {onFullscreenToggle && (
          <TouchableOpacity 
            style={styles.fullscreenButton}
            onPress={onFullscreenToggle}
          >
            <IconSymbol 
              name={isFullscreen ? "arrow.down.right.and.arrow.up.left" : "arrow.up.left.and.arrow.down.right"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, isFullscreen && styles.fullscreenContainer]}>
      {/* Loading Indicator */}
      {isLoading && (
        <ThemedView style={styles.loadingContainer}>
          <Image 
            source={require('@/assets/images/loading.gif')} 
            style={styles.loadingGif}
            resizeMode="contain"
          />
        </ThemedView>
      )}

      {/* Vimeo WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: getEmbedUrl() }}
        style={styles.webview}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onHttpError={handleHttpError}
        onMessage={handleMessage}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={true}
        bounces={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        // Background audio için kritik ayarlar
        allowsBackForwardNavigationGestures={false}
        allowsLinkPreview={false}
        mixedContentMode="compatibility"
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        // iOS WebView background audio
        allowsAirPlayForMediaPlayback={true}
        // Timeout ayarları
        cacheEnabled={true}
        incognito={false}
        // User agent (bazı durumlarda gerekli olabilir)
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
        // Vimeo player için gerekli injected JavaScript
        injectedJavaScript={`
          console.log('WebView JavaScript loaded for background audio');
          console.log('Current URL:', window.location.href);
          
          // Background audio için kritik ayarlar
          try {
            // Audio context'i unlock et ve background'da aktif tut
            let audioContext;
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
              const AudioContextClass = AudioContext || webkitAudioContext;
              audioContext = new AudioContextClass();
              
              // Touch event ile audio context'i başlat
              document.addEventListener('touchstart', function() {
                if (audioContext.state === 'suspended') {
                  audioContext.resume();
                  console.log('AudioContext resumed');
                }
              }, { once: true });
              
              // Visibility change'de audio context'i koru
              document.addEventListener('visibilitychange', function() {
                if (document.hidden) {
                  console.log('Page hidden - keeping audio context active');
                  if (audioContext && audioContext.state === 'suspended') {
                    audioContext.resume();
                  }
                } else {
                  console.log('Page visible');
                }
              });
            }
            
            // Media session API (background controls ve metadata için)
            if ('mediaSession' in navigator) {
              navigator.mediaSession.metadata = new MediaMetadata({
                title: 'Naber LA Music',
                artist: 'Vimeo Player',
                album: 'Music Collection',
                artwork: []
              });
              
              // Background playback controls
              navigator.mediaSession.setActionHandler('play', function() {
                console.log('Media session play');
                const videos = document.querySelectorAll('video');
                if (videos.length > 0) {
                  videos[0].play();
                }
              });
              
              navigator.mediaSession.setActionHandler('pause', function() {
                console.log('Media session pause');
                const videos = document.querySelectorAll('video');
                if (videos.length > 0) {
                  videos[0].pause();
                }
              });
            }
            
            // Video elementlerini background'da aktif tut
            const keepVideoActive = function() {
              const videos = document.querySelectorAll('video');
              videos.forEach(function(video) {
                // Background'da video'nun pause olmamasını sağla
                video.addEventListener('pause', function(e) {
                  if (document.hidden) {
                    console.log('Preventing pause in background');
                    setTimeout(function() {
                      if (document.hidden && video.paused) {
                        video.play().catch(function(err) {
                          console.log('Background play error:', err);
                        });
                      }
                    }, 100);
                  }
                });
                
                // Video metadata'sını media session'a aktar
                video.addEventListener('loadedmetadata', function() {
                  if ('mediaSession' in navigator && navigator.mediaSession.metadata) {
                    navigator.mediaSession.metadata.title = document.title || 'Naber LA Music';
                  }
                });
              });
            };
            
            // DOM ready olduğunda video'ları kontrol et
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', keepVideoActive);
            } else {
              keepVideoActive();
            }
            
            // Yeni video elementleri için observer
            const observer = new MutationObserver(function(mutations) {
              mutations.forEach(function(mutation) {
                if (mutation.addedNodes) {
                  mutation.addedNodes.forEach(function(node) {
                    if (node.tagName === 'VIDEO') {
                      keepVideoActive();
                    }
                  });
                }
              });
            });
            
            observer.observe(document.body, {
              childList: true,
              subtree: true
            });
            
          } catch (error) {
            console.log('Background audio setup error:', error);
          }
          
          // Vimeo Player API mesajlarını yakalamak için
          if (window.addEventListener) {
            window.addEventListener('message', function(event) {
              if (event.origin === 'https://player.vimeo.com') {
                console.log('Vimeo message:', event.data);
                window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
              }
            });
          }
          
          // Page load durumunu kontrol et
          if (document.readyState === 'complete') {
            console.log('Document ready for background audio');
            window.ReactNativeWebView.postMessage(JSON.stringify({event: 'page_ready'}));
          } else {
            window.addEventListener('load', function() {
              console.log('Window loaded with background audio support');
              window.ReactNativeWebView.postMessage(JSON.stringify({event: 'page_loaded'}));
            });
          }
          
          true;
        `}
      />

      {/* Fullscreen toggle kaldırıldı - pil kısmıyla çakışıyor */}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Tutarlı siyah
    position: 'relative',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000', // Tutarlı siyah
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000', // Tutarlı siyah
    zIndex: 10,
  },
  loadingGif: {
    width: 60,
    height: 60,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 15,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1AB7EA',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
