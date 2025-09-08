import AsyncStorage from '@react-native-async-storage/async-storage';
import { Playlist, PlaylistVideo } from '@/types/playlist';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
import { adminApiService } from './adminApiService';

class HybridPlaylistService {
  private readonly STORAGE_KEY = 'naber_la_user_playlists'; // Only user playlists
  private readonly ADMIN_CACHE_KEY = 'naber_la_admin_cache'; // Admin playlists cache
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
   * Get all playlists (admin playlists + user playlists combined)
   */
  async getPlaylists(): Promise<Playlist[]> {
    try {
      // Always try to get admin playlists (global playlists for all users)
      const adminPlaylists = await adminApiService.getPlaylists();
      console.log('📡 Fetched admin playlists:', adminPlaylists.length);
      
      // Cache admin playlists separately
      await this.cacheAdminPlaylistsLocally(adminPlaylists);
      
      // Get user's local playlists
      const userPlaylists = await this.getUserPlaylists();
      console.log('📱 Fetched user playlists:', userPlaylists.length);
      
      // Combine admin playlists (global) + user playlists (local)
      // Admin playlists first, then user playlists
      // Add prefix to distinguish admin vs user playlists and avoid duplicate keys
      const prefixedAdminPlaylists = adminPlaylists.map(playlist => ({
        ...playlist,
        id: `admin_${playlist.id}`,
        isAdminPlaylist: true
      }));
      
      const prefixedUserPlaylists = userPlaylists.map(playlist => ({
        ...playlist,
        id: playlist.id.startsWith('user_') ? playlist.id : `user_${playlist.id}`,
        isAdminPlaylist: false
      }));
      
      const allPlaylists = [...prefixedAdminPlaylists, ...prefixedUserPlaylists];
      
      return allPlaylists;
    } catch (error) {
      console.warn('⚠️ Admin API failed, showing only user playlists:', error);
      // If admin API fails, show only user's local playlists
      return await this.getUserPlaylists();
    }
  }

  /**
   * Get user's personal playlists (local only)
   */
  async getUserPlaylists(): Promise<Playlist[]> {
    return await this.getLocalPlaylists();
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
   * Cache admin playlists separately
   */
  private async cacheAdminPlaylistsLocally(playlists: Playlist[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.ADMIN_CACHE_KEY, JSON.stringify(playlists));
      console.log('💾 Cached admin playlists:', playlists.length);
    } catch (error) {
      console.error('Error caching admin playlists:', error);
    }
  }

  /**
   * Cache playlists locally (deprecated - keeping for compatibility)
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
   * Get a specific playlist by ID (handles prefixed IDs)
   */
  async getPlaylist(id: string): Promise<Playlist | null> {
    if (id.startsWith('admin_')) {
      // Admin playlist - get from API
      const actualId = id.replace('admin_', '');
      try {
        const playlist = await adminApiService.getPlaylist(actualId);
        return playlist ? { ...playlist, id: `admin_${playlist.id}`, isAdminPlaylist: true } : null;
      } catch (error) {
        console.warn('⚠️ Admin API failed for playlist:', actualId, error);
        return null;
      }
    } else if (id.startsWith('user_')) {
      // User playlist - get from local storage
      const actualId = id.replace('user_', '');
      const playlists = await this.getLocalPlaylists();
      const playlist = playlists.find(p => p.id === actualId);
      return playlist ? { ...playlist, id: `user_${playlist.id}`, isAdminPlaylist: false } : null;
    } else {
      // Legacy playlist without prefix - check local storage
      const playlists = await this.getLocalPlaylists();
      return playlists.find(p => p.id === id) || null;
    }
  }

  /**
   * Create a new user playlist (always local)
   */
  async createPlaylist(name: string, description?: string): Promise<Playlist> {
    // User playlists are always created locally
    console.log('📱 Creating user playlist locally:', name);
    return await this.createLocalPlaylist(name, description);
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
    console.log('🔍 Debug addVideoToPlaylist:', { playlistId, videoTitle: video.name || video.title });
    
    // Check if this is an admin playlist or user playlist based on prefix
    if (playlistId.startsWith('admin_')) {
      console.log('❌ Attempted to add video to admin playlist:', playlistId);
      throw new Error('Cannot add videos to admin playlists. Only admins can modify global playlists.');
    } else if (playlistId.startsWith('user_')) {
      // Remove prefix and add to user's local playlist
      const actualPlaylistId = playlistId.replace('user_', '');
      console.log('📱 Adding video to user playlist locally:', actualPlaylistId);
      await this.addVideoToLocalPlaylist(actualPlaylistId, video);
    } else {
      // Legacy playlist without prefix - treat as user playlist
      console.log('📱 Adding video to legacy user playlist locally:', playlistId);
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
      title: video.name || video.title || 'Unknown Video',
      duration: video.duration || 0,
      thumbnail: video.pictures?.sizes?.[0]?.link || video.thumbnail || 'https://via.placeholder.com/640x360',
      addedAt: new Date().toISOString(),
      vimeo_id: video.id
    };
    
    console.log('💾 Adding video to local playlist:', {
      playlistId,
      videoTitle: playlistVideo.title,
      videoDuration: playlistVideo.duration
    });

    playlist.videos.push(playlistVideo);
    playlist.updatedAt = new Date().toISOString();
    
    // Update thumbnail if this is the first video
    if (playlist.videos.length === 1) {
      playlist.thumbnail = playlistVideo.thumbnail;
    }

    await this.cachePlaylistsLocally(playlists);
    console.log('✅ Added video to local playlist:', playlistVideo.title, '→', playlist.name);
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
   * Delete a playlist
   */
  async deletePlaylist(playlistId: string): Promise<void> {
    console.log('🗑️ Deleting playlist:', playlistId);
    
    if (playlistId.startsWith('admin_')) {
      throw new Error('Cannot delete admin playlists. Only admins can delete global playlists.');
    } else if (playlistId.startsWith('user_')) {
      // Remove prefix and delete from local storage
      const actualPlaylistId = playlistId.replace('user_', '');
      await this.deleteLocalPlaylist(actualPlaylistId);
    } else {
      // Legacy playlist without prefix - delete from local storage
      await this.deleteLocalPlaylist(playlistId);
    }
  }

  /**
   * Delete playlist from local storage
   */
  private async deleteLocalPlaylist(playlistId: string): Promise<void> {
    try {
      const playlists = await this.getLocalPlaylists();
      const updatedPlaylists = playlists.filter(p => p.id !== playlistId);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedPlaylists));
      console.log('✅ Deleted local playlist:', playlistId);
    } catch (error) {
      console.error('Error deleting local playlist:', error);
      throw error;
    }
  }

  /**
   * Clear all playlists (both user and admin cache)
   */
  async clearAllPlaylists(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      await AsyncStorage.removeItem(this.ADMIN_CACHE_KEY);
      await AsyncStorage.removeItem(this.SYNC_KEY);
      console.log('✅ Cleared all local playlists and admin cache');
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
