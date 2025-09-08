import { Playlist, PlaylistVideo } from '@/types/playlist';
import { SimplifiedVimeoVideo } from '@/types/vimeo';

// Admin API Base URL
const ADMIN_API_BASE_URL = 'https://naberla.org';

export interface AdminPlaylist {
  id: string;
  name: string;
  description?: string;
  videos: Array<{
    id: string;
    title: string;
    duration: number;
    thumbnail: string;
    addedAt: string;
    vimeo_id?: string; // Add vimeo_id field
  }>;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}

class AdminApiService {
  private baseUrl = ADMIN_API_BASE_URL;

  /**
   * Get all playlists from admin panel
   */
  async getPlaylists(): Promise<Playlist[]> {
    try {
      console.log('🔄 Fetching playlists from admin API...');
      
      const response = await fetch(`${this.baseUrl}/api/playlists`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch playlists');
      }

      // Convert admin format to mobile app format
      const playlists: Playlist[] = (result.playlists || result.data || []).map((adminPlaylist: AdminPlaylist) => ({
        id: adminPlaylist.id,
        name: adminPlaylist.name,
        description: adminPlaylist.description,
        videos: adminPlaylist.videos.map(video => ({
          id: video.id,
          title: video.title,
          duration: video.duration,
          thumbnail: video.thumbnail,
          addedAt: video.addedAt,
          vimeo_id: video.vimeo_id, // Include vimeo_id
        })),
        createdAt: adminPlaylist.createdAt,
        updatedAt: adminPlaylist.updatedAt,
        thumbnail: adminPlaylist.thumbnail,
      }));

      console.log(`✅ Fetched ${playlists.length} playlists from admin API`);
      return playlists;
    } catch (error) {
      console.error('❌ Error fetching playlists from admin API:', error);
      throw error;
    }
  }

  /**
   * Get a specific playlist from admin panel
   */
  async getPlaylist(id: string): Promise<Playlist | null> {
    try {
      console.log(`🔄 Fetching playlist ${id} from admin API...`);
      
      const response = await fetch(`${this.baseUrl}/api/playlists/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch playlist');
      }

      const adminPlaylist: AdminPlaylist = result.playlist || result.data;
      
      // Convert admin format to mobile app format
      const playlist: Playlist = {
        id: adminPlaylist.id,
        name: adminPlaylist.name,
        description: adminPlaylist.description,
        videos: adminPlaylist.videos.map(video => ({
          id: video.id,
          title: video.title,
          duration: video.duration,
          thumbnail: video.thumbnail,
          addedAt: video.addedAt,
        })),
        createdAt: adminPlaylist.createdAt,
        updatedAt: adminPlaylist.updatedAt,
        thumbnail: adminPlaylist.thumbnail,
      };

      console.log(`✅ Fetched playlist "${playlist.name}" from admin API`);
      return playlist;
    } catch (error) {
      console.error(`❌ Error fetching playlist ${id} from admin API:`, error);
      throw error;
    }
  }

  /**
   * Create a new playlist via admin panel
   */
  async createPlaylist(name: string, description?: string): Promise<Playlist> {
    try {
      console.log(`🔄 Creating playlist "${name}" via admin API...`);
      
      const response = await fetch(`${this.baseUrl}/api/playlists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description?.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create playlist');
      }

      const adminPlaylist: AdminPlaylist = result.playlist || result.data;
      
      // Convert admin format to mobile app format
      const playlist: Playlist = {
        id: adminPlaylist.id,
        name: adminPlaylist.name,
        description: adminPlaylist.description,
        videos: [],
        createdAt: adminPlaylist.createdAt,
        updatedAt: adminPlaylist.updatedAt,
      };

      console.log(`✅ Created playlist "${playlist.name}" via admin API`);
      return playlist;
    } catch (error) {
      console.error(`❌ Error creating playlist "${name}" via admin API:`, error);
      throw error;
    }
  }

  /**
   * Add video to playlist via admin panel
   */
  async addVideoToPlaylist(playlistId: string, video: SimplifiedVimeoVideo): Promise<void> {
    try {
      console.log(`🔄 Adding video "${video.name || video.title}" to playlist ${playlistId} via admin API...`);
      
      const response = await fetch(`${this.baseUrl}/api/playlists/${playlistId}/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: video.id,
          title: video.name || video.title || 'Unknown Video',
          duration: video.duration || 0,
          thumbnail: video.pictures?.sizes?.[0]?.link || video.thumbnail || 'https://via.placeholder.com/640x360',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to add video to playlist');
      }

      console.log(`✅ Added video "${video.name || video.title}" to playlist via admin API`);
    } catch (error) {
      console.error(`❌ Error adding video to playlist via admin API:`, error);
      throw error;
    }
  }


  /**
   * Remove video from playlist via admin panel
   */
  async removeVideoFromPlaylist(playlistId: string, videoId: string): Promise<void> {
    try {
      console.log(`🔄 Removing video ${videoId} from playlist ${playlistId} via admin API...`);
      
      const response = await fetch(`${this.baseUrl}/api/playlists/${playlistId}/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove video from playlist');
      }

      console.log(`✅ Removed video ${videoId} from playlist via admin API`);
    } catch (error) {
      console.error(`❌ Error removing video from playlist via admin API:`, error);
      throw error;
    }
  }

  /**
   * Delete playlist via admin panel
   */
  async deletePlaylist(playlistId: string): Promise<void> {
    try {
      console.log(`🔄 Deleting playlist ${playlistId} via admin API...`);
      
      const response = await fetch(`${this.baseUrl}/api/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete playlist');
      }

      console.log(`✅ Deleted playlist ${playlistId} via admin API`);
    } catch (error) {
      console.error(`❌ Error deleting playlist via admin API:`, error);
      throw error;
    }
  }

  /**
   * Test admin API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔄 Testing admin API connection...');
      
      const response = await fetch(`${this.baseUrl}/api/playlists`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const isConnected = response.ok;
      console.log(`${isConnected ? '✅' : '❌'} Admin API connection test: ${isConnected ? 'SUCCESS' : 'FAILED'}`);
      
      return isConnected;
    } catch (error) {
      console.error('❌ Admin API connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const adminApiService = new AdminApiService();
export default AdminApiService;
