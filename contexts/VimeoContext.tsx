import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { vimeoService } from '@/services/vimeoService';
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
      // Try to load saved configuration first
      let config = await vimeoService.loadSavedConfig();
      
      // If no saved config, use environment token
      if (!config) {
        console.log('📝 No saved config found, using environment token');
        const envToken = process.env.EXPO_PUBLIC_VIMEO_ACCESS_TOKEN;
        if (!envToken) {
          throw new Error('Vimeo access token not found in environment variables');
        }
        
        config = {
          accessToken: envToken,
          userId: 'naberla-user',
          userName: 'Naber LA User'
        };
        
        // Save the default config for future use
        await vimeoService.initialize(config);
      }
      
      console.log('🔧 Using Vimeo configuration');
      await vimeoService.initialize(config);
      setConfig(config);
      setIsConfigured(true);
      
      // 🚀 OPTIMIZATION: Only load cached videos, no API calls
      console.log('⚡ Loading cached videos only (optimized for performance)');
      const cachedVideos = await vimeoService.getCachedVideos();
      if (cachedVideos.length > 0) {
        // Apply remote config filtering to cached videos
        const filteredVideos = remoteConfigService.filterVideos(cachedVideos);
        setVideos(filteredVideos);
        console.log(`✅ Loaded ${filteredVideos.length} cached videos`);
      } else {
        console.log('📦 No cached videos found - videos will be available after first manual refresh');
      }
      
    } catch (err) {
      console.error('Error initializing Vimeo:', err);
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
      const allVideos = await vimeoService.getAllUserVideos();
      console.log(`📥 Loaded ${allVideos.length} total videos from Vimeo`);
      
      // Then filter to only public videos
      console.log('🔍 Filtering out private videos...');
      const publicVideos = await vimeoService.getPublicVideos();
      console.log(`✅ Found ${publicVideos.length} public videos (filtered out ${allVideos.length - publicVideos.length} private)`);
      
      // Apply remote config filtering
      const filteredVideos = remoteConfigService.filterVideos(publicVideos);
      console.log(`🎛️ Remote config filtered to ${filteredVideos.length} videos`);
      
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
