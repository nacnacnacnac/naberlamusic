// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle, Platform } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'chevron.down': 'keyboard-arrow-down',
  'chevron.up': 'keyboard-arrow-up',
  'arrow.left': 'arrow-back',
  'arrow.clockwise': 'refresh',
  
  // Media Controls
  'play.fill': 'play-arrow',
  'pause.fill': 'pause',
  'backward.fill': 'skip-previous',
  'forward.fill': 'skip-next',
  'list.bullet': 'playlist-play',
  
  // Actions
  'plus': 'add',
  'plus.circle': 'add-circle',
  'trash': 'delete',
  'gear': 'settings',
  'gearshape': 'settings',
  'wrench.and.screwdriver': 'build',
  'lock': 'lock',
  
  // Media & Audio
  'video.fill': 'videocam',
  'speaker.wave.2.fill': 'volume-up',
  'speaker.fill': 'volume-up',
  'music.note': 'music-note',
  
  // Status & Alerts
  'exclamationmark.triangle': 'warning',
  'checkmark.circle.fill': 'check-circle',
  'xmark.circle.fill': 'cancel',
  'info.circle.fill': 'info',
  
  // Brand & User
  'apple.logo': 'apple',
  'rectangle.portrait.and.arrow.right': 'exit-to-app',
  'heart.fill': 'favorite',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  // Web'de HTML span kullan, native'de MaterialIcons kullan
  if (Platform.OS === 'web') {
    return (
      <span 
        className="material-icons"
        style={{
          fontSize: size,
          color: color as string,
          lineHeight: 1,
          ...(style as any)
        }}
      >
        {MAPPING[name]}
      </span>
    );
  }
  
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
