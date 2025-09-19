import { Playlist } from '@/types/playlist';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface FirestorePlaylist extends Omit<Playlist, 'createdAt' | 'updatedAt'> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userId: string; // Owner of the playlist
}

export interface FirestoreLikedSong {
  id: string;
  userId: string;
  videoId: string;
  videoData: SimplifiedVimeoVideo;
  likedAt: Timestamp;
}

class FirestoreService {
  
  // ==================== PLAYLISTS ====================
  
  /**
   * Get user's playlists from Firestore
   */
  async getUserPlaylists(userId: string): Promise<Playlist[]> {
    try {
      
      const playlistsRef = collection(db, 'playlists');
      const q = query(
        playlistsRef,
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const playlists: Playlist[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestorePlaylist;
        playlists.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt.toDate().toISOString(),
          updatedAt: data.updatedAt.toDate().toISOString(),
        });
      });
      
      // Sort manually by updatedAt descending
      playlists.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      return playlists;
    } catch (error) {
      console.error('❌ Error getting user playlists:', error);
      throw error;
    }
  }

  /**
   * Create a new playlist in Firestore
   */
  async createPlaylist(userId: string, playlist: Omit<Playlist, 'id' | 'createdAt' | 'updatedAt'>): Promise<Playlist> {
    try {
      console.log('🔥 Creating playlist:', playlist.name);
      
      const playlistsRef = collection(db, 'playlists');
      const now = serverTimestamp();
      
      const firestorePlaylist: Omit<FirestorePlaylist, 'id'> = {
        ...playlist,
        userId,
        createdAt: now as Timestamp,
        updatedAt: now as Timestamp,
      };
      
      const docRef = await addDoc(playlistsRef, firestorePlaylist);
      
      const createdPlaylist: Playlist = {
        ...playlist,
        id: docRef.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      console.log('✅ Playlist created with ID:', docRef.id);
      return createdPlaylist;
    } catch (error) {
      console.error('❌ Error creating playlist:', error);
      throw error;
    }
  }

  /**
   * Update playlist in Firestore
   */
  async updatePlaylist(playlistId: string, updates: Partial<Playlist>): Promise<void> {
    try {
      console.log('🔥 Updating playlist:', playlistId);
      
      const playlistRef = doc(db, 'playlists', playlistId);
      const firestoreUpdates = {
        ...updates,
        updatedAt: serverTimestamp(),
      };
      
      // Remove id, createdAt from updates
      delete firestoreUpdates.id;
      delete firestoreUpdates.createdAt;
      
      await updateDoc(playlistRef, firestoreUpdates);
      console.log('✅ Playlist updated');
    } catch (error) {
      console.error('❌ Error updating playlist:', error);
      throw error;
    }
  }


  /**
   * Add video to playlist
   */
  async addVideoToPlaylist(playlistId: string, video: SimplifiedVimeoVideo): Promise<void> {
    try {
      console.log('🔥 Adding video to playlist:', playlistId, video.name);
      
      const playlistRef = doc(db, 'playlists', playlistId);
      const playlistDoc = await getDoc(playlistRef);
      
      if (!playlistDoc.exists()) {
        throw new Error('Playlist not found');
      }
      
      const playlistData = playlistDoc.data() as FirestorePlaylist;
      const currentVideos = playlistData.videos || [];
      
      // Check if video already exists
      const videoExists = currentVideos.some(v => v.id === video.id);
      if (videoExists) {
        console.log('⚠️ Video already exists in playlist');
        return;
      }
      
      // Add video
      const updatedVideos = [...currentVideos, video];
      await updateDoc(playlistRef, {
        videos: updatedVideos,
        updatedAt: serverTimestamp(),
      });
      
      console.log('✅ Video added to playlist');
    } catch (error) {
      console.error('❌ Error adding video to playlist:', error);
      throw error;
    }
  }

  /**
   * Remove video from playlist
   */
  async removeVideoFromPlaylist(playlistId: string, videoId: string): Promise<void> {
    try {
      console.log('🔥 Removing video from playlist:', playlistId, videoId);
      
      const playlistRef = doc(db, 'playlists', playlistId);
      const playlistDoc = await getDoc(playlistRef);
      
      if (!playlistDoc.exists()) {
        throw new Error('Playlist not found');
      }
      
      const playlistData = playlistDoc.data() as FirestorePlaylist;
      const currentVideos = playlistData.videos || [];
      
      // Remove video
      const updatedVideos = currentVideos.filter(v => v.id !== videoId);
      await updateDoc(playlistRef, {
        videos: updatedVideos,
        updatedAt: serverTimestamp(),
      });
      
      console.log('✅ Video removed from playlist');
    } catch (error) {
      console.error('❌ Error removing video from playlist:', error);
      throw error;
    }
  }

  // ==================== LIKED SONGS ====================

  /**
   * Get user's liked songs from Firestore
   */
  async getUserLikedSongs(userId: string, forceRefresh: boolean = false): Promise<SimplifiedVimeoVideo[]> {
    try {
      console.log('🔥 Getting liked songs for user:', userId, 'forceRefresh:', forceRefresh);
      
      const likedSongsRef = collection(db, 'likedSongs');
      const q = query(
        likedSongsRef,
        where('userId', '==', userId)
      );
      
      // Add a delay if force refresh to ensure Firestore consistency
      if (forceRefresh) {
        console.log('⏳ Force refresh - waiting for Firestore consistency...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const querySnapshot = await getDocs(q);
      const likedSongs: SimplifiedVimeoVideo[] = [];
      
      console.log('📊 Firestore query returned', querySnapshot.docs.length, 'documents');
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreLikedSong;
        console.log('📋 Found liked song in Firestore:', data.videoData.name, 'ID:', data.videoId, 'DocID:', doc.id);
        
        // Verify the document ID matches expected format
        const expectedDocId = `${userId}_${data.videoId}`;
        if (doc.id === expectedDocId) {
          likedSongs.push(data.videoData);
        } else {
          console.warn('⚠️ Mismatched document ID:', doc.id, 'expected:', expectedDocId);
        }
      });
      
      console.log('✅ Retrieved', likedSongs.length, 'liked songs from Firestore');
      console.log('📋 Liked song IDs:', likedSongs.map(s => s.id));
      return likedSongs;
    } catch (error) {
      console.error('❌ Error getting liked songs:', error);
      throw error;
    }
  }

  /**
   * Add song to liked songs
   */
  async addLikedSong(userId: string, video: SimplifiedVimeoVideo): Promise<void> {
    try {
      console.log('🔥 Adding liked song:', video.name);
      
      const likedSongId = `${userId}_${video.id}`;
      const likedSongRef = doc(db, 'likedSongs', likedSongId);
      
      const likedSong: FirestoreLikedSong = {
        id: likedSongId,
        userId,
        videoId: video.id,
        videoData: video,
        likedAt: serverTimestamp() as Timestamp,
      };
      
      await setDoc(likedSongRef, likedSong);
      console.log('✅ Liked song added');
    } catch (error) {
      console.error('❌ Error adding liked song:', error);
      throw error;
    }
  }

  /**
   * Remove song from liked songs
   */
  async removeLikedSong(userId: string, videoId: string): Promise<void> {
    try {
      console.log('🔥 Removing liked song:', videoId, 'for user:', userId);
      
      const likedSongId = `${userId}_${videoId}`;
      console.log('🗑️ Deleting document with ID:', likedSongId);
      
      const likedSongRef = doc(db, 'likedSongs', likedSongId);
      
      // Check if document exists before deleting
      const docSnap = await getDoc(likedSongRef);
      if (!docSnap.exists()) {
        console.log('⚠️ Liked song document does not exist:', likedSongId);
        return;
      }
      
      await deleteDoc(likedSongRef);
      console.log('✅ Liked song removed successfully:', likedSongId);
    } catch (error) {
      console.error('❌ Error removing liked song:', error);
      throw error;
    }
  }

  /**
   * Check if song is liked
   */
  async isVideoLiked(userId: string, videoId: string): Promise<boolean> {
    try {
      const likedSongId = `${userId}_${videoId}`;
      const likedSongRef = doc(db, 'likedSongs', likedSongId);
      const docSnap = await getDoc(likedSongRef);
      
      return docSnap.exists();
    } catch (error) {
      console.error('❌ Error checking if video is liked:', error);
      return false;
    }
  }

  /**
   * Check if a playlist is the "Liked Songs" playlist
   */
  async isLikedSongsPlaylist(playlistId: string): Promise<boolean> {
    try {
      console.log('🔍 Checking if playlist is Liked Songs:', playlistId);
      
      const playlistRef = doc(db, 'playlists', playlistId);
      const docSnap = await getDoc(playlistRef);
      
      if (!docSnap.exists()) {
        console.log('⚠️ Playlist document does not exist:', playlistId);
        return false;
      }
      
      const data = docSnap.data() as FirestorePlaylist;
      const isLikedSongs = data.isLikedSongs === true;
      
      console.log('✅ Playlist isLikedSongs check result:', { playlistId, isLikedSongs, name: data.name });
      return isLikedSongs;
    } catch (error) {
      console.error('❌ Error checking if playlist is Liked Songs:', error);
      return false;
    }
  }

  /**
   * Get or create "Liked Songs" playlist for user
   */
  async getLikedSongsPlaylist(userId: string): Promise<Playlist> {
    try {
      // First, try to find existing "Liked Songs" playlist
      const playlistsRef = collection(db, 'playlists');
      const q = query(
        playlistsRef,
        where('userId', '==', userId),
        where('isLikedSongs', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Found existing "Liked Songs" playlist
        const doc = querySnapshot.docs[0];
        const data = doc.data() as FirestorePlaylist;
        
        // Get current liked songs (force refresh for consistency)
        const likedSongs = await this.getUserLikedSongs(userId, true);
        
        console.log('🎵🎵🎵 LIKED SONGS PLAYLIST FOUND - RETURNING FRESH DATA WITH', likedSongs.length, 'SONGS 🎵🎵🎵');
        console.log('🔥🔥🔥 THIS IS THE NEW CODE - IF YOU SEE THIS, THE FIX IS ACTIVE! 🔥🔥🔥');
        
        // Return playlist with fresh liked songs data (don't update Firestore playlist)
        return {
          ...data,
          id: doc.id,
          videos: likedSongs,
          createdAt: data.createdAt.toDate().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Create new "Liked Songs" playlist
        const likedSongs = await this.getUserLikedSongs(userId, true);
        
        const likedPlaylist = await this.createPlaylist(userId, {
          name: 'Liked Songs',
          description: 'Your favorite songs',
          videos: likedSongs,
          isLocal: false,
          isLikedSongs: true,
          thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjU2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlMGFmOTIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIyNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IndoaXRlIj7inaTvuI88L3RleHQ+PC9zdmc+',
        });
        
        return likedPlaylist;
      }
    } catch (error) {
      console.error('❌ Error getting/creating Liked Songs playlist:', error);
      throw error;
    }
  }

  // ==================== REAL-TIME LISTENERS ====================

  /**
   * Listen to user's playlists changes
   */
  onPlaylistsChange(userId: string, callback: (playlists: Playlist[]) => void): () => void {
    const playlistsRef = collection(db, 'playlists');
    const q = query(
      playlistsRef,
      where('userId', '==', userId)
    );

    return onSnapshot(q, (querySnapshot) => {
      const playlists: Playlist[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestorePlaylist;
        playlists.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt.toDate().toISOString(),
          updatedAt: data.updatedAt.toDate().toISOString(),
        });
      });
      
      // Sort manually since we removed orderBy from query
      playlists.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      console.log('🔥 Playlists updated in real-time:', playlists.length);
      callback(playlists);
    });
  }

  /**
   * Listen to user's liked songs changes
   */
  onLikedSongsChange(userId: string, callback: (likedSongs: SimplifiedVimeoVideo[]) => void): () => void {
    const likedSongsRef = collection(db, 'likedSongs');
    const q = query(
      likedSongsRef,
      where('userId', '==', userId)
    );

    return onSnapshot(q, (querySnapshot) => {
      const likedSongs: SimplifiedVimeoVideo[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreLikedSong;
        likedSongs.push(data.videoData);
      });
      
      console.log('🔥 Liked songs updated in real-time:', likedSongs.length);
      callback(likedSongs);
    });
  }

  /**
   * Delete playlist
   */
  async deletePlaylist(playlistId: string): Promise<void> {
    try {
      console.log('🔥 Deleting playlist from Firestore:', playlistId);
      
      const playlistRef = doc(db, 'playlists', playlistId);
      
      // Check if document exists before deleting
      const docSnap = await getDoc(playlistRef);
      if (!docSnap.exists()) {
        console.log('⚠️ Playlist document does not exist:', playlistId);
        return;
      }
      
      await deleteDoc(playlistRef);
      
      console.log('✅ Playlist deleted from Firestore successfully');
    } catch (error) {
      console.error('❌ Error deleting playlist:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error code:', error.code);
      throw error;
    }
  }
}

export const firestoreService = new FirestoreService();
