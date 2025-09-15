import { Platform } from 'react-native';
import { Playlist } from '@/types/playlist';

// Web-only playlist service for naberla.org API
class WebOnlyPlaylistService {
  private readonly WEB_API_BASE_URL = 'https://naberla.org';

  /**
   * Get web-only playlists (only works on web platform)
   */
  async getWebOnlyPlaylists(): Promise<Playlist[]> {
    // Only work on web platform
    if (Platform.OS !== 'web') {
      console.log('🚫 Web-only playlists are disabled on mobile platforms');
      return [];
    }

    try {
      console.log('🌐 Fetching web-only playlists from naberla.org API...');
      
      const response = await fetch(`${this.WEB_API_BASE_URL}/api/web-playlists`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Web-only playlists fetched:', data.length);

      // Transform to our playlist format
      const webPlaylists: Playlist[] = data.map((playlist: any) => ({
        id: `web_${playlist.id}`,
        name: `🌐 ${playlist.name}`, // Add web indicator
        description: playlist.description,
        videos: playlist.videos || [],
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
        thumbnail: playlist.thumbnail,
        isWebOnlyPlaylist: true, // Special flag
      }));

      return webPlaylists;
    } catch (error) {
      console.error('❌ Error fetching web-only playlists:', error);
      return [];
    }
  }

  /**
   * Test if web-only API is accessible
   */
  async testWebOnlyConnection(): Promise<boolean> {
    if (Platform.OS !== 'web') {
      return false;
    }

    try {
      const response = await fetch(`${this.WEB_API_BASE_URL}/api/web-playlists/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('❌ Web-only API connection test failed:', error);
      return false;
    }
  }
}

export const webOnlyPlaylistService = new WebOnlyPlaylistService();
