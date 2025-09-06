import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Alert,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Playlist } from '@/types/playlist';
import { playlistService } from '@/services/playlistService';

interface SwipeablePlaylistItemProps {
  playlist: Playlist;
  onPress: () => void;
  onDelete: () => void;
}

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25; // 25% of screen width
const DELETE_AREA_WIDTH = 120;
const COLOR_CHANGE_THRESHOLD = 60;
const OPACITY_THRESHOLD = 80;

export default function SwipeablePlaylistItem({ 
  playlist, 
  onPress, 
  onDelete 
}: SwipeablePlaylistItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteBackgroundColor = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const deleteWidth = useRef(new Animated.Value(0)).current;

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // More sensitive horizontal detection
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 5;
    },
    onPanResponderGrant: () => {
      // Set initial values for smooth start
      translateX.setOffset(translateX._value);
      translateX.setValue(0);
    },
    onPanResponderMove: (evt, gestureState) => {
      // Only allow left swipe (negative dx)
      if (gestureState.dx < 0) {
        const swipeDistance = Math.abs(gestureState.dx);
        const clampedDistance = Math.min(swipeDistance, DELETE_AREA_WIDTH);
        
        // Use direct setValue for smooth real-time updates
        translateX.setValue(gestureState.dx);
        deleteWidth.setValue(clampedDistance);
        
        // Optimized color transition calculation
        const colorProgress = Math.min(1, Math.max(0, (swipeDistance - COLOR_CHANGE_THRESHOLD) / COLOR_CHANGE_THRESHOLD));
        deleteBackgroundColor.setValue(colorProgress);
        
        // Optimized opacity transition calculation  
        const opacityProgress = Math.min(1, Math.max(0, (swipeDistance - OPACITY_THRESHOLD) / (DELETE_AREA_WIDTH - OPACITY_THRESHOLD)));
        deleteOpacity.setValue(opacityProgress);
      } else {
        // Prevent right swipe
        translateX.setValue(0);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      translateX.flattenOffset();
      
      if (gestureState.dx < -SWIPE_THRESHOLD) {
        // Swipe threshold reached, show delete confirmation
        showDeleteConfirmation();
      } else {
        // Smooth snap back animation
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.timing(deleteWidth, {
            toValue: 0,
            duration: 250,
            useNativeDriver: false,
          }),
          Animated.timing(deleteBackgroundColor, {
            toValue: 0,
            duration: 250,
            useNativeDriver: false,
          }),
          Animated.timing(deleteOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();
      }
    },
    onPanResponderTerminate: () => {
      // Handle interruption gracefully
      translateX.flattenOffset();
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(deleteWidth, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(deleteBackgroundColor, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(deleteOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    },
  });

  const resetAnimations = () => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(deleteWidth, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(deleteBackgroundColor, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(deleteOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const showDeleteConfirmation = () => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: resetAnimations,
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: handleDelete,
        },
      ]
    );
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      // Smooth delete animation
      Animated.timing(translateX, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start(async () => {
        try {
          await playlistService.deletePlaylist(playlist.id);
          onDelete();
        } catch (error) {
          console.error('Error deleting playlist:', error);
          setIsDeleting(false);
          resetAnimations();
        }
      });
    } catch (error) {
      console.error('Error deleting playlist:', error);
      setIsDeleting(false);
      resetAnimations();
    }
  };

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Interpolate background color from gray to red
  const backgroundColor = deleteBackgroundColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#666666', '#FF6B6B'],
  });

  return (
    <View style={styles.container}>
      {/* Animated Delete Background */}
      <Animated.View 
        style={[
          styles.deleteBackground,
          {
            width: deleteWidth,
            backgroundColor,
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.deleteContent,
            {
              opacity: deleteOpacity,
            }
          ]}
        >
          <View style={styles.deleteIcon}>
            <View style={styles.minusLine} />
          </View>
          <Animated.Text style={[styles.deleteText, { opacity: deleteOpacity }]}>
            Delete
          </Animated.Text>
        </Animated.View>
      </Animated.View>

      {/* Main Item */}
      <Animated.View
        style={[
          styles.itemContainer,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.playlistItem}
          onPress={onPress}
          activeOpacity={0.7}
          disabled={isDeleting}
        >
          <ThemedView style={styles.playlistThumbnail}>
            <ThemedView style={styles.thumbnailPlaceholder}>
              <Image 
                source={require('@/assets/images/playlist.svg')}
                style={styles.playlistThumbnailIcon}
                contentFit="contain"
              />
            </ThemedView>
            <ThemedView style={styles.videoCountBadge}>
              <ThemedText style={styles.videoCountText}>
                {playlist.videos.length}
              </ThemedText>
            </ThemedView>
          </ThemedView>
          
          <ThemedView style={styles.playlistInfo}>
            <ThemedText style={styles.playlistName} numberOfLines={2}>
              {playlist.name}
            </ThemedText>
            {playlist.description && (
              <ThemedText style={styles.playlistDescription} numberOfLines={1}>
                {playlist.description}
              </ThemedText>
            )}
            <ThemedView style={styles.playlistStats}>
              <ThemedText style={styles.playlistStatsText}>
                {playlist.videos.length} video
              </ThemedText>
              <ThemedText style={styles.playlistStatsText}>
                {formatDuration(playlistService.getPlaylistDuration(playlist))}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <IconSymbol name="chevron.right" size={16} color="#e0af92" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 12,
    overflow: 'hidden',
    borderRadius: 12,
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  deleteContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  deleteText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  deleteIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  minusLine: {
    width: 12,
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  itemContainer: {
    backgroundColor: '#000000',
    borderRadius: 12,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#000000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333', // Koyu gri border
  },
  playlistThumbnail: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333', // Koyu gri border
  },
  playlistThumbnailIcon: {
    width: 32,
    height: 32,
  },
  videoCountBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#e0af92',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  videoCountText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 12,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  playlistDescription: {
    color: 'white',
    fontSize: 13,
    marginBottom: 6,
  },
  playlistStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistStatsText: {
    color: '#e0af92',
    fontSize: 12,
    marginRight: 15,
  },
});
