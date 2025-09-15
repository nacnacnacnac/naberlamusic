import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
import { hybridVimeoService } from '@/services/hybridVimeoService';
import VimeoPlayerNative from '@/components/VimeoPlayerNative';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function SharedSongPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [video, setVideo] = useState<SimplifiedVimeoVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Video ID bulunamadı');
      setLoading(false);
      return;
    }

    loadVideo();
  }, [id]);

  const loadVideo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Video bilgilerini Vimeo API'den çek
      const videoData = await hybridVimeoService.getVideoById(id);
      
      if (!videoData) {
        setError('Video bulunamadı');
        return;
      }

      setVideo(videoData);
      
      // Web için meta tag'leri güncelle
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        updateMetaTags(videoData);
      }
      
    } catch (err) {
      console.error('Video yükleme hatası:', err);
      setError('Video yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const updateMetaTags = (videoData: SimplifiedVimeoVideo) => {
    // Title
    document.title = `${videoData.title} - Naber LA Music`;
    
    // Meta description
    const metaDescription = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    metaDescription.setAttribute('content', videoData.description || `${videoData.title} - Naber LA Music'te dinle`);
    if (!document.querySelector('meta[name="description"]')) {
      document.head.appendChild(metaDescription);
    }

    // Open Graph tags
    const ogTags = [
      { property: 'og:title', content: videoData.title },
      { property: 'og:description', content: videoData.description || `${videoData.title} - Naber LA Music'te dinle` },
      { property: 'og:image', content: videoData.thumbnail },
      { property: 'og:url', content: `https://naberla.music/song/${videoData.id}` },
      { property: 'og:type', content: 'music.song' },
      { property: 'og:site_name', content: 'Naber LA Music' },
      { property: 'music:duration', content: videoData.duration.toString() },
      { property: 'music:musician', content: 'Naber LA' },
    ];

    ogTags.forEach(({ property, content }) => {
      let metaTag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('property', property);
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', content);
    });

    // Twitter Card tags
    const twitterTags = [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: videoData.title },
      { name: 'twitter:description', content: videoData.description || `${videoData.title} - Naber LA Music'te dinle` },
      { name: 'twitter:image', content: videoData.thumbnail },
      { name: 'twitter:site', content: '@naberla' },
    ];

    twitterTags.forEach(({ name, content }) => {
      let metaTag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('name', name);
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', content);
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Şarkı yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !video) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Video bulunamadı'}</Text>
          <Text style={styles.errorSubtext}>
            Bu şarkı mevcut değil veya kaldırılmış olabilir.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Video Player */}
      <View style={styles.playerContainer}>
        <VimeoPlayerNative
          videoId={video.id}
          title={video.title}
          thumbnail={video.thumbnail}
          duration={video.duration}
          autoPlay={true}
          showControls={true}
        />
      </View>

      {/* Song Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.songTitle}>{video.title}</Text>
        {video.description && (
          <Text style={styles.songDescription}>{video.description}</Text>
        )}
        
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')} dakika
          </Text>
          {video.plays > 0 && (
            <Text style={styles.statsText}>
              {video.plays.toLocaleString()} dinlenme
            </Text>
          )}
        </View>

        {/* Naber LA Branding */}
        <View style={styles.brandingContainer}>
          <Text style={styles.brandingText}>🎵 Naber LA Music</Text>
          <Text style={styles.brandingSubtext}>
            Daha fazla şarkı için uygulamayı indir
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 16,
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, sans-serif' : undefined,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, sans-serif' : undefined,
  },
  errorSubtext: {
    color: '#cccccc',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, sans-serif' : undefined,
  },
  playerContainer: {
    width: screenWidth,
    height: screenWidth * (9/16), // 16:9 aspect ratio
    backgroundColor: '#000000',
  },
  infoContainer: {
    flex: 1,
    padding: 20,
  },
  songTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, sans-serif' : undefined,
  },
  songDescription: {
    color: '#cccccc',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, sans-serif' : undefined,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statsText: {
    color: '#888888',
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, sans-serif' : undefined,
  },
  brandingContainer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingVertical: 20,
  },
  brandingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, sans-serif' : undefined,
  },
  brandingSubtext: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, sans-serif' : undefined,
  },
});
