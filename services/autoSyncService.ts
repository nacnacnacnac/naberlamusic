import AsyncStorage from '@react-native-async-storage/async-storage';
import { hybridPlaylistService } from './hybridPlaylistService';

const ADMIN_API_BASE_URL = 'https://naberla.org';
const DEVICE_ID_KEY = 'naber_la_device_id';
const LAST_SYNC_KEY = 'naber_la_last_sync';

class AutoSyncService {
  private deviceId: string | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private onSyncCallback: (() => void) | null = null;

  /**
   * Set callback for when sync notification is received
   */
  setOnSyncCallback(callback: () => void): void {
    this.onSyncCallback = callback;
  }

  /**
   * Initialize auto sync service
   */
  async initialize(): Promise<void> {
    try {
      // Get or create device ID
      this.deviceId = await this.getOrCreateDeviceId();
      
      // Start auto sync
      this.startAutoSync();
      
      console.log('🤫 Silent AutoSyncService initialized', { deviceId: this.deviceId });
    } catch (error) {
      console.error('❌ Failed to initialize AutoSyncService:', error);
    }
  }

  /**
   * Start automatic synchronization
   */
  startAutoSync(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('🤫 Starting silent auto sync...');

    // Initial sync
    this.performSync();

    // Set up periodic sync (every 15 seconds)
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, 15000);
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Perform synchronization check
   */
  private async performSync(): Promise<void> {
    try {
      if (!this.deviceId) {
        return;
      }

      // Check if admin API is enabled
      const useAdminApi = await hybridPlaylistService.shouldUseAdminApi();
      if (!useAdminApi) {
        return;
      }

      const lastSync = await this.getLastSyncTime();

      // Get pending sync events
      const response = await fetch(`${ADMIN_API_BASE_URL}/api/notifications/pending/${this.deviceId}?lastSync=${encodeURIComponent(lastSync)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return; // Silently fail
      }

      const result = await response.json();

      if (result.success && result.data.length > 0) {
        console.log(`🤫 Silently processing ${result.data.length} sync events`);
        
        // Process sync events silently
        await this.processSyncEvents(result.data);
        
        // Update last sync time
        await this.updateLastSyncTime();
        
        // Mark events as processed
        await this.markEventsAsProcessed();
      }
    } catch (error) {
      // Silently fail - no console spam
    }
  }

  /**
   * Process sync events
   */
  private async processSyncEvents(events: any[]): Promise<void> {
    let shouldRefresh = false;
    
    for (const event of events) {
      try {
        switch (event.type) {
          case 'playlist_sync':
            await this.handlePlaylistSync(event);
            shouldRefresh = true;
            break;
          case 'video_added':
            await this.handleVideoAdded(event);
            shouldRefresh = true;
            break;
          case 'general_sync':
            await this.handleGeneralSync(event);
            shouldRefresh = true;
            break;
        }
      } catch (error) {
        // Silently fail
      }
    }
    
    // Trigger UI refresh if any sync events were processed
    if (shouldRefresh && this.onSyncCallback) {
      console.log('🔄 Triggering automatic playlist refresh');
      this.onSyncCallback();
    }
  }

  /**
   * Handle playlist sync events (SILENT - no user notification)
   */
  private async handlePlaylistSync(event: any): Promise<void> {
    console.log(`🤫 Silent playlist ${event.action}: ${event.playlist_name}`);
    
    // Silently refresh playlists from admin API
    await hybridPlaylistService.syncWithAdminApi();
  }

  /**
   * Handle video added events (SILENT - no user notification)
   */
  private async handleVideoAdded(event: any): Promise<void> {
    console.log(`🤫 Silent video change: ${event.video_title} → ${event.playlist_name}`);
    
    // Silently refresh playlists from admin API
    await hybridPlaylistService.syncWithAdminApi();
  }

  /**
   * Handle general sync events (SILENT - no user notification)
   */
  private async handleGeneralSync(event: any): Promise<void> {
    console.log(`🤫 Silent general sync: ${event.message}`);
    
    // Silently refresh playlists from admin API
    await hybridPlaylistService.syncWithAdminApi();
  }

  /**
   * Get or create device ID
   */
  private async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      
      return deviceId;
    } catch (error) {
      return `fallback_${Date.now()}`;
    }
  }

  /**
   * Get last sync time
   */
  private async getLastSyncTime(): Promise<string> {
    try {
      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return lastSync || '1970-01-01T00:00:00.000Z';
    } catch (error) {
      return '1970-01-01T00:00:00.000Z';
    }
  }

  /**
   * Update last sync time
   */
  private async updateLastSyncTime(): Promise<void> {
    try {
      const now = new Date().toISOString();
      await AsyncStorage.setItem(LAST_SYNC_KEY, now);
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Mark events as processed
   */
  private async markEventsAsProcessed(): Promise<void> {
    try {
      if (!this.deviceId) return;

      const lastSyncTime = new Date().toISOString();
      
      await fetch(`${ADMIN_API_BASE_URL}/api/notifications/mark-synced/${this.deviceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lastSyncTime
        })
      });
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Force sync now
   */
  async forceSyncNow(): Promise<void> {
    await this.performSync();
  }
}

// Export singleton instance
export const autoSyncService = new AutoSyncService();
export default AutoSyncService;
