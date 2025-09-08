export interface PlaylistVideo {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  addedAt: string;
  vimeo_id?: string; // Add vimeo_id field for cross-account video playback
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  videos: PlaylistVideo[];
  createdAt: string;
  updatedAt: string;
  thumbnail?: string; // İlk video'nun thumbnail'ı
  isAdminPlaylist?: boolean; // Admin playlist mi yoksa user playlist mi
}

export interface PlaylistService {
  // Playlist CRUD
  createPlaylist: (name: string, description?: string) => Promise<Playlist>;
  getPlaylists: () => Promise<Playlist[]>;
  getPlaylist: (id: string) => Promise<Playlist | null>;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  
  // Video operations
  addVideoToPlaylist: (playlistId: string, video: PlaylistVideo) => Promise<void>;
  removeVideoFromPlaylist: (playlistId: string, videoId: string) => Promise<void>;
  isVideoInPlaylist: (playlistId: string, videoId: string) => Promise<boolean>;
  
  // Utility
  clearAllPlaylists: () => Promise<void>;
}
