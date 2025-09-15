import React from 'react';
import { Platform, Image, View } from 'react-native';
import { IconSymbol } from './IconSymbol';

interface CustomIconProps {
  name: 'play' | 'pause' | 'skip-next' | 'skip-previous' | 'volume-up' | 'playlist' | 'chevron-up' | 'chevron-down' | 'chevron-left' | 'chevron-right' | 'plus' | 'rewind' | 'fast-forward' | 'keyboard-arrow-down' | 'heart' | 'delete' | 'share' | 'link';
  size?: number;
  color?: string;
  style?: any;
}

const iconMapping = {
  'play': 'icons8-play-60.png',
  'pause': 'icons8-pause-50.png',
  'skip-next': 'icons8-end-30.png',
  'skip-previous': 'icons8-end-30.png',
  'volume-up': 'icons8-volume-up-50.png',
  'playlist': 'icons8-list-60.png',
  'chevron-up': 'icons8-chevron-up-30.png',
  'chevron-down': 'icons8-less-than-30.png',
  'chevron-left': 'icons8-less-than-30.png',
  'chevron-right': 'icons8-less-than-30.png', // Sağa bakacak şekilde döndürülecek
  'keyboard-arrow-down': 'icons8-chevron-up-30.png',
  'plus': 'icons8-plus-50.png',
  'heart': 'icons8-plus-50.png', // Geçici olarak plus kullan
  'delete': 'icons8-rewind-50.png', // Geçici olarak rewind kullan
  'rewind': 'icons8-rewind-50.png',
  'fast-forward': 'icons8-fast-forward-30.png',
  'share': 'icons8-plus-50.png', // Geçici olarak plus kullan
  'link': 'icons8-plus-50.png', // Geçici olarak plus kullan
};

const fallbackMapping = {
  'play': 'play.fill',
  'pause': 'pause.fill',
  'skip-next': 'forward.fill',
  'skip-previous': 'backward.fill',
  'volume-up': 'speaker.wave.2.fill',
  'playlist': 'list.bullet',
  'chevron-up': 'chevron.up',
  'chevron-down': 'chevron.down',
  'chevron-left': 'chevron.left',
  'chevron-right': 'chevron.right',
  'keyboard-arrow-down': 'chevron.down',
  'plus': 'plus',
  'heart': 'heart.fill',
  'delete': 'trash',
  'rewind': 'backward.fill',
  'fast-forward': 'forward.fill',
  'share': 'square.and.arrow.up',
  'link': 'link',
};

export function CustomIcon({ name, size = 24, color = '#e0af92', style }: CustomIconProps) {
  // Web'de özel SVG iconları
  if (Platform.OS === 'web') {
    // Heart icon için özel SVG
    if (name === 'heart') {
      return (
        <View style={[{ width: size, height: size }, style]}>
          <div
            style={{
              width: size,
              height: size,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            dangerouslySetInnerHTML={{
              __html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="${color}"/></svg>`,
            }}
          />
        </View>
      );
    }
    
    // Delete icon için özel SVG
    if (name === 'delete') {
      return (
        <View style={[{ width: size, height: size }, style]}>
          <div
            style={{
              width: size,
              height: size,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            dangerouslySetInnerHTML={{
              __html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="${color}"/></svg>`,
            }}
          />
        </View>
      );
    }
    
    const iconFile = iconMapping[name];
    
    if (iconFile) {
      // Rotasyon uygula
      let rotation = '0deg';
      if (name === 'chevron-left') rotation = '0deg'; // Sol tarafa baksın
      if (name === 'chevron-right') rotation = '180deg'; // Sağa baksın
      if (name === 'keyboard-arrow-down') rotation = '180deg';
      if (name === 'skip-previous') rotation = '180deg'; // Sol tarafa baksın (ters çevir)
      
      return (
        <View style={[{ width: size, height: size }, style]}>
          <Image
            source={{ uri: `/icons/${iconFile}` }}
            style={{
              width: size,
              height: size,
              tintColor: color,
              transform: [{ rotate: rotation }],
            }}
            contentFit="contain"
          />
        </View>
      );
    }
  }
  
  // Fallback to IconSymbol for native or if custom icon not available
  const fallbackName = fallbackMapping[name];
  return (
    <IconSymbol 
      name={fallbackName as any}
      size={size}
      color={color}
      style={style}
    />
  );
}
