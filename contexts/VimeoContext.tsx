import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { hybridVimeoService } from '@/services/hybridVimeoService';
import { VimeoConfig, SimplifiedVimeoVideo, VimeoError } from '@/types/vimeo';
import { remoteConfigService, RemoteConfig } from '@/services/remoteConfigService';

interface VimeoContextType {
  // Configuration
  isConfigured: boolean;
  config: VimeoConfig | null;
  
  // Videos
  videos: SimplifiedVimeoVideo[];
  isLoading: boolean;
  error: VimeoError | null;
  
  // Actions
  initializeVimeo: (config: VimeoConfig) => Promise<void>;
  loadVideos: () => Promise<void>;
  refreshVideos: () => Promise<void>;
  clearVimeoData: () => Promise<void>;
  
  // Video operations
  getVideo: (videoId: string) => SimplifiedVimeoVideo | undefined;
  searchVideos: (query: string) => SimplifiedVimeoVideo[];
  
  // Privacy operations
  getPrivateVideos: () => Promise<SimplifiedVimeoVideo[]>;
  getPublicVideos: () => Promise<SimplifiedVimeoVideo[]>;
  
  // Remote config
  remoteConfig: RemoteConfig | null;
  refreshRemoteConfig: () => Promise<void>;
}

const VimeoContext = createContext<VimeoContextType | undefined>(undefined);

interface VimeoProviderProps {
  children: ReactNode;
}

