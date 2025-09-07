import React, { useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Alert,
  View,
  Animated,
  Text,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
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

export default function SwipeablePlaylistItem({ 
  playlist, 
  onPress, 
  onDelete 
}: SwipeablePlaylistItemProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const [isSwiping, setIsSwiping] = React.useState(false);

  const handleDelete = async () => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            swipeableRef.current?.close();
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await playlistService.deletePlaylist(playlist.id);
              onDelete(); // Refresh the list
            } catch (error) {
              console.error('Error deleting playlist:', error);
              Alert.alert('Error', 'Failed to delete playlist');
            }
          },
        },
      ]
    );
  };

  const renderRightActions = (progress: Animated.AnimatedAddition, dragX: Animated.AnimatedAddition) => {
    return (
      <View style={styles.rightActionsContainer}>
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <IconSymbol name="trash" size={22} color="white" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = () => {
    if (!playlist.videos || playlist.videos.length === 0) return 0;
    return playlist.videos.reduce((total, video) => total + (video.duration || 0), 0);
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      friction={2}
      overshootRight={false}
      shouldCancelWhenOutside={true}
      enableTrackpadTwoFingerGesture={false}
      onSwipeableWillOpen={() => {
        setIsSwiping(true);
      }}
      onSwipeableClose={() => {
        setIsSwiping(false);
      }}
      onBegan={() => {
        setIsSwiping(true);
      }}
      onEnded={() => {
        setTimeout(() => setIsSwiping(false), 100);
      }}
    >
      <TouchableOpacity
        style={styles.container}
        onPress={isSwiping ? () => {} : onPress}
        activeOpacity={isSwiping ? 1 : 0.7}
      >
        <ThemedView style={styles.content}>
          <View style={styles.iconContainer}>
            <IconSymbol name="heart.fill" size={24} color="#e0af92" />
          </View>
          
          <View style={styles.textContainer}>
            <ThemedText style={styles.playlistName} numberOfLines={1}>
              {playlist.name}
            </ThemedText>
            <View style={styles.statsContainer}>
              <ThemedText style={styles.videoCount}>
                {playlist.videos?.length || 0} video{(playlist.videos?.length || 0) !== 1 ? 's' : ''}
              </ThemedText>
              {getTotalDuration() > 0 && (
                <>
                  <ThemedText style={styles.separator}>•</ThemedText>
                  <ThemedText style={styles.duration}>
                    {formatDuration(getTotalDuration())}
                  </ThemedText>
                </>
              )}
            </View>
          </View>
          
          <View style={styles.chevronContainer}>
            <IconSymbol name="chevron.right" size={16} color="#666666" />
          </View>
        </ThemedView>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoCount: {
    fontSize: 14,
    color: '#888888',
  },
  separator: {
    fontSize: 14,
    color: '#666666',
    marginHorizontal: 8,
  },
  duration: {
    fontSize: 14,
    color: '#888888',
  },
  chevronContainer: {
    padding: 4,
  },
  rightActionsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    backgroundColor: '#ff3b30',
    width: 120,
  },
  deleteAction: {
    flex: 1,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});