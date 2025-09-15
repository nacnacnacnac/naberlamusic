import React, { useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Alert,
  View,
  Animated,
  Text,
  Platform,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { CustomIcon } from '@/components/ui/CustomIcon';
import { Playlist } from '@/types/playlist';
import { hybridPlaylistService } from '@/services/hybridPlaylistService';

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
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const handleDelete = async () => {
    if (Platform.OS === 'web') {
      // Web için inline confirmation göster
      setShowDeleteConfirm(true);
    } else {
      // Native için Alert kullan (swipe ile)
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
            onPress: deletePlaylist,
          },
        ]
      );
    }
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    await deletePlaylist();
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    swipeableRef.current?.close();
  };

  const deletePlaylist = async () => {
    try {
      setErrorMessage(null); // Clear any previous errors
      await hybridPlaylistService.deletePlaylist(playlist.id);
      onDelete(); // Refresh the list
    } catch (error) {
      if (Platform.OS === 'web') {
        setErrorMessage('Failed to delete playlist. Please try again.');
        // Clear error after 3 seconds
        setTimeout(() => setErrorMessage(null), 3000);
      } else {
        Alert.alert('Error', 'Failed to delete playlist');
      }
    }
  };

  const renderRightActions = (progress: Animated.AnimatedAddition, dragX: Animated.AnimatedAddition) => {
    return (
      <View style={styles.rightActionsContainer}>
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <CustomIcon name="delete" size={22} color="white" />
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
      renderRightActions={Platform.OS === 'web' ? undefined : renderRightActions}
      rightThreshold={Platform.OS === 'web' ? 0 : 40}
      friction={2}
      overshootRight={false}
      shouldCancelWhenOutside={true}
      enableTrackpadTwoFingerGesture={false}
      enabled={Platform.OS !== 'web'}
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
            <CustomIcon name="heart" size={24} color="#e0af92" />
          </View>
          
          <View style={styles.textContainer}>
            {showDeleteConfirm && Platform.OS === 'web' ? (
              <View style={styles.confirmationContainer}>
                <Text style={styles.confirmationText}>
                  Delete "{playlist.name}"?
                </Text>
                <View style={styles.confirmationButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={cancelDelete}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteButton} 
                    onPress={confirmDelete}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
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
                {errorMessage && (
                  <Text style={styles.errorMessage}>
                    {errorMessage}
                  </Text>
                )}
              </>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.deleteIconContainer}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <CustomIcon name="delete" size={18} color="#666666" />
          </TouchableOpacity>
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
  deleteIconContainer: {
    padding: 8,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorMessage: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  confirmationContainer: {
    padding: 0,
    backgroundColor: 'transparent',
  },
  confirmationText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
    textAlign: 'center',
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#333333',
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ff6b6b',
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});