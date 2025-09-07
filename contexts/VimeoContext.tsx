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
      
      // Listen for config updates
      remoteConfigService.addListener((newConfig) => {
        setRemoteConfig(newConfig);
        // Refilter videos when config changes
        if (videos.length > 0) {
          const filteredVideos = remoteConfigService.filterVideos(videos);
          setVideos(filteredVideos);
        }
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
      
      // Test connection
      const isConnected = await vimeoService.testConnection();
      if (isConnected) {
        // Load cached videos first, but filter private ones
        const cachedVideos = await vimeoService.getCachedVideos();
        if (cachedVideos.length > 0) {
          console.log('🔍 Filtering cached videos...');
          const publicCachedVideos = await vimeoService.getPublicVideos();
          setVideos(publicCachedVideos);
        }
        
        // Then refresh from API in background
        loadVideosFromAPI();
      } else {
        console.log('⚠️ Vimeo connection failed');
        setIsConfigured(true); // Still mark as configured to avoid setup loop
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
      
      // Test connection
      const isConnected = await vimeoService.testConnection();
      if (!isConnected) {
        throw new Error('Connection test failed');
      }
      
      setConfig(newConfig);
      setIsConfigured(true);
      
      // Load videos
      await loadVideosFromAPI();
      
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

    // First try to load from cache, but filter private videos
    const cachedVideos = await vimeoService.getCachedVideos();
    if (cachedVideos.length > 0) {
      console.log('🔍 Filtering cached videos...');
      const publicCachedVideos = await vimeoService.getPublicVideos();
      setVideos(publicCachedVideos);
    }

    // Then load from API
    await loadVideosFromAPI();
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
    try {
      return await vimeoService.getPrivateVideos();
    } catch (error) {
      console.error('Error getting private videos:', error);
      return [];
    }
  };

  const getPublicVideos = async (): Promise<SimplifiedVimeoVideo[]> => {
    try {
      return await vimeoService.getPublicVideos();
    } catch (error) {
      console.error('Error getting public videos:', error);
      return videos; // Return all videos if filtering fails
    }
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
