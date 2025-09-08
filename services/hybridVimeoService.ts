/**
 * Hybrid Vimeo Service
 * Uses backend tokens when available, falls back to local token
 */

import { tokenService } from './tokenService';
import { vimeoService } from './vimeoService';
import { VimeoConfig } from '@/types/vimeo';

class HybridVimeoService {
  private useBackendTokens: boolean = false;
  private isInitialized: boolean = false;

  /**
   * Initialize hybrid service
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing Hybrid Vimeo Service...');

      // Check if we should use backend tokens
      const useBackend = process.env.EXPO_PUBLIC_USE_BACKEND_TOKENS === 'true' ||
                        require('../app.json').expo.extra?.EXPO_PUBLIC_USE_BACKEND_TOKENS === 'true';

      this.useBackendTokens = useBackend;
      console.log('Backend tokens enabled:', this.useBackendTokens);

      if (this.useBackendTokens) {
        // Initialize token service for backend
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 
                          require('../app.json').expo.extra?.EXPO_PUBLIC_BACKEND_URL || 
                          'https://naberla.org';

        const appId = process.env.EXPO_PUBLIC_APP_ID || 
                     require('../app.json').expo.extra?.EXPO_PUBLIC_APP_ID || 
                     'naber-la-mobile';

        tokenService.initialize({
          backendUrl,
          appId,
        });

        console.log('🌐 Backend token service initialized');
        console.log('Backend URL:', backendUrl);
        console.log('App ID:', appId);

        // Test backend connection
        try {
          const token = await tokenService.getValidToken();
          console.log('✅ Backend token test successful');
          
          // Test token validity directly with Vimeo API
          const isTokenValid = await tokenService.testTokenValidity(token);
          if (!isTokenValid) {
            throw new Error('Backend token is invalid according to Vimeo API');
          }
          
          // Initialize vimeo service with backend token
          const config: VimeoConfig = {
            accessToken: token,
            userId: 'backend-user',
          };
          await vimeoService.initialize(config);
          
        } catch (backendError) {
          console.warn('⚠️ Backend token failed, falling back to local token');
          console.warn('Backend error:', backendError);
          
          // Fallback to local token
          await this.initializeWithLocalToken();
        }
      } else {
        // Use local token directly
        await this.initializeWithLocalToken();
      }

      this.isInitialized = true;
      console.log('🎉 Hybrid Vimeo Service initialized successfully');

    } catch (error) {
      console.error('💥 Hybrid Vimeo Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize with local token (fallback)
   */
  private async initializeWithLocalToken(): Promise<void> {
    console.log('📱 Using local token configuration');

    const localToken = process.env.EXPO_PUBLIC_VIMEO_ACCESS_TOKEN || 
                      require('../app.json').expo.extra?.EXPO_PUBLIC_VIMEO_ACCESS_TOKEN;

    if (!localToken || localToken === 'your_new_vimeo_token_here') {
      throw new Error('Local Vimeo token not configured');
    }

    const config: VimeoConfig = {
      accessToken: localToken,
      userId: 'local-user',
    };

    await vimeoService.initialize(config);
    console.log('✅ Local token initialized');
  }

