import React from 'react';
import { Platform, View, Image } from 'react-native';
import { IconSymbol } from './IconSymbol';

interface CustomIconProps {
  name: 'play' | 'pause' | 'skip-next' | 'skip-previous' | 'volume-up' | 'playlist' | 'chevron-up' | 'chevron-down' | 'chevron-left' | 'chevron-right' | 'plus' | 'minus' | 'rewind' | 'fast-forward' | 'keyboard-arrow-down' | 'heart' | 'delete' | 'share' | 'logout' | 'trash' | 'apple';
  size?: number;
  color?: string;
  style?: any;
}

// Static imports for mobile
const iconAssets = {
  'icons8-play-60.png': require('../../assets/iconz/icons8-play-60.png'),
  'icons8-pause-50.png': require('../../assets/iconz/icons8-pause-50.png'),
  'icons8-end-30.png': require('../../assets/iconz/icons8-end-30.png'),
  'icons8-volume-up-50.png': require('../../assets/iconz/icons8-volume-up-50.png'),
  'icons8-list-60.png': require('../../assets/iconz/icons8-list-60.png'),
  'icons8-chevron-up-30.png': require('../../assets/iconz/icons8-chevron-up-30.png'),
  'icons8-less-than-30.png': require('../../assets/iconz/icons8-less-than-30.png'),
  'icons8-plus-50.png': require('../../assets/iconz/icons8-plus-50.png'),
  'icons8-rewind-50.png': require('../../assets/iconz/icons8-rewind-50.png'),
  'icons8-fast-forward-30.png': require('../../assets/iconz/icons8-fast-forward-30.png'),
  // New controller icons - active and disabled states
  'play_active.png': require('../../assets/iconz/play_active.png'),
  'play_disable.png': require('../../assets/iconz/play_disable.png'),
  'pause_active.png': require('../../assets/iconz/pause_active.png'),
  'pause_disable.png': require('../../assets/iconz/pause_disable.png'),
  'left_arrow_active.png': require('../../assets/iconz/left_arrow_active.png'),
  'left_arrow_disable.png': require('../../assets/iconz/left_arrow_disable.png'),
  'right_arrow_active.png': require('../../assets/iconz/right_arrow_active.png'),
  'right_arrow_disable.png': require('../../assets/iconz/right_arrow_disable.png'),
};

const iconMapping = {
  'play': 'play_active.png',
  'pause': 'pause_active.png',
  'skip-next': 'right_arrow_active.png',
  'skip-previous': 'left_arrow_active.png',
  'volume-up': 'icons8-volume-up-50.png',
  'playlist': 'icons8-list-60.png',
  'chevron-up': 'icons8-chevron-up-30.png',
  'chevron-down': 'icons8-less-than-30.png',
  'chevron-left': 'icons8-less-than-30.png',
  'chevron-right': 'icons8-less-than-30.png', // Sağa bakacak şekilde döndürülecek
  'keyboard-arrow-down': 'icons8-chevron-up-30.png',
  'plus': 'icons8-plus-50.png',
  'minus': 'icons8-less-than-30.png', // Geçici olarak less-than kullan
  'heart': 'icons8-plus-50.png', // Geçici olarak plus kullan
  'delete': 'icons8-rewind-50.png', // Geçici olarak rewind kullan
  'rewind': 'icons8-rewind-50.png',
  'fast-forward': 'icons8-fast-forward-30.png',
  'logout': 'icons8-end-30.png', // Logout için end icon'u kullan
  'trash': 'icons8-rewind-50.png', // Trash için rewind icon'u kullan (geçici)
  'apple': 'icons8-plus-50.png', // Apple için plus icon'u kullan (geçici)
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
  'minus': 'minus',
  'heart': 'heart.fill',
  'delete': 'trash',
  'rewind': 'backward.fill',
  'fast-forward': 'forward.fill',
  'share': 'square.and.arrow.up',
  'logout': 'rectangle.portrait.and.arrow.right',
  'trash': 'trash',
  'apple': 'applelogo',
};

