import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { Playlist } from '@/types/playlist';

interface AndroidPlaylistItemProps {
  playlist: Playlist;
  onPress: () => void;
  onDelete: () => void;
}

export default function AndroidPlaylistItem({ 
  playlist, 
  onPress, 
  onDelete 
}: AndroidPlaylistItemProps) {
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
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  playlistContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  playlistThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  playlistCount: {
    fontSize: 14,
    color: '#888888',
  },
});
