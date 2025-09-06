import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { vimeoService } from '@/services/vimeoService';
import { VimeoConfig, SimplifiedVimeoVideo, VimeoError } from '@/types/vimeo';

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

  // Initialize on app start
  useEffect(() => {
    initializeFromStorage();
  }, []);

  const initializeFromStorage = async () => {
    try {
      const savedConfig = await vimeoService.loadSavedConfig();
      if (savedConfig) {
        setConfig(savedConfig);
        setIsConfigured(true);
        
        // Test connection
        const isConnected = await vimeoService.testConnection();
        if (isConnected) {
          // Load cached videos first
          const cachedVideos = await vimeoService.getCachedVideos();
          if (cachedVideos.length > 0) {
            setVideos(cachedVideos);
          }
          
          // Then refresh from API in background
          loadVideosFromAPI();
        } else {
          setIsConfigured(false);
          setError({
            error: 'Connection Failed',
            error_code: 401,
            developer_message: 'Saved token is no longer valid',
            link: null,
          });
        }
      }
    } catch (err) {
      console.error('Error initializing from storage:', err);
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

    // First try to load from cache
    const cachedVideos = await vimeoService.getCachedVideos();
    if (cachedVideos.length > 0) {
      setVideos(cachedVideos);
    }

    // Then load from API
    await loadVideosFromAPI();
  };

  const loadVideosFromAPI = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const allVideos = await vimeoService.getAllUserVideos();
      setVideos(allVideos);
      
      console.log(`Loaded ${allVideos.length} videos from Vimeo`);
      
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
