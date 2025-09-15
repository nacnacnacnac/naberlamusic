import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CustomIcon } from '@/components/ui/CustomIcon';
import { hybridPlaylistService } from '@/services/hybridPlaylistService';
import CreatePlaylistModal from '@/components/CreatePlaylistModal';

interface MainPlaylistModalProps {
  onClose: () => void;
  userPlaylists: any[];
  expandedPlaylists: Set<string>;
  onTogglePlaylistExpansion: (playlistId: string) => void;
  onPlayVideo: (video: any) => void;
  currentVideo: any;
  onRefresh: () => void;
  refreshing: boolean;
  refreshTrigger?: number;
  onCreatePlaylist?: (videoId?: string, videoTitle?: string) => void;
}

export default function MainPlaylistModal({
  onClose,
  userPlaylists,
  expandedPlaylists,
  onTogglePlaylistExpansion,
  onPlayVideo,
  currentVideo,
  onRefresh,
  refreshing,
  refreshTrigger,
  onCreatePlaylist
}: MainPlaylistModalProps) {
  const playlistScrollRef = useRef<ScrollView>(null);
  const [hoveredVideo, setHoveredVideo] = React.useState<string | null>(null);
  const [currentView, setCurrentView] = React.useState<'main' | 'selectPlaylist' | 'createPlaylist'>('main');
  const [selectedVideoForPlaylist, setSelectedVideoForPlaylist] = React.useState<any>(null);
  const [userPlaylistsForSelection, setUserPlaylistsForSelection] = React.useState<any[]>([]);

  // refreshTrigger değiştiğinde playlist'leri yenile
  React.useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      onRefresh();
    }
  }, [refreshTrigger]);

  const handleAddToUserPlaylist = async (playlist: any) => {
    if (!selectedVideoForPlaylist) return;

    try {
      // Create synthetic video object
      const syntheticVideo = {
        id: selectedVideoForPlaylist.id,
        name: selectedVideoForPlaylist.title,
        title: selectedVideoForPlaylist.title,
        description: '',
        duration: 0,
        embed: {
          html: `<iframe src="https://player.vimeo.com/video/${selectedVideoForPlaylist.id}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
        },
        pictures: {
          sizes: [{ link: selectedVideoForPlaylist.thumbnail || 'https://via.placeholder.com/640x360' }]
        }
      };

      await hybridPlaylistService.addVideoToPlaylist(playlist.id, syntheticVideo);
      
      // Başarılı, ana view'a dön ve refresh et
      setCurrentView('main');
      onRefresh();
    } catch (error: any) {
      console.error('Error adding video to playlist:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to add video to playlist');
      }
    }
  };

  // Create Playlist View
  if (currentView === 'createPlaylist') {
    return (
      <CreatePlaylistModal
        onClose={() => setCurrentView('selectPlaylist')}
        onSuccess={() => {
          setCurrentView('main');
          onRefresh();
        }}
        videoId={selectedVideoForPlaylist?.id}
        videoTitle={selectedVideoForPlaylist?.title}
      />
    );
  }

  // Select Playlist View
  if (currentView === 'selectPlaylist' && selectedVideoForPlaylist) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setCurrentView('main')}
            activeOpacity={0.7}
          >
            <CustomIcon name="chevron-left" size={20} color="#e0af92" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Add to Playlist</ThemedText>
          <View style={styles.headerRight} />
        </View>

        {/* Video Info */}
        <View style={styles.videoInfoSection}>
          <ExpoImage 
            source={{ uri: selectedVideoForPlaylist.thumbnail || 'https://via.placeholder.com/60x40' }}
            style={styles.selectedVideoThumbnail}
            contentFit="cover"
          />
          <View style={styles.selectedVideoInfo}>
            <ThemedText style={styles.selectedVideoTitle} numberOfLines={2}>
              {selectedVideoForPlaylist.title}
            </ThemedText>
          </View>
        </View>

        {/* Playlists */}
        <ScrollView style={styles.selectPlaylistScroll} showsVerticalScrollIndicator={false}>
          {/* Create New Playlist */}
          <TouchableOpacity 
            style={styles.createNewPlaylistItem}
            onPress={() => {
              setCurrentView('createPlaylist');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.createPlaylistIcon}>
              <CustomIcon name="plus" size={20} color="#e0af92" />
            </View>
            <View style={styles.createPlaylistInfo}>
              <ThemedText style={styles.createPlaylistTitle}>Create New Playlist</ThemedText>
              <ThemedText style={styles.createPlaylistSubtitle}>Create a new playlist for this video</ThemedText>
            </View>
            <CustomIcon name="chevron-right" size={16} color="#666666" />
          </TouchableOpacity>

          {/* User Playlists */}
          {userPlaylistsForSelection.map((playlist) => (
            <TouchableOpacity
              key={playlist.id}
              style={styles.selectPlaylistItem}
              onPress={() => handleAddToUserPlaylist(playlist)}
              activeOpacity={0.7}
            >
              <View style={styles.selectPlaylistIcon}>
                <CustomIcon name="heart" size={20} color="#e0af92" />
              </View>
              <View style={styles.selectPlaylistInfo}>
                <ThemedText style={styles.selectPlaylistName} numberOfLines={1}>
                  {playlist.name}
                </ThemedText>
                <ThemedText style={styles.selectPlaylistCount}>
                  {playlist.videos?.length || 0} video{(playlist.videos?.length || 0) !== 1 ? 's' : ''}
                </ThemedText>
              </View>
              <CustomIcon name="plus" size={16} color="#666666" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <CustomIcon name="chevron-left" size={20} color="#e0af92" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Playlists</ThemedText>
        <View style={styles.headerRight}>
          <CustomIcon name="heart" size={20} color="#e0af92" />
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        ref={playlistScrollRef}
        style={styles.playlistArea}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e0af92"
            colors={['#e0af92']}
          />
        }
      >
        {/* Admin Panel Playlists */}
        {userPlaylists.map((playlist, playlistIndex) => {
          const isLastPlaylist = playlistIndex === userPlaylists.length - 1;
          return (
          <View key={playlist.id} style={styles.userPlaylistContainer}>
            <TouchableOpacity 
              style={styles.playlistHeader}
              onPress={() => onTogglePlaylistExpansion(playlist.id)}
              activeOpacity={0.7}
            >
              <View style={styles.playlistTitleContainer}>
                <ExpoImage 
                  source={require('@/assets/images/playlist.svg')}
                  style={styles.playlistHeaderIcon}
                  contentFit="contain"
                />
                <ThemedText style={styles.playlistTitle}>{playlist.name}</ThemedText>
              </View>
              <CustomIcon 
                name={expandedPlaylists.has(playlist.id) ? "keyboard-arrow-down" : "chevron-right"} 
                size={16} 
                color="#e0af92" 
              />
            </TouchableOpacity>
            
            {expandedPlaylists.has(playlist.id) && (
              <ScrollView 
                style={[
                  styles.userPlaylistScroll,
                  expandedPlaylists.size === 1 && styles.userPlaylistScrollExpanded
                ]}
                showsVerticalScrollIndicator={false}
                scrollEnabled={true}
                nestedScrollEnabled={true}
              >
                {playlist.videos && playlist.videos.length > 0 ? (
                  <>
                    {playlist.videos.map((playlistVideo: any, index: number) => (
                      <View
                        key={`${playlist.id}-${playlistVideo.id}`}
                        style={[
                          styles.playlistItem,
                          (currentVideo?.id === playlistVideo.id || currentVideo?.id === playlistVideo.vimeo_id) && styles.currentPlaylistItem
                        ]}
                        onMouseEnter={() => Platform.OS === 'web' && setHoveredVideo(`${playlist.id}-${playlistVideo.id}`)}
                        onMouseLeave={() => Platform.OS === 'web' && setHoveredVideo(null)}
                      >
                        <TouchableOpacity
                          style={styles.videoTouchable}
                          onPress={() => {
                            // Use vimeo_id if available, otherwise try to find by UUID
                            const vimeoIdToUse = playlistVideo.vimeo_id || playlistVideo.id;
                            const syntheticVideo = {
                              id: vimeoIdToUse,
                              name: playlistVideo.title,
                              description: '',
                              duration: playlistVideo.duration || 0,
                              embed: {
                                html: `<iframe src="https://player.vimeo.com/video/${vimeoIdToUse}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`
                              },
                              pictures: {
                                sizes: [{ link: playlistVideo.thumbnail || 'https://via.placeholder.com/640x360' }]
                              }
                            };
                            
                            onPlayVideo(syntheticVideo);
                          }}
                          activeOpacity={0.7}
                        >
                        <ExpoImage 
                          source={{ uri: playlistVideo.thumbnail || 'https://via.placeholder.com/100x56' }}
                          style={styles.videoThumbnail}
                          contentFit="cover"
                        />
                        <View style={styles.videoInfo}>
                          <ThemedText 
                            style={[
                              styles.videoTitle,
                              (currentVideo?.id === playlistVideo.id || currentVideo?.id === playlistVideo.vimeo_id) && styles.currentVideoTitle
                            ]} 
                            numberOfLines={2}
                          >
                            {playlistVideo.title}
                          </ThemedText>
                          <ThemedText style={styles.videoDuration}>
                            {playlistVideo.duration ? `${Math.floor(playlistVideo.duration / 60)}:${(playlistVideo.duration % 60).toString().padStart(2, '0')}` : '0:00'}
                          </ThemedText>
                        </View>
                        </TouchableOpacity>
                        
                        {/* + Button on hover */}
                        {Platform.OS === 'web' && hoveredVideo === `${playlist.id}-${playlistVideo.id}` && (
                          <TouchableOpacity
                            style={styles.addToPlaylistButton}
                            onPress={async () => {
                              const vimeoIdToUse = playlistVideo.vimeo_id || playlistVideo.id;
                              setSelectedVideoForPlaylist({
                                id: vimeoIdToUse,
                                title: playlistVideo.title,
                                thumbnail: playlistVideo.thumbnail
                              });
                              
                              // User playlist'leri yükle
                              try {
                                const userPlaylists = await hybridPlaylistService.getUserPlaylists();
                                setUserPlaylistsForSelection(userPlaylists);
                              } catch (error) {
                                console.error('Error loading user playlists:', error);
                                setUserPlaylistsForSelection([]);
                              }
                              
                              setCurrentView('selectPlaylist');
                            }}
                            activeOpacity={0.8}
                          >
                            <CustomIcon name="plus" size={16} color="#e0af92" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                    
                    {/* Spacer for last playlist */}
                    {isLastPlaylist && <View style={styles.lastPlaylistSpacer} />}
                  </>
                ) : (
                  <View style={styles.emptyPlaylistContainer}>
                    <ThemedText style={styles.emptyPlaylistText}>No videos in this playlist</ThemedText>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e0af92',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(224, 175, 146, 0.1)',
  },
  headerRight: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  userPlaylistContainer: {
    marginTop: 0,
  },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  playlistTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playlistHeaderIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
    tintColor: '#e0af92',
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  userPlaylistScroll: {
    maxHeight: 500,
    backgroundColor: '#000000',
  },
  userPlaylistScrollExpanded: {
    maxHeight: 600,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    backgroundColor: '#000000',
    position: 'relative',
  },
  videoTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addToPlaylistButton: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#e0af92',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  currentPlaylistItem: {
    backgroundColor: '#000000',
    borderLeftWidth: 3,
    borderLeftColor: '#e0af92',
  },
  videoThumbnail: {
    width: 60,
    height: 34,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: '#000000',
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
    marginBottom: 4,
    lineHeight: 18,
  },
  currentVideoTitle: {
    color: '#e0af92',
  },
  videoDuration: {
    fontSize: 12,
    color: '#999999',
  },
  emptyPlaylistContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyPlaylistText: {
    color: '#666666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  lastPlaylistSpacer: {
    height: 100,
  },
  // Select Playlist Styles
  videoInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  selectedVideoThumbnail: {
    width: 60,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#333333',
    marginRight: 12,
  },
  selectedVideoInfo: {
    flex: 1,
  },
  selectedVideoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  selectPlaylistScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  createNewPlaylistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 10,
  },
  createPlaylistIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#e0af92',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  createPlaylistInfo: {
    flex: 1,
  },
  createPlaylistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  createPlaylistSubtitle: {
    fontSize: 14,
    color: '#888888',
  },
  selectPlaylistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  selectPlaylistIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectPlaylistInfo: {
    flex: 1,
  },
  selectPlaylistName: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 4,
  },
  selectPlaylistCount: {
    fontSize: 14,
    color: '#888888',
  },
});
