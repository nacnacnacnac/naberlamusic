import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RemoteConfig {
  // Video filtering
  enableVideoFiltering: boolean;
  blockedVideoIds: string[];
  allowedVideoIds: string[];
  
  // Feature flags
  enableNewFeatures: boolean;
  maintenanceMode: boolean;
  
  // Content control
  maxVideosToShow: number;
  hidePrivateVideos: boolean;
  
  // Emergency controls
  emergencyHideAll: boolean;
  emergencyMessage?: string;
  
  // Last update
  lastUpdated: number;
}

const DEFAULT_CONFIG: RemoteConfig = {
  enableVideoFiltering: false,
  blockedVideoIds: [],
  allowedVideoIds: [],
  enableNewFeatures: true,
  maintenanceMode: false,
  maxVideosToShow: 100,
  hidePrivateVideos: true,
  emergencyHideAll: false,
  lastUpdated: Date.now(),
};

const CONFIG_STORAGE_KEY = '@naber_la_remote_config';
const CONFIG_URL = 'https://raw.githubusercontent.com/nacnacnacnac/naberla-config/main/config.json';

class RemoteConfigService {
  private config: RemoteConfig = DEFAULT_CONFIG;
  private listeners: ((config: RemoteConfig) => void)[] = [];

  async initialize(): Promise<RemoteConfig> {
    try {
      // Load cached config first
      await this.loadFromCache();
      
      // Then fetch fresh config in background
      this.fetchRemoteConfig();
      
      return this.config;
    } catch (error) {
      console.error('Error initializing remote config:', error);
      return DEFAULT_CONFIG;
    }
  }

  async loadFromCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
      if (cached) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(cached) };
        console.log('📱 Loaded cached remote config');
      }
    } catch (error) {
      console.error('Error loading cached config:', error);
    }
  }

  async fetchRemoteConfig(): Promise<void> {
    try {
      // For now, simulate a remote config fetch
      // In production, replace this with actual API call
      const simulatedRemoteConfig = await this.simulateRemoteConfigFetch();
      
      if (simulatedRemoteConfig) {
        this.config = { ...DEFAULT_CONFIG, ...simulatedRemoteConfig };
        await this.saveToCache();
        this.notifyListeners();
        console.log('🌐 Updated remote config from server');
      }
    } catch (error) {
      console.error('Error fetching remote config:', error);
    }
  }

  private async simulateRemoteConfigFetch(): Promise<Partial<RemoteConfig> | null> {
    try {
      // Try to fetch from GitHub (or any URL)
      const response = await fetch(CONFIG_URL);
      if (response.ok) {
        const remoteConfig = await response.json();
        console.log('📡 Fetched config from remote URL');
        return remoteConfig;
      }
    } catch (error) {
      console.log('⚠️ Remote fetch failed, using default config');
    }
    
    // Fallback to default config
    return {
      enableVideoFiltering: false,
      blockedVideoIds: [],
      hidePrivateVideos: true,
      maxVideosToShow: 100,
      emergencyHideAll: false,
      lastUpdated: Date.now(),
    };
  }

  private async saveToCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving config to cache:', error);
    }
  }

  getConfig(): RemoteConfig {
    return this.config;
  }

  // Video filtering methods
  shouldShowVideo(videoId: string): boolean {
    const config = this.config;
    
    // Emergency hide all
    if (config.emergencyHideAll) {
      return false;
    }
    
    // If filtering is disabled, show all
    if (!config.enableVideoFiltering) {
      return true;
    }
    
    // Check blocked list
    if (config.blockedVideoIds.includes(videoId)) {
      return false;
    }
    
    // If allowed list exists and video not in it, hide
    if (config.allowedVideoIds.length > 0 && !config.allowedVideoIds.includes(videoId)) {
      return false;
    }
    
    return true;
  }

  filterVideos<T extends { id: string }>(videos: T[]): T[] {
    const config = this.config;
    
    // Emergency hide all
    if (config.emergencyHideAll) {
      return [];
    }
    
    let filtered = videos;
    
    // Apply video filtering
    if (config.enableVideoFiltering) {
      filtered = filtered.filter(video => this.shouldShowVideo(video.id));
    }
    
    // Apply max limit
    if (config.maxVideosToShow > 0) {
      filtered = filtered.slice(0, config.maxVideosToShow);
    }
    
    return filtered;
  }

  // Feature flag methods
  isFeatureEnabled(feature: keyof RemoteConfig): boolean {
    return Boolean(this.config[feature]);
  }

  isMaintenanceMode(): boolean {
    return this.config.maintenanceMode;
  }

  getEmergencyMessage(): string | undefined {
    return this.config.emergencyMessage;
  }

  // Listener methods
  addListener(listener: (config: RemoteConfig) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (config: RemoteConfig) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.config));
  }

  // Manual refresh
  async refresh(): Promise<void> {
    await this.fetchRemoteConfig();
  }

  // Emergency controls (for testing)
  async setEmergencyHideAll(hide: boolean, message?: string): Promise<void> {
    this.config.emergencyHideAll = hide;
    this.config.emergencyMessage = message;
    await this.saveToCache();
    this.notifyListeners();
  }

  async blockVideo(videoId: string): Promise<void> {
    if (!this.config.blockedVideoIds.includes(videoId)) {
      this.config.blockedVideoIds.push(videoId);
      this.config.enableVideoFiltering = true;
      await this.saveToCache();
      this.notifyListeners();
    }
  }

  async unblockVideo(videoId: string): Promise<void> {
    this.config.blockedVideoIds = this.config.blockedVideoIds.filter(id => id !== videoId);
    await this.saveToCache();
    this.notifyListeners();
  }
}

export const remoteConfigService = new RemoteConfigService();
export default remoteConfigService;