export function CustomIcon({ name, size = 24, color = '#e0af92', style }: CustomIconProps) {
  // Player butonları için platform-specific icons
  const isPlayerButton = ['play', 'pause', 'skip-next', 'skip-previous'].includes(name);
  
  // Color prop'undan aktif/disabled durumunu anlayalım (hem web hem mobil)
  const isDisabled = isPlayerButton && color === '#666666';
  
  // Debug logging (disabled to reduce spam)
  // if (__DEV__ && isPlayerButton && Platform.OS !== 'web') {
  //   console.log(`🎨 CustomIcon Debug - ${name}:`, {
  //     color,
  //     isDisabled,
  //     platform: Platform.OS
  //   });
  // }
  
  // Web'de özel SVG iconları veya player butonları için Image
  if (Platform.OS === 'web' || isPlayerButton) {
    // Share icon için özel SVG
    if (name === 'share') {
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
              __html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" fill="${color}"/></svg>`,
            }}
          />
        </View>
      );
    }

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
    
    // Platform-specific icon selection for player buttons
    let iconFile = iconMapping[name];
    
    // Use disabled versions for web when color is gray
    if (Platform.OS === 'web' && isPlayerButton && isDisabled) {
      if (name === 'play') iconFile = 'play_disable.png';
      if (name === 'pause') iconFile = 'pause_disable.png';
      if (name === 'skip-next') iconFile = 'right_arrow_disable.png';
      if (name === 'skip-previous') iconFile = 'left_arrow_disable.png';
    }
    
    // Use new controller icons for player buttons on mobile
    if (Platform.OS !== 'web' && isPlayerButton) {
      if (isDisabled) {
        // Disabled versions - ready-made icons
        if (name === 'play') iconFile = 'play_disable.png';
        if (name === 'pause') iconFile = 'pause_disable.png';
        if (name === 'skip-next') iconFile = 'right_arrow_disable.png';
        if (name === 'skip-previous') iconFile = 'left_arrow_disable.png';
      } else {
        // Active versions - ready-made icons
        if (name === 'play') iconFile = 'play_active.png';
        if (name === 'pause') iconFile = 'pause_active.png';
        if (name === 'skip-next') iconFile = 'right_arrow_active.png';
        if (name === 'skip-previous') iconFile = 'left_arrow_active.png';
      }
      
      // Debug selected icon (disabled to reduce spam)
      // if (__DEV__) {
      //   console.log(`🎨 Selected controller icon for ${name}:`, iconFile);
      //   console.log(`🎨 Platform: ${Platform.OS}, isPlayerButton: ${isPlayerButton}, isDisabled: ${isDisabled}`);
      // }
    }
    
    if (iconFile) {
      // Rotasyon uygula (sadece non-player butonları için)
      let rotation = '0deg';
      
      // Player butonları için rotation hesaplama - mobilde hazır iconlar
      if (!(Platform.OS !== 'web' && isPlayerButton)) {
        if (name === 'chevron-left') rotation = '0deg'; // Sol tarafa baksın
        if (name === 'chevron-right') rotation = '180deg'; // Sağa baksın
        if (name === 'keyboard-arrow-down') rotation = '180deg';
      }
      
      // Platform-specific source
      const imageSource = Platform.OS === 'web' 
        ? { uri: `/icons/${iconFile}` }
        : iconAssets[iconFile as keyof typeof iconAssets];
      
      return (
        <View style={[{ width: size, height: size }, style]}>
          <Image
            source={imageSource}
            style={{
              width: size,
              height: size,
              // Sadece non-player butonları için tintColor kullan (hazır renkli iconlar)
              ...(!isPlayerButton ? { tintColor: color } : {}),
              // Rotation sadece gerektiğinde uygula
              ...(rotation !== '0deg' ? { transform: [{ rotate: rotation }] } : {}),
            }}
            resizeMode="contain"
          />
        </View>
      );
    }
  }
  
  // Fallback to IconSymbol for native or if custom icon not available
  const fallbackName = fallbackMapping[name];
  
  if (__DEV__ && isPlayerButton) {
    console.log(`🚨 FALLBACK KULLANILIYOR! ${name} -> ${fallbackName}`);
  }
  
  return (
    <IconSymbol 
      name={fallbackName as any}
      size={size}
      color={color}
      style={style}
    />
  );
}
