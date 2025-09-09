/**
 * Native Video Service
 * Fetches direct video URLs from Vimeo API for native playback
 */

import { hybridVimeoService } from './hybridVimeoService';

export interface VideoFile {
  quality: string;
  rendition: string;
  type: string;
  width: number;
  height: number;
  link: string;
  size: number;
  fps: number;
}

export interface VideoUrls {
  videoId: string;
  title: string;
  duration: number;
  files: VideoFile[];
  bestUrl: string;
  thumbnailUrl?: string;
}

class NativeVideoService {
  private cache = new Map<string, VideoUrls>();
  private cacheExpiry = 60 * 60 * 1000; // 1 hour

  /**
   * Get direct video URLs for native playback
   */
  async getVideoUrls(videoId: string): Promise<VideoUrls> {
    try {
      // Check cache first
      const cached = this.cache.get(videoId);
      if (cached) {
        console.log(`✅ Using cached video URLs for ${videoId}`);
        return cached;
      }

      console.log(`🔍 Fetching video URLs for ${videoId}`);

      // Get token from hybrid service
      const token = await hybridVimeoService.getCurrentToken();
      
      // Fetch video data with files
      const response = await fetch(`https://api.vimeo.com/videos/${videoId}?fields=uri,name,duration,files,pictures`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.vimeo.*+json;version=3.4'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract MP4 files only
      const files: VideoFile[] = (data.files || [])
        .filter((file: any) => 
          file.type === 'video/mp4' && 
          file.quality !== 'hls' &&
          file.link &&
          !file.link.includes('.m3u8')
        )
        .map((file: any) => ({
          quality: file.quality,
          rendition: file.rendition,
          type: file.type,
          width: file.width,
          height: file.height,
          link: file.link,
          size: file.size,
          fps: file.fps
        }));

      if (files.length === 0) {
        throw new Error('No compatible MP4 files found for native playback');
      }

      // Sort by quality preference: HD > SD > Mobile
      files.sort((a, b) => {
        const qualityOrder = { 'hd': 3, 'sd': 2, 'mobile': 1 };
        const aScore = qualityOrder[a.quality as keyof typeof qualityOrder] || 0;
        const bScore = qualityOrder[b.quality as keyof typeof qualityOrder] || 0;
        
        if (aScore !== bScore) {
          return bScore - aScore; // Higher quality first
        }
        
        // If same quality, prefer higher resolution
        return (b.width * b.height) - (a.width * a.height);
      });

      // Get thumbnail URL
      const thumbnailUrl = this.getBestThumbnail(data.pictures);

      const videoUrls: VideoUrls = {
        videoId,
        title: data.name || 'Untitled',
        duration: data.duration || 0,
        files,
        bestUrl: files[0].link,
        thumbnailUrl
      };

      // Cache the result
      this.cache.set(videoId, videoUrls);
      
      // Auto-cleanup cache after expiry
      setTimeout(() => {
        this.cache.delete(videoId);
      }, this.cacheExpiry);

      console.log(`✅ Found ${files.length} video files for ${videoId}`);
      console.log(`🎯 Best quality: ${files[0].rendition} (${files[0].width}x${files[0].height})`);

      return videoUrls;

    } catch (error: any) {
      console.error(`💥 Failed to get video URLs for ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Get video URL by preferred quality
   */
  async getVideoUrlByQuality(videoId: string, preferredQuality: '720p' | '540p' | '360p' | 'auto' = 'auto'): Promise<string> {
    const videoUrls = await this.getVideoUrls(videoId);
    
    if (preferredQuality === 'auto') {
      return videoUrls.bestUrl;
    }

    // Find specific quality
    const file = videoUrls.files.find(f => f.rendition === preferredQuality);
    if (file) {
      console.log(`🎯 Using ${preferredQuality} quality for ${videoId}`);
      return file.link;
    }

    // Fallback to best available
    console.log(`⚠️ ${preferredQuality} not available for ${videoId}, using best quality`);
    return videoUrls.bestUrl;
  }

  /**
   * Preload video URLs for better performance
   */
  async preloadVideoUrls(videoIds: string[]): Promise<void> {
    console.log(`🚀 Preloading ${videoIds.length} video URLs...`);
    
    const promises = videoIds.map(async (videoId) => {
      try {
        await this.getVideoUrls(videoId);
      } catch (error) {
        console.warn(`⚠️ Failed to preload ${videoId}:`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log(`✅ Preloading completed`);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Native video cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Get best thumbnail from pictures
   */
  private getBestThumbnail(pictures: any): string | undefined {
    if (!pictures?.sizes || pictures.sizes.length === 0) {
      return undefined;
    }

    // Find medium size thumbnail (around 640px width)
    const sizes = pictures.sizes.sort((a: any, b: any) => b.width - a.width);
    const mediumSize = sizes.find((size: any) => size.width >= 640 && size.width <= 800);
    
    return mediumSize?.link || sizes[Math.floor(sizes.length / 2)]?.link || sizes[0]?.link;
  }

  /**
   * Test if video URLs are accessible
   */
  async testVideoAccess(videoId: string): Promise<boolean> {
    try {
      const videoUrls = await this.getVideoUrls(videoId);
      
      // Test HEAD request to video URL
      const response = await fetch(videoUrls.bestUrl, { method: 'HEAD' });
      
      const accessible = response.ok;
      console.log(`🧪 Video ${videoId} accessibility test: ${accessible ? 'PASS' : 'FAIL'} (${response.status})`);
      
      return accessible;
    } catch (error) {
      console.error(`💥 Video access test failed for ${videoId}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const nativeVideoService = new NativeVideoService();
export default nativeVideoService;
