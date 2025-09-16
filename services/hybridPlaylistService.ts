import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Playlist, PlaylistVideo } from '@/types/playlist';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
import { adminApiService } from './adminApiService';
import { webOnlyPlaylistService } from './webOnlyPlaylistService';

class HybridPlaylistService {
  private readonly STORAGE_KEY = 'naber_la_user_playlists'; // Only user playlists
  private readonly ADMIN_CACHE_KEY = 'naber_la_admin_cache'; // Admin playlists cache
  private readonly SYNC_KEY = 'naber_la_last_sync';
  private readonly USE_ADMIN_API_KEY = 'naber_la_use_admin_api';
  private isBackgroundRefreshing = false; // Prevent duplicate background refreshes

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
   * Uses cache-first approach for better performance
   */
  async getPlaylists(forceRefresh: boolean = false): Promise<Playlist[]> {
    try {
      // Check cache freshness (5 minutes)
      if (!forceRefresh) {
        const lastRefresh = await AsyncStorage.getItem('playlists_last_refresh');
        if (lastRefresh) {
          const timeSinceRefresh = Date.now() - parseInt(lastRefresh);
          const fiveMinutes = 5 * 60 * 1000;
          
          if (timeSinceRefresh < fiveMinutes) {
            // Return cached data only
            const cachedAdminPlaylists = await this.getCachedAdminPlaylists();
            const userPlaylists = await this.getUserPlaylists();
            
            if (cachedAdminPlaylists.length > 0 || userPlaylists.length > 0) {
              console.log('⚡ Using fresh cached playlists - no API call needed');
              const prefixedCachedPlaylists = cachedAdminPlaylists.map(playlist => ({
                ...playlist,
                id: `admin_${playlist.id}`,
                isAdminPlaylist: true
              }));
              return [...userPlaylists, ...prefixedCachedPlaylists];
            }
          }
        }
      }
      
      // First, get cached admin playlists for immediate display
      const cachedAdminPlaylists = await this.getCachedAdminPlaylists();
      const userPlaylists = await this.getUserPlaylists();
      
      // If we have cached data, return it immediately
      if (cachedAdminPlaylists.length > 0) {
        console.log('📦 Using cached admin playlists:', cachedAdminPlaylists.length);
        
        // Return cached data immediately
        const prefixedCachedPlaylists = cachedAdminPlaylists.map(playlist => ({
          ...playlist,
          id: `admin_${playlist.id}`,
          isAdminPlaylist: true
        }));
        
        const prefixedUserPlaylists = userPlaylists.map(playlist => ({
          ...playlist,
          id: playlist.id.startsWith('user_') ? playlist.id : `user_${playlist.id}`,
          isAdminPlaylist: false
        }));
        
        // Get web-only playlists (only on web)
        const webOnlyPlaylists = Platform.OS === 'web' ? await webOnlyPlaylistService.getWebOnlyPlaylists() : [];
        
        // Filter out web-only playlists from cached results if not on web
        const filteredCachedPlaylists = Platform.OS === 'web' 
          ? prefixedCachedPlaylists 
          : prefixedCachedPlaylists.filter(playlist => !playlist.isWebOnlyPlaylist);
        
        const cachedResult = [...prefixedUserPlaylists, ...filteredCachedPlaylists, ...webOnlyPlaylists];
        
        // Only refresh in background if cache is older than 2 minutes
        const lastRefresh = await AsyncStorage.getItem('playlists_last_refresh');
        if (lastRefresh) {
          const timeSinceRefresh = Date.now() - parseInt(lastRefresh);
          const twoMinutes = 2 * 60 * 1000;
          
          if (timeSinceRefresh > twoMinutes && !this.isBackgroundRefreshing) {
            // Fetch fresh data in background (don't await)
            this.refreshAdminPlaylistsInBackground();
          }
        }
        
        return cachedResult;
      }
      
      // No cache, fetch from API (first time)
      console.log('🌐 No cache found, fetching from API...');
      const adminPlaylists = await adminApiService.getPlaylists();
      console.log('📡 Fetched admin playlists:', adminPlaylists.length);
      
      // Cache for next time
      await this.cacheAdminPlaylistsLocally(adminPlaylists);
      
      // Combine and return
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
      
      // Get web-only playlists (only on web)
      const webOnlyPlaylists = Platform.OS === 'web' ? await webOnlyPlaylistService.getWebOnlyPlaylists() : [];
      
      // Filter out web-only playlists from admin playlists if not on web
      const filteredAdminPlaylists = Platform.OS === 'web' 
        ? prefixedAdminPlaylists 
        : prefixedAdminPlaylists.filter(playlist => !playlist.isWebOnlyPlaylist);
      
      // Save refresh timestamp
      await AsyncStorage.setItem('playlists_last_refresh', Date.now().toString());
      
      return [...prefixedUserPlaylists, ...filteredAdminPlaylists, ...webOnlyPlaylists];
      
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
      const playlists = data ? JSON.parse(data) : [];
      
      // Sort playlists: "Liked Songs" first, then by updatedAt descending
      return playlists.sort((a: Playlist, b: Playlist) => {
        // "Liked Songs" playlist always comes first
        if (a.isLikedSongs && !b.isLikedSongs) return -1;
        if (!a.isLikedSongs && b.isLikedSongs) return 1;
        
        // For other playlists, sort by updatedAt descending
        const dateA = new Date(a.updatedAt || a.createdAt || '1970-01-01').getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || '1970-01-01').getTime();
        return dateB - dateA; // Most recently updated first
      });
    } catch (error) {
      console.error('Error getting local playlists:', error);
      return [];
    }
  }

  /**
   * Get cached admin playlists
   */
  private async getCachedAdminPlaylists(): Promise<Playlist[]> {
    try {
      const cachedData = await AsyncStorage.getItem(this.ADMIN_CACHE_KEY);
      if (cachedData) {
        const playlists = JSON.parse(cachedData);
        return Array.isArray(playlists) ? playlists : [];
      }
    } catch (error) {
      console.error('Error getting cached admin playlists:', error);
    }
    return [];
  }

  /**
   * Cache admin playlists separately
   */
  private async cacheAdminPlaylistsLocally(playlists: Playlist[]): Promise<void> {
    try {
      // Filter out web-only playlists before caching (so mobile doesn't see them)
      const playlistsToCache = playlists.filter(playlist => !playlist.isWebOnlyPlaylist);
      
      await AsyncStorage.setItem(this.ADMIN_CACHE_KEY, JSON.stringify(playlistsToCache));
      console.log('💾 Cached admin playlists:', playlistsToCache.length, '(filtered web-only)');
    } catch (error) {
      console.error('Error caching admin playlists:', error);
    }
  }

  /**
   * Refresh admin playlists in background
   */
  private async refreshAdminPlaylistsInBackground(): Promise<void> {
    if (this.isBackgroundRefreshing) {
      return; // Already refreshing, skip
    }

    this.isBackgroundRefreshing = true;
    try {
      console.log('🔄 Refreshing admin playlists in background...');
      const freshPlaylists = await adminApiService.getPlaylists();
      await this.cacheAdminPlaylistsLocally(freshPlaylists);
      console.log('✅ Background refresh completed:', freshPlaylists.length);
    } catch (error) {
      console.warn('⚠️ Background refresh failed:', error);
    } finally {
      this.isBackgroundRefreshing = false;
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
   * Get or create "Liked Songs" playlist
   */
  async getLikedSongsPlaylist(): Promise<Playlist> {
    try {
      const playlists = await this.getLocalPlaylists();
      
      // Check if "Liked Songs" playlist already exists
      let likedPlaylist = playlists.find(p => p.name === 'Liked Songs' && p.isLikedSongs === true);
      
      if (!likedPlaylist) {
        // Create "Liked Songs" playlist
        likedPlaylist = {
          id: `liked_songs_${Date.now()}`,
          name: 'Liked Songs',
          description: 'Your favorite songs',
          videos: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isLocal: true,
          isLikedSongs: true, // Special flag for liked songs playlist
          thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjU2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlMGFmOTIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IndoaXRlIj7inaTvuI88L3RleHQ+PC9zdmc+', // Heart placeholder
        };
        
        // Add to beginning of playlists array
        playlists.unshift(likedPlaylist);
        await this.cachePlaylistsLocally(playlists);
        console.log('✅ Created "Liked Songs" playlist');
      }
      
      return likedPlaylist;
    } catch (error) {
      console.error('Error getting/creating Liked Songs playlist:', error);
      throw error;
    }
  }

  /**
   * Add/remove video from Liked Songs playlist
   */
  async toggleLikedSong(video: SimplifiedVimeoVideo): Promise<boolean> {
    try {
      const likedPlaylist = await this.getLikedSongsPlaylist();
      const playlists = await this.getLocalPlaylists();
      
      // Check if video is already liked
      const isLiked = likedPlaylist.videos.some(v => v.id === video.id);
      
      if (isLiked) {
        // Remove from liked songs
        likedPlaylist.videos = likedPlaylist.videos.filter(v => v.id !== video.id);
        console.log('💔 Removed from Liked Songs:', video.name);
      } else {
        // Add to liked songs
        const playlistVideo: PlaylistVideo = {
          id: video.id,
          title: video.name || video.title || 'Untitled',
          description: video.description || '',
          thumbnail: video.thumbnail || '',
          duration: video.duration || 0,
          addedAt: new Date().toISOString(),
        };
        likedPlaylist.videos.unshift(playlistVideo); // Add to beginning
        console.log('❤️ Added to Liked Songs:', video.name);
      }
      
      // Update playlist
      likedPlaylist.updatedAt = new Date().toISOString();
      
      // Update thumbnail to first video's thumbnail if videos exist
      if (likedPlaylist.videos.length > 0) {
        likedPlaylist.thumbnail = likedPlaylist.videos[0].thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjU2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlMGFmOTIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IndoaXRlIj7inaTvuI88L3RleHQ+PC9zdmc+';
      } else {
        likedPlaylist.thumbnail = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjU2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlMGFmOTIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IndoaXRlIj7inaTvuI88L3RleHQ+PC9zdmc+';
      }
      
      // Find and update the playlist in the array
      const playlistIndex = playlists.findIndex(p => p.id === likedPlaylist.id);
      if (playlistIndex !== -1) {
        playlists[playlistIndex] = likedPlaylist;
      }
      
      await this.cachePlaylistsLocally(playlists);
      
      return !isLiked; // Return new liked state
    } catch (error) {
      console.error('Error toggling liked song:', error);
      throw error;
    }
  }

  /**
   * Check if a video is liked
   */
  async isVideoLiked(videoId: string): Promise<boolean> {
    try {
      const likedPlaylist = await this.getLikedSongsPlaylist();
      return likedPlaylist.videos.some(v => v.id === videoId);
    } catch (error) {
      console.error('Error checking if video is liked:', error);
      return false;
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

    playlists.unshift(newPlaylist); // Add to beginning for immediate display
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
      thumbnail: video.pictures?.sizes?.[0]?.link || video.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=',
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
        console.log('✅ Video removed from admin playlist via API:', playlistId);
        
        // Try to update local cache if playlist exists locally
        try {
          await this.removeVideoFromLocalPlaylist(playlistId, videoId);
        } catch (localError) {
          console.log('ℹ️ Playlist not in local cache, skipping local update');
        }
      } catch (error) {
        console.warn('⚠️ Admin API failed:', error);
        // For admin playlists, if API fails, we can't do much locally
        throw new Error('Failed to remove video from admin playlist');
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
    let playlist = playlists.find(p => p.id === playlistId);
    
    // Special handling for Liked Songs playlist - try to find by flag if ID doesn't match
    if (!playlist && (playlistId.includes('liked_songs') || playlistId.includes('user_liked_songs'))) {
      playlist = playlists.find(p => p.isLikedSongs === true);
      if (playlist) {
        console.log('🔍 Found Liked Songs playlist by flag instead of ID');
      }
    }
    
    if (!playlist) {
      console.warn('⚠️ Playlist not found in local cache, skipping local removal:', playlistId);
      console.log('📋 Available local playlist IDs:', playlists.map(p => p.id));
      return; // Don't throw error, just skip local removal
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

  /**
   * Clear all cached data (including web-only playlists)
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      await AsyncStorage.removeItem(this.ADMIN_CACHE_KEY);
      await AsyncStorage.removeItem(this.SYNC_KEY);
      await AsyncStorage.removeItem('playlists_last_refresh');
      console.log('🧹 All playlist cache cleared (web-only playlists removed from mobile)');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

// Export singleton instance
export const hybridPlaylistService = new HybridPlaylistService();
export default HybridPlaylistService;
