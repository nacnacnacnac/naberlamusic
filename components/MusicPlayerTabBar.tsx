import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Image } from 'expo-image';

interface MusicPlayerTabBarProps {
  currentVideo: any;
  isPaused: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onPlaylistPress: () => void;
  onAddToPlaylist: () => void;
}

export default function MusicPlayerTabBar({
  currentVideo,
  isPaused,
  onPlayPause,
  onPrevious,
  onNext,
  onPlaylistPress,
  onAddToPlaylist
}: MusicPlayerTabBarProps) {
  if (!currentVideo) return null;

  return (
    <LinearGradient
      colors={['#000000', 'rgba(0,0,0,0.9)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0)']}
      style={styles.container}
      start={{ x: 0, y: 1 }}
      end={{ x: 0, y: 0 }}
    >
      {/* Music Controls - Centered */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={onPrevious}>
          <IconSymbol name="backward.fill" size={20} color="#e0af92" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.playPauseButton} onPress={onPlayPause}>
          <IconSymbol 
            name={isPaused ? "play.fill" : "pause.fill"} 
            size={28} 
            color="#e0af92" 
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={onNext}>
          <IconSymbol name="forward.fill" size={20} color="#e0af92" />
        </TouchableOpacity>
      </View>

      {/* Right Actions */}
      <View style={styles.rightActions}>
        <TouchableOpacity style={styles.actionButton} onPress={onPlaylistPress}>
          <IconSymbol name="list.bullet" size={22} color="#e0af92" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40, // Safe area için daha fazla
    height: 150, // Daha büyük footer - gradient için
    zIndex: 1000,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  playPauseButton: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: 'transparent', // İçi boş
    borderWidth: 2,
    borderColor: '#333333', // Gri border
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  playlistIcon: {
    width: 18,
    height: 18,
  },
});
