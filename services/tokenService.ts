/**
 * Token Service
 * Handles token management from backend API
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
  refreshToken?: string;
}

export interface TokenConfig {
  backendUrl: string;
  apiKey?: string;
  appId?: string;
}

class TokenService {
  private config: TokenConfig | null = null;
  private currentToken: string | null = null;
  private tokenExpiry: number | null = null;

  /**
   * Initialize token service with backend configuration
   */
  initialize(config: TokenConfig) {
    this.config = config;
    console.log('🔧 Token service initialized');
    console.log('Backend URL:', config.backendUrl);
  }

  /**
   * Get valid access token (fetch from backend if needed)
   */
  async getValidToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.currentToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      console.log('✅ Using cached token');
      return this.currentToken;
    }

    // Fetch new token from backend
    console.log('🔄 Fetching new token from backend...');
    return await this.fetchTokenFromBackend();
  }

  /**
   * Fetch token from backend API
   */
  private async fetchTokenFromBackend(): Promise<string> {
    if (!this.config) {
      throw new Error('Token service not initialized');
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add API key if provided
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        // or headers['X-API-Key'] = this.config.apiKey;
      }

      const url = `${this.config.backendUrl}/api/vimeo/token${this.config.appId ? `?app=${this.config.appId}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Backend token request failed: ${response.status} ${response.statusText}`);
      }

      const tokenData: TokenResponse = await response.json();

      // Cache the token
      this.currentToken = tokenData.accessToken;
      this.tokenExpiry = Date.now() + (tokenData.expiresIn * 1000) - 60000; // 1 minute buffer

      // Save to storage for persistence
      await this.saveTokenToStorage(tokenData);

      console.log('✅ New token received from backend');
      console.log('Token type:', tokenData.tokenType);
      console.log('Scope:', tokenData.scope);
      console.log('Expires in:', tokenData.expiresIn, 'seconds');

      return tokenData.accessToken;
    } catch (error) {
      console.error('💥 Backend token fetch error:', error);
      
      // Try to use cached token from storage as fallback
      const cachedToken = await this.loadTokenFromStorage();
      if (cachedToken) {
        console.log('⚠️ Using cached token as fallback');
        return cachedToken.accessToken;
      }

      throw error;
    }
  }

  /**
   * Save token to local storage
   */
  private async saveTokenToStorage(tokenData: TokenResponse): Promise<void> {
    try {
      const tokenInfo = {
        ...tokenData,
        cachedAt: Date.now(),
      };
      await AsyncStorage.setItem('backend_vimeo_token', JSON.stringify(tokenInfo));
    } catch (error) {
      console.error('💥 Save token error:', error);
    }
  }

  /**
   * Load token from local storage
   */
  private async loadTokenFromStorage(): Promise<TokenResponse | null> {
    try {
      const savedToken = await AsyncStorage.getItem('backend_vimeo_token');
      if (savedToken) {
        const tokenInfo = JSON.parse(savedToken);
        
        // Check if token is still valid
        const expiryTime = tokenInfo.cachedAt + (tokenInfo.expiresIn * 1000);
        if (Date.now() < expiryTime) {
          console.log('📱 Valid cached token found in storage');
          this.currentToken = tokenInfo.accessToken;
          this.tokenExpiry = expiryTime;
          return tokenInfo;
        } else {
          console.log('⏰ Cached token expired');
        }
      }
    } catch (error) {
      console.error('💥 Load token error:', error);
    }
    return null;
  }

  /**
   * Clear cached tokens
   */
  async clearTokens(): Promise<void> {
    try {
      this.currentToken = null;
      this.tokenExpiry = null;
      await AsyncStorage.removeItem('backend_vimeo_token');
      console.log('🗑️ Tokens cleared');
    } catch (error) {
      console.error('💥 Clear tokens error:', error);
    }
  }

  /**
   * Test if current token is valid by making a direct Vimeo API call
   */
  async testTokenValidity(token?: string): Promise<boolean> {
    const testToken = token || this.currentToken;
    if (!testToken) {
      console.log('❌ No token to test');
      return false;
    }

    try {
      console.log('🧪 Testing token validity with Vimeo API...');
      console.log('🔍 Token to test:', testToken.substring(0, 15) + '...');
      
      const response = await fetch('https://api.vimeo.com/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Accept': 'application/vnd.vimeo.*+json;version=3.4',
          'Content-Type': 'application/json',
        },
      });

      console.log('🧪 Test response status:', response.status);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('✅ Token is valid! User:', userData.name || 'Unknown');
        console.log('🔑 User URI:', userData.uri);
        console.log('🔑 Account type:', userData.account);
        return true;
      } else {
        const errorData = await response.text();
        console.log('❌ Token test failed:', response.status, errorData);
        return false;
      }
    } catch (error) {
      console.error('💥 Token test error:', error);
      return false;
    }
  }

  /**
   * Get current token info (for debugging)
   */
  getCurrentTokenInfo(): { token: string | null; expiry: number | null } {
    return {
      token: this.currentToken ? `${this.currentToken.substring(0, 10)}...` : null,
      expiry: this.tokenExpiry,
    };
  }
}

// Export singleton instance
export const tokenService = new TokenService();
export default tokenService;
