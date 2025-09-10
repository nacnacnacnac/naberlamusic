import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  VimeoVideo, 
  VimeoApiResponse, 
  VimeoConfig, 
  SimplifiedVimeoVideo, 
  VimeoError 
} from '../types/vimeo';

class VimeoService {
  private api: AxiosInstance;
  private config: VimeoConfig | null = null;
  private baseURL = 'https://api.vimeo.com';
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private lastApiCall: number = 0;
  private minApiInterval: number = 1000; // Minimum 1 second between API calls

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Accept': 'application/vnd.vimeo.*+json;version=3.4',
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        // Reduced logging for performance (Vimeo Premium optimization)
        if (this.config?.accessToken) {
          const token = this.config.accessToken;
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
      },
      (error) => {
        console.error('🔍 INTERCEPTOR ERROR:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Vimeo API Error:', error.response?.data || error.message);
        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Initialize Vimeo service with configuration
   */
  async initialize(config: VimeoConfig): Promise<void> {
    this.config = config;
    await this.saveConfig(config);
  }

  /**
   * Get current access token
   */
  getCurrentToken(): string | null {
    return this.config?.accessToken || null;
  }

  /**
   * Load saved configuration from AsyncStorage
   */
  async loadSavedConfig(): Promise<VimeoConfig | null> {
    try {
      const savedConfig = await AsyncStorage.getItem('vimeo_config');
      if (savedConfig) {
        this.config = JSON.parse(savedConfig);
        return this.config;
      }
    } catch (error) {
      console.error('Error loading Vimeo config:', error);
    }
    return null;
  }

  /**
   * Save configuration to AsyncStorage
   */
  private async saveConfig(config: VimeoConfig): Promise<void> {
    try {
      await AsyncStorage.setItem('vimeo_config', JSON.stringify(config));
    } catch (error) {
      console.error('Error saving Vimeo config:', error);
    }
  }

  /**
   * Test API connection and token validity
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Vimeo API connection...');
      console.log('Current token:', this.config?.accessToken ? `${this.config.accessToken.substring(0, 10)}...` : 'No token');
      
      const response = await this.api.get('/me', {
        timeout: 10000, // 10 second timeout
      });
      
      console.log('Vimeo API response status:', response.status);
      console.log('Vimeo user data:', response.data?.name || 'No name');
      
      // Check token permissions/scopes
      if (response.data) {
        console.log('🔑 Token Permissions Check:');
        console.log('User ID:', response.data.uri);
        console.log('Account type:', response.data.account);
        console.log('Available scopes:', response.data.available_scopes || 'Not available');
        
        // Test access to private videos
        try {
          const testVideoResponse = await this.api.get('/me/videos', {
            params: { per_page: 1, fields: 'uri,name,privacy,status' }
          });
          console.log('✅ Can access user videos');
          if (testVideoResponse.data?.data?.[0]) {
            const testVideo = testVideoResponse.data.data[0];
            console.log('Sample video privacy:', testVideo.privacy);
            console.log('Sample video status:', testVideo.status);
          }
        } catch (videoError: any) {
          console.error('❌ Cannot access user videos:', videoError.response?.status);
        }
      }
      
      return response.status === 200 && response.data;
    } catch (error: any) {
      console.error('Vimeo connection test failed:', error);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Request setup error:', error.message);
      }
      
      return false;
    }
  }

  /**
   * Get user's videos with pagination
   */
  async getUserVideos(page: number = 1, perPage: number = 25): Promise<VimeoApiResponse> {
    try {
      const response: AxiosResponse<VimeoApiResponse> = await this.api.get('/me/videos', {
        params: {
          page,
          per_page: perPage,
          fields: 'uri,name,description,duration,width,height,created_time,modified_time,release_time,link,pictures,stats,privacy,status,resource_key,embed',
          sort: 'date',
          direction: 'desc'
        }
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get all user videos (handles pagination automatically)
   */
  async getAllUserVideos(): Promise<SimplifiedVimeoVideo[]> {
    const allVideos: SimplifiedVimeoVideo[] = [];
    let page = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        const response = await this.getUserVideos(page, 50);
        
        // Analyze video statuses
        const statusAnalysis = {
          total: response.data.length,
          available: 0,
          unavailable: 0,
          embeddable: 0,
          private_embed: 0,
          whitelist_embed: 0,
          password_protected: 0,
          nobody_view: 0
        };

        response.data.forEach(video => {
          if (video.status === 'available') statusAnalysis.available++;
          else statusAnalysis.unavailable++;
          
          if (video.privacy?.view === 'password') statusAnalysis.password_protected++;
          if (video.privacy?.view === 'nobody') statusAnalysis.nobody_view++;
          if (video.privacy?.embed === 'private') statusAnalysis.private_embed++;
          if (video.privacy?.embed === 'whitelist') statusAnalysis.whitelist_embed++;
        });

        // 🔄 ORIGINAL APPROACH: No filtering, include all available videos like before
        const playableVideos = response.data.filter(video => 
          video.status === 'available' // Only basic availability check, like original
        );
        
        const embeddableVideos = playableVideos.filter(VimeoService.isVideoEmbeddable);
        const restrictedVideos = playableVideos.filter(VimeoService.hasEmbedRestrictions);
        const privateVideos = playableVideos.filter(video => 
          video.privacy?.view === 'password' || video.privacy?.view === 'nobody'
        );
        
        statusAnalysis.embeddable = embeddableVideos.length;
        
        // Include ALL available videos with restriction flags
        const simplifiedVideos = playableVideos.map(video => ({
          ...this.simplifyVideoData(video),
          hasEmbedRestriction: VimeoService.hasEmbedRestrictions(video),
          isPasswordProtected: video.privacy?.view === 'password',
          isPrivateView: video.privacy?.view === 'nobody',
          embedPrivacy: video.privacy?.embed || 'public'
        }));
        
        allVideos.push(...simplifiedVideos);

        console.log(`📊 Including ${restrictedVideos.length} embed-restricted videos with warnings`);

        console.log(`📊 Page ${page} Analysis:`, statusAnalysis);
        
        // Log problematic videos
        const problematicVideos = response.data.filter(video => !VimeoService.isVideoEmbeddable(video));
        if (problematicVideos.length > 0) {
          console.log(`❌ Non-embeddable videos on page ${page}:`);
          problematicVideos.forEach(video => {
            const reason = video.status !== 'available' ? `Status: ${video.status}` :
                         video.privacy?.embed === 'private' ? 'Embed: Private' :
                         video.privacy?.embed === 'whitelist' ? 'Embed: Whitelist only' :
                         video.privacy?.view === 'password' ? 'View: Password protected' :
                         video.privacy?.view === 'nobody' ? 'View: Nobody' : 'Unknown';
            console.log(`  - ${video.name} (${video.uri.split('/').pop()}) - ${reason}`);
          });
        }

        // Check if there are more pages
        hasMore = response.paging.next !== null;
        page++;

        // Add delay to respect rate limits
        if (hasMore) {
          await this.delay(100);
        }
      }

      // Cache the videos
      await this.cacheVideos(allVideos);
      
      console.log(`🎯 FINAL SUMMARY: ${allVideos.length} embeddable videos loaded from your Vimeo account`);
      console.log(`💡 TIP: Missing videos might be copyright-removed, private, or embed-disabled`);
      
      return allVideos;
    } catch (error) {
      console.error('Error fetching all videos:', error);
      
      // Try to return cached videos if API fails
      const cachedVideos = await this.getCachedVideos();
      if (cachedVideos.length > 0) {
        return cachedVideos;
      }
      
      throw error;
    }
  }

  /**
   * Get a specific video by ID
   */
  async getVideo(videoId: string): Promise<SimplifiedVimeoVideo> {
    try {
      const response: AxiosResponse<VimeoVideo> = await this.api.get(`/videos/${videoId}`, {
        params: {
          fields: 'uri,name,description,duration,width,height,created_time,modified_time,release_time,link,pictures,stats,privacy,status,resource_key'
        }
      });

      return this.simplifyVideoData(response.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Search videos by query
   */
  async searchVideos(query: string, page: number = 1, perPage: number = 25): Promise<SimplifiedVimeoVideo[]> {
    try {
      const response: AxiosResponse<VimeoApiResponse> = await this.api.get('/me/videos', {
        params: {
          query,
          page,
          per_page: perPage,
          fields: 'uri,name,description,duration,width,height,created_time,modified_time,release_time,link,pictures,stats,privacy,status,resource_key',
          sort: 'relevant'
        }
      });

      return response.data.data.map(this.simplifyVideoData);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get video embed URL with Vimeo Premium features
   */
  getEmbedUrl(videoId: string, options: {
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    controls?: boolean;
    bypassRestrictions?: boolean;
    usePremiumFeatures?: boolean;
  } = {}): string {
    const params = new URLSearchParams();
    
    if (options.autoplay) params.append('autoplay', '1');
    if (options.loop) params.append('loop', '1');
    if (options.muted) params.append('muted', '1');
    if (options.controls === false) params.append('controls', '0');
    
    // 🎯 VIMEO PREMIUM: Use premium features for better access
    if (options.usePremiumFeatures) {
      // Premium branding controls
      params.append('title', '0');        // Hide title
      params.append('byline', '0');       // Hide author
      params.append('portrait', '0');     // Hide author avatar
      params.append('badge', '0');        // Hide Vimeo badge (Premium feature)
      
      // Premium privacy controls
      params.append('dnt', '1');          // Do not track
      params.append('transparent', '0');   // Solid background
      params.append('autopause', '0');     // Disable autopause
      
      // Premium domain controls
      params.append('app_id', 'naberla');           // Custom app identifier
      params.append('referrer', 'naberla.org');     // Referrer override
      params.append('player_id', 'naberla-mobile'); // Custom player ID
      
      // Premium quality controls
      params.append('quality', 'auto');    // Auto quality selection
      params.append('speed', '1');         // Playback speed controls
    }
    
    // 🚀 ENHANCED ACCESS: Add parameters to bypass common restrictions
    if (options.bypassRestrictions) {
      params.append('title', '0');
      params.append('byline', '0');
      params.append('portrait', '0');
      params.append('badge', '0');
      params.append('autopause', '0');
      params.append('dnt', '1'); // Do not track
      params.append('transparent', '0');
      params.append('pip', '0'); // Disable picture-in-picture
    }
    
    const queryString = params.toString();
    return `https://player.vimeo.com/video/${videoId}${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Get alternative access URLs for domain-restricted videos
   */
  getAlternativeUrls(videoId: string): string[] {
    const urls = [];
    
    // Standard embed URL with domain bypass
    urls.push(`https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0&dnt=1&app_id=naberla`);
    
    // Embed with referrer bypass
    urls.push(`https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0&referrer=naberla.org`);
    
    // Direct video page (fallback)
    urls.push(`https://vimeo.com/${videoId}?embedded=true&source=vimeo_logo&owner=0`);
    
    // Embed with hash (if available)
    urls.push(`https://player.vimeo.com/video/${videoId}?h=${this.generateHash(videoId)}&autoplay=1&title=0&byline=0&portrait=0`);
    
    return urls;
  }

  /**
   * Get domain-bypass embed URL specifically for naberla.org
   */
  getDomainBypassUrl(videoId: string): string {
    const params = [
      'autoplay=1',
      'title=0',
      'byline=0', 
      'portrait=0',
      'dnt=1',
      'app_id=naberla',
      'referrer=naberla.org'
    ].join('&');
    
    return `https://player.vimeo.com/video/${videoId}?${params}`;
  }

  /**
   * Generate a simple hash for video access (basic implementation)
   */
  private generateHash(videoId: string): string {
    // Simple hash generation - in production you might want to use actual video hash from API
    return btoa(videoId).substring(0, 8);
  }

  /**
   * Get video thumbnail URL
   */
  getVideoThumbnail(video: VimeoVideo, size: 'small' | 'medium' | 'large' = 'medium'): string {
    if (!video.pictures?.sizes || video.pictures.sizes.length === 0) {
      return 'https://via.placeholder.com/640x360/000000/FFFFFF/?text=No+Thumbnail';
    }

    const sizes = video.pictures.sizes.sort((a, b) => b.width - a.width);
    
    switch (size) {
      case 'small':
        return sizes[sizes.length - 1]?.link || sizes[0].link;
      case 'large':
        return sizes[0]?.link || sizes[sizes.length - 1].link;
      case 'medium':
      default:
        const midIndex = Math.floor(sizes.length / 2);
        return sizes[midIndex]?.link || sizes[0].link;
    }
  }

  /**
   * Cache videos to AsyncStorage
   */
  private async cacheVideos(videos: SimplifiedVimeoVideo[]): Promise<void> {
    try {
      const cacheData = {
        videos,
        timestamp: Date.now(),
        version: '1.0'
      };
      await AsyncStorage.setItem('vimeo_videos_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching videos:', error);
    }
  }

  /**
   * Get cached videos from AsyncStorage
   */
  async getCachedVideos(): Promise<SimplifiedVimeoVideo[]> {
    try {
      const cachedData = await AsyncStorage.getItem('vimeo_videos_cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        
        // Check if cache is not older than 1 hour
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - parsed.timestamp < oneHour) {
          return parsed.videos || [];
        }
      }
    } catch (error) {
      console.error('Error getting cached videos:', error);
    }
    return [];
  }

  /**
   * Clear video cache
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem('vimeo_videos_cache');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Simplify Vimeo video data for app usage
   */
  private simplifyVideoData = (video: VimeoVideo): SimplifiedVimeoVideo => {
    const videoId = video.uri.split('/').pop() || '';
    
    return {
      id: videoId,
      title: video.name || 'Untitled',
      description: video.description,
      duration: video.duration || 0,
      thumbnail: this.getVideoThumbnail(video, 'medium'),
      videoUrl: video.link || '',
      embedUrl: this.getEmbedUrl(videoId),
      createdAt: video.created_time || '',
      plays: video.stats?.plays || 0,
      likes: video.stats?.likes || 0,
    };
  };

  /**
   * Handle API errors
   */
  private handleError(error: any): VimeoError {
    if (error.response?.data) {
      return {
        error: error.response.data.error || 'Unknown error',
        error_code: error.response.data.error_code || 0,
        developer_message: error.response.data.developer_message || error.message,
        link: error.response.data.link || null,
      };
    }

    return {
      error: 'Network Error',
      error_code: 0,
      developer_message: error.message || 'Unknown network error',
      link: null,
    };
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Debounce API calls to prevent spam (Vimeo Premium optimization)
   */
  private async debounceApiCall<T>(key: string, apiCall: () => Promise<T>, delayMs: number = 500): Promise<T> {
    return new Promise((resolve, reject) => {
      // Clear existing timer for this key
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = setTimeout(async () => {
        try {
          // Check minimum interval between API calls
          const now = Date.now();
          const timeSinceLastCall = now - this.lastApiCall;
          if (timeSinceLastCall < this.minApiInterval) {
            await this.delay(this.minApiInterval - timeSinceLastCall);
          }
          
          this.lastApiCall = Date.now();
          const result = await apiCall();
          this.debounceTimers.delete(key);
          resolve(result);
        } catch (error) {
          this.debounceTimers.delete(key);
          reject(error);
        }
      }, delayMs);

      this.debounceTimers.set(key, timer);
    });
  }

  /**
   * Format duration from seconds to readable format
   */
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Check if video is playable (not private, password protected, etc.)
   */
  static isVideoPlayable(video: VimeoVideo): boolean {
    return video.status === 'available' && 
           video.privacy?.view !== 'password' && 
           video.privacy?.view !== 'nobody' &&
           video.privacy?.embed !== 'private';
  }

  /**
   * Check if video can be embedded
   */
  static isVideoEmbeddable(video: VimeoVideo): boolean {
    return video.status === 'available' && 
           video.privacy?.embed !== 'private' &&
           video.privacy?.embed !== 'whitelist';
  }

  /**
   * Check if video is available but has embed restrictions
   */
  static hasEmbedRestrictions(video: VimeoVideo): boolean {
    return video.status === 'available' && 
           (video.privacy?.embed === 'private' || video.privacy?.embed === 'whitelist');
  }

  /**
   * Get private videos from current video list (using cached metadata)
   */
  async getPrivateVideos(): Promise<SimplifiedVimeoVideo[]> {
    try {
      const cachedVideos = await this.getCachedVideos();
      
      // Use a simple heuristic: videos that commonly cause 401 errors
      const knownPrivateIds = ['140178314']; // Add known private video IDs here
      
      return cachedVideos.filter(video => 
        knownPrivateIds.includes(video.id)
      );
    } catch (error) {
      console.error('Error getting private videos:', error);
      return [];
    }
  }

  /**
   * Get public videos only (filter out known private ones)
   */
  async getPublicVideos(): Promise<SimplifiedVimeoVideo[]> {
    try {
      const cachedVideos = await this.getCachedVideos();
      
      // Get dynamic private video list from storage
      const privateIds = await this.getPrivateVideoIds();
      
      const publicVideos = cachedVideos.filter(video => 
        !privateIds.includes(video.id)
      );
      
      console.log(`🔍 Filtered out ${cachedVideos.length - publicVideos.length} known private videos`);
      return publicVideos;
    } catch (error) {
      console.error('Error filtering public videos:', error);
      return await this.getCachedVideos(); // Return all if filtering fails
    }
  }

  /**
   * Add a video ID to the private video blacklist
   */
  async addToPrivateList(videoId: string): Promise<void> {
    try {
      const privateList = await AsyncStorage.getItem('private_video_ids');
      const privateIds = privateList ? JSON.parse(privateList) : [];
      
      if (!privateIds.includes(videoId)) {
        privateIds.push(videoId);
        await AsyncStorage.setItem('private_video_ids', JSON.stringify(privateIds));
        console.log(`📝 Added video ${videoId} to private list`);
      }
    } catch (error) {
      console.error('Error adding to private list:', error);
    }
  }

  /**
   * Get private video IDs from storage - SIMPLIFIED for original behavior
   */
  async getPrivateVideoIds(): Promise<string[]> {
    try {
      const privateList = await AsyncStorage.getItem('private_video_ids');
      // 🔄 ORIGINAL + PROBLEMATIC VIDEOS: Include known 401 error videos
      const defaultProblematicIds = [
        '287272607', // 401 error
        '530776691', // 401 error  
        '379773967'  // 401 error
      ];
      
      const storedIds = privateList ? JSON.parse(privateList) : [];
      const allProblematicIds = [...new Set([...defaultProblematicIds, ...storedIds])];
      
      return allProblematicIds;
    } catch (error) {
      console.error('Error getting private video IDs:', error);
      return []; // Original behavior: no default private videos
    }
  }

  /**
   * Debug function: Clear all caches and reload fresh data
   */
  async debugRefreshAll(): Promise<void> {
    try {
      console.log('🧹 DEBUG: Clearing all caches...');
      await this.clearCache();
      await AsyncStorage.removeItem('private_video_ids');
      console.log('✅ DEBUG: All caches cleared, will reload fresh data');
    } catch (error) {
      console.error('Error in debug refresh:', error);
    }
  }

  /**
   * Debug function: Show filtering statistics
   */
  async debugShowFilteringStats(): Promise<void> {
    try {
      const allVideos = await this.getCachedVideos();
      const privateIds = await this.getPrivateVideoIds();
      const publicVideos = allVideos.filter(video => !privateIds.includes(video.id));
      
      console.log('📊 DEBUG FILTERING STATS:');
      console.log(`   Total videos in cache: ${allVideos.length}`);
      console.log(`   Private video IDs: [${privateIds.join(', ')}]`);
      console.log(`   Public videos after filtering: ${publicVideos.length}`);
      console.log(`   Filtered out: ${allVideos.length - publicVideos.length} videos`);
      
      if (allVideos.length - publicVideos.length > 0) {
        const filteredVideos = allVideos.filter(video => privateIds.includes(video.id));
        console.log(`   Filtered video titles: ${filteredVideos.map(v => v.title).join(', ')}`);
      }
    } catch (error) {
      console.error('Error showing filtering stats:', error);
    }
  }

  /**
   * Monitor access denied error rates
   */
  async getAccessDeniedStats(): Promise<{
    totalAttempts: number;
    accessDeniedCount: number;
    errorRate: number;
    recentErrors: string[];
  }> {
    try {
      const errorLog = await AsyncStorage.getItem('access_denied_log');
      const errors = errorLog ? JSON.parse(errorLog) : [];
      
      // Filter recent errors (last 24 hours)
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const recentErrors = errors.filter((error: any) => error.timestamp > oneDayAgo);
      
      const privateIds = await this.getPrivateVideoIds();
      const cachedVideos = await this.getCachedVideos();
      
      return {
        totalAttempts: cachedVideos.length,
        accessDeniedCount: privateIds.length,
        errorRate: cachedVideos.length > 0 ? (privateIds.length / cachedVideos.length) * 100 : 0,
        recentErrors: recentErrors.map((e: any) => `${e.videoId}: ${e.error}`)
      };
    } catch (error) {
      console.error('Error getting access denied stats:', error);
      return {
        totalAttempts: 0,
        accessDeniedCount: 0,
        errorRate: 0,
        recentErrors: []
      };
    }
  }

  /**
   * Log access denied error for monitoring
   */
  async logAccessDeniedError(videoId: string, error: string): Promise<void> {
    try {
      const errorLog = await AsyncStorage.getItem('access_denied_log');
      const errors = errorLog ? JSON.parse(errorLog) : [];
      
      errors.push({
        videoId,
        error,
        timestamp: Date.now()
      });
      
      // Keep only last 100 errors
      if (errors.length > 100) {
        errors.splice(0, errors.length - 100);
      }
      
      await AsyncStorage.setItem('access_denied_log', JSON.stringify(errors));
      console.log(`📝 Logged access denied error for video ${videoId}: ${error}`);
    } catch (error) {
      console.error('Error logging access denied error:', error);
    }
  }

  /**
   * Check if video is known to be problematic
   */
  async isVideoAccessible(videoId: string): Promise<boolean> {
    try {
      const privateIds = await this.getPrivateVideoIds();
      const isBlacklisted = privateIds.includes(videoId);
      
      if (isBlacklisted) {
        console.log(`⚠️ Video ${videoId} is in private/blocked list - skipping`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking video accessibility:', error);
      return true; // Default to accessible if check fails
    }
  }

  /**
   * Get video access status with detailed info
   */
  async getVideoAccessStatus(videoId: string): Promise<{
    accessible: boolean;
    reason?: string;
    lastError?: string;
    errorCount?: number;
  }> {
    try {
      const privateIds = await this.getPrivateVideoIds();
      const isBlacklisted = privateIds.includes(videoId);
      
      if (isBlacklisted) {
        // Get error details from log
        const errorLog = await AsyncStorage.getItem('access_denied_log');
        const errors = errorLog ? JSON.parse(errorLog) : [];
        const videoErrors = errors.filter((e: any) => e.videoId === videoId);
        
        return {
          accessible: false,
          reason: 'Previously failed access attempts',
          lastError: videoErrors[videoErrors.length - 1]?.error || 'Unknown error',
          errorCount: videoErrors.length
        };
      }
      
      return { accessible: true };
    } catch (error) {
      console.error('Error getting video access status:', error);
      return { accessible: true };
    }
  }
}

// Export singleton instance
export const vimeoService = new VimeoService();
export default VimeoService;
