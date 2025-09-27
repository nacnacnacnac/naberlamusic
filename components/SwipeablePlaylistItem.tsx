import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { Playlist } from '@/types/playlist';

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
  return (
    <TouchableOpacity onPress={onPress} style={styles.playlistItem}>
      <View style={styles.playlistContent}>
        <Image
          source={{ uri: playlist.thumbnail || 'https://via.placeholder.com/60x60' }}
          style={styles.playlistThumbnail}
          contentFit="cover"
        />
        <View style={styles.playlistInfo}>
          <ThemedText style={styles.playlistTitle} numberOfLines={2}>
            {playlist.name}
          </ThemedText>
          <ThemedText style={styles.playlistCount}>
            {playlist.videoCount || 0} videos
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333333',
  },
  playlistContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playlistThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#333333',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  playlistCount: {
    fontSize: 13,
    color: '#aaaaaa',
    marginTop: 2,
  },
});