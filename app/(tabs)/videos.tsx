import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, Alert, Image, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useVimeo } from '@/contexts/VimeoContext';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
import { vimeoService } from '@/services/vimeoService';

export default function VideosScreen() {
  const { 
    videos, 
    isLoading, 
    error, 
    isConfigured, 
    loadVideos, 
    refreshVideos 
  } = useVimeo();
  
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isConfigured && videos.length === 0) {
      loadVideos();
    }
  }, [isConfigured]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshVideos();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const openVimeoSetup = () => {
    router.push('/vimeo-setup');
  };

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderVideoItem = ({ item }: { item: SimplifiedVimeoVideo }) => (
    <TouchableOpacity 
      style={styles.videoItem}
      onPress={() => console.log('Video tıklandı:', item.title)}
    >
      <ThemedView style={styles.videoThumbnail}>
        <Image
          source={{ uri: item.thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        <ThemedView style={styles.durationBadge}>
          <ThemedText style={styles.durationText}>
            {formatDuration(item.duration)}
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.playButton}>
          <IconSymbol name="play.fill" size={20} color="white" />
        </ThemedView>
      </ThemedView>
      <ThemedView style={styles.videoInfo}>
        <ThemedText style={styles.videoTitle} numberOfLines={2}>
          {item.title}
        </ThemedText>
        <ThemedView style={styles.videoStats}>
          <ThemedText style={styles.videoPlays}>
            {item.plays.toLocaleString()} görüntülenme
          </ThemedText>
          <ThemedText style={styles.videoDate}>
            {new Date(item.createdAt).toLocaleDateString('tr-TR')}
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </TouchableOpacity>
  );

  // Vimeo kurulmamışsa setup sayfasına yönlendir
  if (!isConfigured) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.centerContent}>
          <IconSymbol name="video.fill" size={64} color="#e0af92" />
          <ThemedText style={styles.setupTitle}>Vimeo Entegrasyonu</ThemedText>
          <ThemedText style={styles.setupDescription}>
            340 müzik videonuza erişmek için Vimeo hesabınızı bağlayın
          </ThemedText>
          <TouchableOpacity style={styles.setupButton} onPress={openVimeoSetup}>
            <IconSymbol name="link" size={20} color="white" />
            <ThemedText style={styles.setupButtonText}>Vimeo'yu Bağla</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    );
  }

  // Loading durumu
  if (isLoading && videos.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.centerContent}>
          <IconSymbol name="arrow.clockwise" size={48} color="#e0af92" />
          <ThemedText style={styles.loadingText}>Vimeo videoları yükleniyor...</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  // Hata durumu
  if (error && videos.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.centerContent}>
          <IconSymbol name="exclamationmark.triangle" size={48} color="#FF6B6B" />
          <ThemedText style={styles.errorTitle}>Bağlantı Hatası</ThemedText>
          <ThemedText style={styles.errorText}>
            {error.developer_message || 'Videolar yüklenemedi'}
          </ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={loadVideos}>
            <IconSymbol name="arrow.clockwise" size={20} color="white" />
            <ThemedText style={styles.retryButtonText}>Tekrar Dene</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.headerTitle}>Vimeo Videolarım</ThemedText>
        <ThemedView style={styles.headerStats}>
          <ThemedText style={styles.videoCount}>{videos.length} video</ThemedText>
          {isLoading && (
            <ThemedView style={styles.loadingIndicator}>
              <IconSymbol name="arrow.clockwise" size={16} color="#e0af92" />
              <ThemedText style={styles.loadingSmallText}>Güncelleniyor</ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </ThemedView>
      
      {videos.length === 0 ? (
        <ThemedView style={styles.centerContent}>
          <IconSymbol name="video.slash" size={48} color="#999" />
          <ThemedText style={styles.emptyText}>Henüz video bulunamadı</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Vimeo hesabınızda video olduğundan emin olun
          </ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={videos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.videoGrid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#e0af92']}
              tintColor="#e0af92"
            />
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoCount: {
    fontSize: 16,
    opacity: 0.7,
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingSmallText: {
    fontSize: 12,
    marginLeft: 5,
    color: '#e0af92',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  setupDescription: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0af92',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  setupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingText: {
    fontSize: 18,
    marginTop: 20,
    color: '#e0af92',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 20,
    opacity: 0.7,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 10,
    opacity: 0.5,
    textAlign: 'center',
  },
  videoGrid: {
    padding: 10,
  },
  videoItem: {
    flex: 1,
    margin: 5,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  videoThumbnail: {
    position: 'relative',
    aspectRatio: 16 / 9,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }],
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 18,
  },
  videoStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoPlays: {
    fontSize: 12,
    opacity: 0.6,
    flex: 1,
  },
  videoDate: {
    fontSize: 12,
    opacity: 0.6,
  },
});
