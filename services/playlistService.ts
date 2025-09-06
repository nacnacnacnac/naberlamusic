import AsyncStorage from '@react-native-async-storage/async-storage';
import { Playlist, PlaylistVideo } from '@/types/playlist';
import { SimplifiedVimeoVideo } from '@/types/vimeo';

class PlaylistService {
  private readonly STORAGE_KEY = 'naber_la_playlists';

  /**
   * Get all playlists
   */
  async getPlaylists(): Promise<Playlist[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting playlists:', error);
      return [];
    }
  }

  /**
   * Get a specific playlist by ID
   */
  async getPlaylist(id: string): Promise<Playlist | null> {
    try {
      const playlists = await this.getPlaylists();
      return playlists.find(p => p.id === id) || null;
    } catch (error) {
      console.error('Error getting playlist:', error);
      return null;
    }
  }

  /**
   * Create a new playlist
   */
  async createPlaylist(name: string, description?: string): Promise<Playlist> {
    try {
      const playlists = await this.getPlaylists();
      
      const newPlaylist: Playlist = {
        id: this.generateId(),
        name: name.trim(),
        description: description?.trim(),
        videos: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      playlists.push(newPlaylist);
      await this.savePlaylists(playlists);
      
      console.log('Created playlist:', newPlaylist.name);
      return newPlaylist;
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  /**
   * Update an existing playlist
   */
  async updatePlaylist(id: string, updates: Partial<Playlist>): Promise<void> {
    try {
      const playlists = await this.getPlaylists();
      const index = playlists.findIndex(p => p.id === id);
      
      if (index === -1) {
        throw new Error('Playlist not found');
      }

      playlists[index] = {
        ...playlists[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await this.savePlaylists(playlists);
      console.log('Updated playlist:', id);
    } catch (error) {
      console.error('Error updating playlist:', error);
      throw error;
    }
  }

  /**
   * Delete a playlist
   */
  async deletePlaylist(id: string): Promise<void> {
    try {
      const playlists = await this.getPlaylists();
      const filteredPlaylists = playlists.filter(p => p.id !== id);
      
      await this.savePlaylists(filteredPlaylists);
      console.log('Deleted playlist:', id);
    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw error;
    }
  }

  /**
   * Add a video to playlist
   */
  async addVideoToPlaylist(playlistId: string, video: SimplifiedVimeoVideo): Promise<void> {
    try {
      const playlists = await this.getPlaylists();
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

      await this.savePlaylists(playlists);
      console.log('Added video to playlist:', video.title, '→', playlist.name);
    } catch (error) {
      console.error('Error adding video to playlist:', error);
      throw error;
    }
  }

  /**
   * Remove a video from playlist
   */
  async removeVideoFromPlaylist(playlistId: string, videoId: string): Promise<void> {
    try {
      const playlists = await this.getPlaylists();
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

      await this.savePlaylists(playlists);
      console.log('Removed video from playlist:', videoId, '→', playlist.name);
    } catch (error) {
      console.error('Error removing video from playlist:', error);
      throw error;
    }
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
      console.log('Cleared all playlists');
    } catch (error) {
      console.error('Error clearing playlists:', error);
      throw error;
    }
  }

  /**
   * Save playlists to AsyncStorage
   */
  private async savePlaylists(playlists: Playlist[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(playlists));
    } catch (error) {
      console.error('Error saving playlists:', error);
      throw error;
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
export const playlistService = new PlaylistService();
export default PlaylistService;
