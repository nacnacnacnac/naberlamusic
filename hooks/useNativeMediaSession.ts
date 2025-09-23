import { useEffect } from 'react';
import { Platform, NativeModules, NativeEventEmitter } from 'react-native';

// iOS Media Session için direct API
declare global {
  interface Window {
    MediaMetadata: any;
    navigator: any;
  }
}

interface MediaMetadata {
  title: string;
  artist: string;
  album?: string;
  albumTitle?: string;
  artwork?: string;
  artworkUri?: string;
  artworkUrl?: string;
  duration?: number;
  elapsedTime?: number;
  playbackRate?: number;
}

export const useNativeMediaSession = () => {
  const setMediaMetadata = (metadata: MediaMetadata) => {
    if (Platform.OS !== 'ios') return;
    
    console.log('🎵 🔧 Setting iOS media session metadata:', {
      title: metadata.title,
      artist: metadata.artist,
      artwork: metadata.artwork ? 'YES' : 'NO',
      artworkUrl: metadata.artwork ? metadata.artwork.substring(0, 50) + '...' : 'NONE'
    });
    
    try {
      let metadataSet = false;
      
      // Yöntem 1: iOS MPNowPlayingInfoCenter için doğrudan çağrı (En güvenilir)
      if (NativeModules.MPNowPlayingInfoCenter) {
        const nowPlayingInfo = {
          MPMediaItemPropertyTitle: metadata.title,
          MPMediaItemPropertyArtist: metadata.artist,
          MPMediaItemPropertyAlbumTitle: metadata.albumTitle || metadata.album || 'Naber LA Collection',
          ...(metadata.artwork && { 
            MPMediaItemPropertyArtwork: metadata.artwork,
            MPMediaItemPropertyArtworkURL: metadata.artwork
          }),
          MPMediaItemPropertyPlaybackDuration: metadata.duration || 180,
          MPNowPlayingInfoPropertyElapsedPlaybackTime: metadata.elapsedTime || 0,
          MPNowPlayingInfoPropertyPlaybackRate: metadata.playbackRate || 1.0
        };
        NativeModules.MPNowPlayingInfoCenter.setNowPlayingInfo(nowPlayingInfo);
        console.log('🎵 ✅ Native MPNowPlayingInfoCenter metadata set with artwork');
        metadataSet = true;
      }
      
      // Yöntem 2: Generic MediaSession
      if (!metadataSet && NativeModules.MediaSession) {
        const sessionMetadata = {
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.albumTitle || metadata.album || 'Naber LA Collection',
          artwork: metadata.artwork,
          duration: metadata.duration || 180
        };
        NativeModules.MediaSession.setMetadata(sessionMetadata);
        console.log('🎵 ✅ Native iOS MediaSession metadata set');
        metadataSet = true;
      }
      
      // Yöntem 3: React Native MediaSession API (Web-like)
      if (!metadataSet && typeof navigator !== 'undefined' && navigator.mediaSession) {
        const mediaMetadata = {
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.albumTitle || metadata.album || 'Naber LA Collection',
          ...(metadata.artwork && {
            artwork: [
              { src: metadata.artwork, type: 'image/jpeg', sizes: '640x640' },
              { src: metadata.artwork, type: 'image/png', sizes: '640x640' }
            ]
          })
        };
        
        navigator.mediaSession.metadata = new MediaMetadata(mediaMetadata);
        console.log('🎵 ✅ React Native MediaSession API used');
        metadataSet = true;
      }
      
      if (!metadataSet) {
        console.log('🎵 ⚠️ No native media session module available - using expo-video fallback');
      }
    } catch (error) {
      console.log('🎵 ❌ Native media session error:', error);
    }
  };

  const updatePlaybackState = (isPlaying: boolean, position: number = 0) => {
    if (Platform.OS !== 'ios') return;
    
    try {
      if (NativeModules.MediaSession) {
        NativeModules.MediaSession.updatePlaybackState({
          state: isPlaying ? 'playing' : 'paused',
          position: position
        });
        console.log('🎵 Native iOS playback state updated:', isPlaying ? 'playing' : 'paused');
      }
    } catch (error) {
      console.log('🎵 Native playback state error:', error);
    }
  };

  return {
    setMediaMetadata,
    updatePlaybackState
  };
};
