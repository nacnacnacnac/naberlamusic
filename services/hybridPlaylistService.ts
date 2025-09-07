import AsyncStorage from '@react-native-async-storage/async-storage';
import { Playlist, PlaylistVideo } from '@/types/playlist';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
import { adminApiService } from './adminApiService';

class HybridPlaylistService {
  private readonly STORAGE_KEY = 'naber_la_playlists';
  private readonly SYNC_KEY = 'naber_la_last_sync';
  private readonly USE_ADMIN_API_KEY = 'naber_la_use_admin_api';

  /**
   * Check if admin API should be used
   */
  async shouldUseAdminApi(): Promise<boolean> {
    try {
      const useAdminApi = await AsyncStorage.getItem(this.USE_ADMIN_API_KEY);
      return useAdminApi === 'true';
    } catch (error) {
      console.error('Error checking admin API preference:', error);
      return false;
    }
  }

  /**
   * Enable/disable admin API usage
   */
  async setUseAdminApi(useAdminApi: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(this.USE_ADMIN_API_KEY, useAdminApi.toString());
      console.log(`🔄 Admin API usage ${useAdminApi ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error setting admin API preference:', error);
    }
  }

  /**
   * Get all playlists (hybrid: admin API + local fallback)
   */
  async getPlaylists(): Promise<Playlist[]> {
    const useAdminApi = await this.shouldUseAdminApi();
    
    if (useAdminApi) {
      try {
        // Try admin API first
        const adminPlaylists = await adminApiService.getPlaylists();
        
        // Cache admin playlists locally for offline access
        await this.cachePlaylistsLocally(adminPlaylists);
        
        return adminPlaylists;
      } catch (error) {
        console.warn('⚠️ Admin API failed, falling back to local storage:', error);
        // Fall back to local storage
        return await this.getLocalPlaylists();
      }
    } else {
      // Use local storage only
      return await this.getLocalPlaylists();
    }
  }

  /**
   * Get local playlists from AsyncStorage
   */
  private async getLocalPlaylists(): Promise<Playlist[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting local playlists:', error);
      return [];
    }
  }

  /**
   * Cache playlists locally
   */
  private async cachePlaylistsLocally(playlists: Playlist[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(playlists));
      await AsyncStorage.setItem(this.SYNC_KEY, new Date().toISOString());
    } catch (error) {
      console.error('Error caching playlists locally:', error);
    }
  }

  /**
   * Get a specific playlist by ID
   */
  async getPlaylist(id: string): Promise<Playlist | null> {
    const useAdminApi = await this.shouldUseAdminApi();
    
    if (useAdminApi) {
      try {
        return await adminApiService.getPlaylist(id);
      } catch (error) {
        console.warn('⚠️ Admin API failed, falling back to local storage:', error);
        // Fall back to local storage
        const playlists = await this.getLocalPlaylists();
        return playlists.find(p => p.id === id) || null;
      }
    } else {
      const playlists = await this.getLocalPlaylists();
      return playlists.find(p => p.id === id) || null;
    }
  }

  /**
   * Create a new playlist
   */
  async createPlaylist(name: string, description?: string): Promise<Playlist> {
    const useAdminApi = await this.shouldUseAdminApi();
    
    if (useAdminApi) {
      try {
        const playlist = await adminApiService.createPlaylist(name, description);
        
        // Also save locally for offline access
        const localPlaylists = await this.getLocalPlaylists();
        localPlaylists.push(playlist);
        await this.cachePlaylistsLocally(localPlaylists);
        
        return playlist;
      } catch (error) {
        console.warn('⚠️ Admin API failed, creating locally:', error);
        // Fall back to local creation
        return await this.createLocalPlaylist(name, description);
      }
    } else {
      return await this.createLocalPlaylist(name, description);
    }
  }

  /**
   * Create playlist locally
   */
  private async createLocalPlaylist(name: string, description?: string): Promise<Playlist> {
    const playlists = await this.getLocalPlaylists();
    
    const newPlaylist: Playlist = {
      id: this.generateId(),
      name: name.trim(),
      description: description?.trim(),
      videos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    playlists.push(newPlaylist);
    await this.cachePlaylistsLocally(playlists);
    
    console.log('✅ Created local playlist:', newPlaylist.name);
    return newPlaylist;
  }

  /**
   * Update an existing playlist
   */
  async updatePlaylist(id: string, updates: Partial<Playlist>): Promise<void> {
    const useAdminApi = await this.shouldUseAdminApi();
    
    if (useAdminApi) {
      try {
        // Note: Admin API doesn't have update endpoint yet, so we'll update locally
        console.warn('⚠️ Admin API update not implemented, updating locally');
        await this.updateLocalPlaylist(id, updates);
      } catch (error) {
        console.warn('⚠️ Admin API failed, updating locally:', error);
        await this.updateLocalPlaylist(id, updates);
      }
    } else {
      await this.updateLocalPlaylist(id, updates);
    }
  }

  /**
   * Update playlist locally
   */
  private async updateLocalPlaylist(id: string, updates: Partial<Playlist>): Promise<void> {
    const playlists = await this.getLocalPlaylists();
    const index = playlists.findIndex(p => p.id === id);
    
    if (index === -1) {
      throw new Error('Playlist not found');
    }

    playlists[index] = {
      ...playlists[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.cachePlaylistsLocally(playlists);
    console.log('✅ Updated local playlist:', id);
  }

  /**
   * Delete a playlist
   */
  async deletePlaylist(id: string): Promise<void> {
    const useAdminApi = await this.shouldUseAdminApi();
    
    if (useAdminApi) {
      try {
        await adminApiService.deletePlaylist(id);
        
        // Also remove from local cache
        const localPlaylists = await this.getLocalPlaylists();
        const filteredPlaylists = localPlaylists.filter(p => p.id !== id);
        await this.cachePlaylistsLocally(filteredPlaylists);
      } catch (error) {
        console.warn('⚠️ Admin API failed, deleting locally:', error);
        await this.deleteLocalPlaylist(id);
      }
    } else {
      await this.deleteLocalPlaylist(id);
    }
  }

  /**
   * Delete playlist locally
   */
  private async deleteLocalPlaylist(id: string): Promise<void> {
    const playlists = await this.getLocalPlaylists();
    const filteredPlaylists = playlists.filter(p => p.id !== id);
    
    await this.cachePlaylistsLocally(filteredPlaylists);
    console.log('✅ Deleted local playlist:', id);
  }

  /**
   * Add a video to playlist
   */
  async addVideoToPlaylist(playlistId: string, video: SimplifiedVimeoVideo): Promise<void> {
    const useAdminApi = await this.shouldUseAdminApi();
    
    if (useAdminApi) {
      try {
        await adminApiService.addVideoToPlaylist(playlistId, video);
        
        // Also update local cache
        await this.addVideoToLocalPlaylist(playlistId, video);
      } catch (error) {
        console.warn('⚠️ Admin API failed, adding video locally:', error);
        await this.addVideoToLocalPlaylist(playlistId, video);
      }
    } else {
      await this.addVideoToLocalPlaylist(playlistId, video);
    }
  }

  /**
   * Add video to local playlist
   */
  private async addVideoToLocalPlaylist(playlistId: string, video: SimplifiedVimeoVideo): Promise<void> {
    const playlists = await this.getLocalPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Check if video already exists
    const existingVideo = playlist.videos.find(v => v.id === video.id);
    if (existingVideo) {
      throw new Error('Video already in playlist');
    }

    const playlistVideo: PlaylistVideo = {
      id: video.id,
      title: video.title,
      duration: video.duration,
      thumbnail: video.thumbnail,
      addedAt: new Date().toISOString(),
    };

    playlist.videos.push(playlistVideo);
    playlist.updatedAt = new Date().toISOString();
    
    // Update thumbnail if this is the first video
    if (playlist.videos.length === 1) {
      playlist.thumbnail = video.thumbnail;
    }

    await this.cachePlaylistsLocally(playlists);
    console.log('✅ Added video to local playlist:', video.title, '→', playlist.name);
  }

  /**
   * Remove a video from playlist
   */
  async removeVideoFromPlaylist(playlistId: string, videoId: string): Promise<void> {
    const useAdminApi = await this.shouldUseAdminApi();
    
    if (useAdminApi) {
      try {
        await adminApiService.removeVideoFromPlaylist(playlistId, videoId);
        
        // Also update local cache
        await this.removeVideoFromLocalPlaylist(playlistId, videoId);
      } catch (error) {
        console.warn('⚠️ Admin API failed, removing video locally:', error);
        await this.removeVideoFromLocalPlaylist(playlistId, videoId);
      }
    } else {
      await this.removeVideoFromLocalPlaylist(playlistId, videoId);
    }
  }

  /**
   * Remove video from local playlist
   */
  private async removeVideoFromLocalPlaylist(playlistId: string, videoId: string): Promise<void> {
    const playlists = await this.getLocalPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    playlist.videos = playlist.videos.filter(v => v.id !== videoId);
    playlist.updatedAt = new Date().toISOString();
    
    // Update thumbnail if we removed the first video
    if (playlist.videos.length > 0) {
      playlist.thumbnail = playlist.videos[0].thumbnail;
    } else {
      playlist.thumbnail = undefined;
    }

    await this.cachePlaylistsLocally(playlists);
    console.log('✅ Removed video from local playlist:', videoId, '→', playlist.name);
  }

  /**
   * Check if video is in playlist
   */
  async isVideoInPlaylist(playlistId: string, videoId: string): Promise<boolean> {
    try {
      const playlist = await this.getPlaylist(playlistId);
      return playlist ? playlist.videos.some(v => v.id === videoId) : false;
    } catch (error) {
      console.error('Error checking video in playlist:', error);
      return false;
    }
  }

  /**
   * Get playlists containing a specific video
   */
  async getPlaylistsContainingVideo(videoId: string): Promise<Playlist[]> {
    try {
      const playlists = await this.getPlaylists();
      return playlists.filter(playlist => 
        playlist.videos.some(video => video.id === videoId)
      );
    } catch (error) {
      console.error('Error getting playlists containing video:', error);
      return [];
    }
  }

  /**
   * Clear all playlists
   */
  async clearAllPlaylists(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      await AsyncStorage.removeItem(this.SYNC_KEY);
      console.log('✅ Cleared all local playlists');
    } catch (error) {
      console.error('Error clearing playlists:', error);
      throw error;
    }
  }

  /**
   * Sync with admin API (force refresh)
   */
  async syncWithAdminApi(): Promise<void> {
    try {
      console.log('🔄 Syncing with admin API...');
      
      const adminPlaylists = await adminApiService.getPlaylists();
      await this.cachePlaylistsLocally(adminPlaylists);
      
      console.log(`✅ Synced ${adminPlaylists.length} playlists from admin API`);
    } catch (error) {
      console.error('❌ Error syncing with admin API:', error);
      throw error;
    }
  }

  /**
   * Test admin API connection
   */
  async testAdminApiConnection(): Promise<boolean> {
    return await adminApiService.testConnection();
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.SYNC_KEY);
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Format duration for display
   */
  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get total duration of playlist
   */
  getPlaylistDuration(playlist: Playlist): number {
    return playlist.videos.reduce((total, video) => total + video.duration, 0);
  }
}

// Export singleton instance
export const hybridPlaylistService = new HybridPlaylistService();
export default HybridPlaylistService;