export function VimeoProvider({ children }: VimeoProviderProps) {
  const [isConfigured, setIsConfigured] = useState(false);
  const [config, setConfig] = useState<VimeoConfig | null>(null);
  const [videos, setVideos] = useState<SimplifiedVimeoVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<VimeoError | null>(null);
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(null);

  // Initialize on app start
  useEffect(() => {
    initializeFromStorage();
    initializeRemoteConfig();
  }, []);

  const initializeRemoteConfig = async () => {
    try {
      const config = await remoteConfigService.initialize();
      setRemoteConfig(config);
      
      // 🚀 OPTIMIZATION: Simplified config listener - no automatic refiltering
      remoteConfigService.addListener((newConfig) => {
        setRemoteConfig(newConfig);
        console.log('⚡ RemoteConfig updated - manual refresh needed for video changes');
        // Note: Videos won't auto-refilter for performance - user can manually refresh
      });
    } catch (error) {
      console.error('Error initializing remote config:', error);
    }
  };

  const initializeFromStorage = async () => {
    try {
      // Initialize hybrid service (handles backend/local tokens automatically)
      console.log('🔧 Initializing Vimeo with hybrid service');
      await hybridVimeoService.initialize();
      
      // Set a dummy config for compatibility
      const dummyConfig = {
        accessToken: 'hybrid-managed',
        userId: 'hybrid-user',
        userName: 'Hybrid User'
      };
      setConfig(dummyConfig);
      setIsConfigured(true);
      
      // 🚀 OPTIMIZATION: Only load cached videos, no API calls
      console.log('⚡ Loading cached videos only (optimized for performance)');
      console.log('🔍 DEBUG: initializeFromStorage calling hybridVimeoService.getAllUserVideos()');
      const cachedVideos = await hybridVimeoService.getAllUserVideos();
      if (cachedVideos.length > 0) {
        // Apply remote config filtering to cached videos
        const filteredVideos = remoteConfigService.filterVideos(cachedVideos);
        setVideos(filteredVideos);
        console.log(`✅ Loaded ${filteredVideos.length} cached videos`);
      } else {
        console.log('📦 No cached videos found - videos will be available after first manual refresh');
      }
      
    } catch (err) {
      console.error('🔍 DEBUG: Error in initializeFromStorage:', err);
      console.error('🔍 DEBUG: Error details:', JSON.stringify(err));
      setIsConfigured(true); // Mark as configured to avoid setup loop
    }
  };

  const initializeVimeo = async (newConfig: VimeoConfig): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await vimeoService.initialize(newConfig);
      
      // Test connection only - no video loading
      const isConnected = await vimeoService.testConnection();
      if (!isConnected) {
        throw new Error('Connection test failed');
      }
      
      setConfig(newConfig);
      setIsConfigured(true);
      
      // 🚀 OPTIMIZATION: Don't auto-load videos, just mark as ready
      console.log('✅ Vimeo initialized successfully - videos available via manual refresh');
      
    } catch (err: any) {
      console.error('Error initializing Vimeo:', err);
      setError({
        error: 'Initialization Failed',
        error_code: 0,
        developer_message: err.message || 'Unknown error',
        link: null,
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loadVideos = async (): Promise<void> => {
    if (!isConfigured) {
      console.warn('Vimeo not configured, cannot load videos');
      return;
    }

    // 🚀 OPTIMIZATION: Only load from cache, no API calls
    console.log('⚡ Loading videos from cache only (optimized)');
    const cachedVideos = await vimeoService.getCachedVideos();
    if (cachedVideos.length > 0) {
      // Apply remote config filtering to cached videos
      const filteredVideos = remoteConfigService.filterVideos(cachedVideos);
      setVideos(filteredVideos);
      console.log(`✅ Loaded ${filteredVideos.length} cached videos`);
    } else {
      console.log('📦 No cached videos found - use refreshVideos() to load from API');
    }
  };

  const loadVideosFromAPI = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First get all videos
      console.log('🔍 DEBUG: About to call hybridVimeoService.getAllUserVideos()');
      const allVideos = await hybridVimeoService.getAllUserVideos();
      console.log(`📥 Loaded ${allVideos.length} total videos from Vimeo`);
      
      // Apply remote config filtering directly to all videos (no need for separate public filter)
      console.log('🔍 Applying remote config filtering...');
      let filteredVideos = remoteConfigService.filterVideos(allVideos);
      
      // Filter out known problematic videos (401 errors)
      const problematicVideoIds = ['287273954', '287272607', '530776691', '379773967'];
      const beforeCount = filteredVideos.length;
      filteredVideos = filteredVideos.filter(video => {
        const videoId = video.uri.replace('/videos/', '');
        return !problematicVideoIds.includes(videoId);
      });
      
      if (beforeCount !== filteredVideos.length) {
        console.log(`🚫 Filtered out ${beforeCount - filteredVideos.length} problematic videos (401 errors)`);
      }
      
      console.log(`✅ Found ${filteredVideos.length} playable videos after filtering`);
      
      setVideos(filteredVideos);
      
    } catch (err: any) {
      console.error('Error loading videos:', err);
      
      // If we have cached videos, show error but keep videos
      if (videos.length === 0) {
        setError({
          error: 'Failed to Load Videos',
          error_code: 0,
          developer_message: err.message || 'Unknown error',
          link: null,
        });
      } else {
        // Just show a toast for background refresh failures
        Alert.alert(
          'Güncelleme Hatası',
          'Videolar güncellenirken bir hata oluştu. Mevcut videolar gösteriliyor.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshVideos = async (): Promise<void> => {
    if (!isConfigured) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Clear cache and reload
      await vimeoService.clearCache();
      await loadVideosFromAPI();
      
    } catch (err: any) {
      console.error('Error refreshing videos:', err);
      setError({
        error: 'Refresh Failed',
        error_code: 0,
        developer_message: err.message || 'Unknown error',
        link: null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearVimeoData = async (): Promise<void> => {
    try {
      await vimeoService.clearCache();
      setVideos([]);
      setConfig(null);
      setIsConfigured(false);
      setError(null);
      
      console.log('Vimeo data cleared');
    } catch (err) {
      console.error('Error clearing Vimeo data:', err);
    }
  };

  const getVideo = (videoId: string): SimplifiedVimeoVideo | undefined => {
    return videos.find(video => video.id === videoId);
  };

  const searchVideos = (query: string): SimplifiedVimeoVideo[] => {
    if (!query.trim()) return videos;
    
    const lowercaseQuery = query.toLowerCase();
    return videos.filter(video => 
      video.title.toLowerCase().includes(lowercaseQuery) ||
      (video.description && video.description.toLowerCase().includes(lowercaseQuery))
    );
  };

  const getPrivateVideos = async (): Promise<SimplifiedVimeoVideo[]> => {
    // 🚀 OPTIMIZATION: Return empty array, no complex filtering
    console.log('⚡ Private video filtering disabled for performance');
    return [];
  };

  const getPublicVideos = async (): Promise<SimplifiedVimeoVideo[]> => {
    // 🚀 OPTIMIZATION: Return all cached videos, no filtering
    console.log('⚡ Public video filtering simplified for performance');
    return await vimeoService.getCachedVideos();
  };

  const refreshRemoteConfig = async (): Promise<void> => {
    try {
      await remoteConfigService.refresh();
      console.log('🔄 Remote config refreshed');
    } catch (error) {
      console.error('Error refreshing remote config:', error);
    }
  };

  const contextValue: VimeoContextType = {
    // Configuration
    isConfigured,
    config,
    
    // Videos
    videos,
    isLoading,
    error,
    
    // Actions
    initializeVimeo,
    loadVideos,
    refreshVideos,
    clearVimeoData,
    
    // Video operations
    getVideo,
    searchVideos,
    getPrivateVideos,
    getPublicVideos,
    
    // Remote config
    remoteConfig,
    refreshRemoteConfig,
  };

  return (
    <VimeoContext.Provider value={contextValue}>
      {children}
    </VimeoContext.Provider>
  );
}

export function useVimeo(): VimeoContextType {
  const context = useContext(VimeoContext);
  if (context === undefined) {
    throw new Error('useVimeo must be used within a VimeoProvider');
  }
  return context;
}

export default VimeoContext;