  /**
   * Get current access token (backend or local)
   */
  async getCurrentToken(): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.useBackendTokens) {
      try {
        return await tokenService.getValidToken();
      } catch (error) {
        console.warn('⚠️ Backend token failed, using vimeo service token');
        return vimeoService.getCurrentToken();
      }
    } else {
      return vimeoService.getCurrentToken();
    }
  }

  /**
   * Test connection with current token
   */
  async testConnection(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await vimeoService.testConnection();
  }

  /**
   * Get all user videos
   */
  async getAllUserVideos() {
    console.log('🔍 DEBUG: hybridVimeoService.getAllUserVideos() called');
    console.log('🔍 DEBUG: isInitialized?', this.isInitialized);
    console.log('🔍 DEBUG: useBackendTokens?', this.useBackendTokens);
    
    if (!this.isInitialized) {
      console.log('🔍 DEBUG: Not initialized, calling initialize()');
      await this.initialize();
    }

    // If using backend tokens, refresh token before API call
    console.log('🔍 DEBUG: useBackendTokens?', this.useBackendTokens);
    if (this.useBackendTokens) {
      console.log('🔍 DEBUG: Using backend tokens - will update vimeoService');
      try {
        const freshToken = await tokenService.getValidToken();
        console.log('🔄 FORCE updating VimeoService with backend token:', freshToken.substring(0, 15) + '...');
        
        // Test token validity before using it
        const isTokenValid = await tokenService.testTokenValidity(freshToken);
        if (!isTokenValid) {
          throw new Error('Fresh backend token is invalid according to Vimeo API');
        }
        console.log('✅ Backend token validated successfully');
        
        // FORCE update vimeo service config
        const config: VimeoConfig = {
          accessToken: freshToken,
          userId: 'backend-user',
        };
        
        // Directly set the config to ensure it's updated
        console.log('🔍 DEBUG: Before force update - vimeoService.config:', (vimeoService as any).config?.accessToken?.substring(0, 15));
        (vimeoService as any).config = config;
        console.log('🔍 DEBUG: After force update - vimeoService.config:', (vimeoService as any).config?.accessToken?.substring(0, 15));
        await vimeoService.initialize(config);
        console.log('🔍 DEBUG: After initialize - vimeoService.config:', (vimeoService as any).config?.accessToken?.substring(0, 15));
        
        console.log('✅ VimeoService FORCE updated successfully');
      } catch (error) {
        console.warn('⚠️ Token refresh/validation failed, using existing token');
        console.warn('Error details:', error);
      }
    } else {
      console.log('🔍 DEBUG: NOT using backend tokens - using local token');
    }

    console.log('🔍 DEBUG: About to call vimeoService.getAllUserVideos()');
    const result = await vimeoService.getAllUserVideos();
    console.log('🔍 DEBUG: vimeoService.getAllUserVideos() completed, got', result.length, 'videos');
    return result;
  }

  /**
   * Get service status info
   */
  getServiceInfo(): {
    useBackendTokens: boolean;
    isInitialized: boolean;
    tokenInfo: any;
  } {
    return {
      useBackendTokens: this.useBackendTokens,
      isInitialized: this.isInitialized,
      tokenInfo: this.useBackendTokens 
        ? tokenService.getCurrentTokenInfo()
        : { source: 'local', token: vimeoService.getCurrentToken()?.substring(0, 10) + '...' },
    };
  }

  /**
   * Clear all cached tokens
   */
  async clearCache(): Promise<void> {
    if (this.useBackendTokens) {
      await tokenService.clearTokens();
    }
    // Also clear vimeo service cache
    await vimeoService.clearCache?.();
    
    this.isInitialized = false;
    console.log('🗑️ Hybrid service cache cleared');
  }

  /**
   * Force refresh tokens
   */
  async refreshTokens(): Promise<void> {
    if (this.useBackendTokens) {
      // Clear cache to force fresh token fetch
      await tokenService.clearTokens();
    }
    
    // Re-initialize
    await this.initialize();
    console.log('🔄 Tokens refreshed');
  }

  // Proxy other vimeoService methods
  async getEmbedUrl(videoId: string, options?: any) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return vimeoService.getEmbedUrl(videoId, options);
  }

  async isVideoAccessible(videoId: string) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return vimeoService.isVideoAccessible?.(videoId) ?? true;
  }

  async getVideoAccessStatus(videoIds: string[]) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return vimeoService.getVideoAccessStatus?.(videoIds) ?? {};
  }

  async logAccessDeniedError(videoId: string, error: string) {
    return vimeoService.logAccessDeniedError?.(videoId, error);
  }

  async getAccessDeniedStats() {
    return vimeoService.getAccessDeniedStats?.() ?? { totalErrors: 0, uniqueVideos: 0, recentErrors: [] };
  }

  async clearAccessDeniedLog() {
    return vimeoService.clearAccessDeniedLog?.();
  }

  async resetToOriginalState() {
    await this.clearCache();
    return vimeoService.resetToOriginalState?.();
  }
}

// Export singleton instance
export const hybridVimeoService = new HybridVimeoService();
export default hybridVimeoService;
