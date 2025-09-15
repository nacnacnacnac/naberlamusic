import { Platform, Share } from 'react-native';
import { SimplifiedVimeoVideo } from '@/types/vimeo';

export interface ShareOptions {
  title?: string;
  message?: string;
  url: string;
}

class ShareService {
  /**
   * Generate share URL for a song
   */
  generateSongShareUrl(videoId: string): string {
    const baseUrl = Platform.OS === 'web' 
      ? (typeof window !== 'undefined' ? window.location.origin : 'https://naberla.music')
      : 'https://naberla.music';
    
    return `${baseUrl}/song/${videoId}`;
  }

  /**
   * Share a song using native share or web share API
   */
  async shareSong(video: SimplifiedVimeoVideo): Promise<boolean> {
    try {
      const shareUrl = this.generateSongShareUrl(video.id);
      const shareTitle = `${video.title} - Naber LA Music`;
      const shareMessage = `🎵 "${video.title}" şarkısını dinle!\n\n${shareUrl}`;

      if (Platform.OS === 'web') {
        return await this.shareOnWeb({
          title: shareTitle,
          message: shareMessage,
          url: shareUrl,
        });
      } else {
        return await this.shareOnNative({
          title: shareTitle,
          message: shareMessage,
          url: shareUrl,
        });
      }
    } catch (error) {
      console.error('Share error:', error);
      return false;
    }
  }

  /**
   * Share on web using Web Share API or fallback to clipboard
   */
  private async shareOnWeb(options: ShareOptions): Promise<boolean> {
    try {
      // Check if Web Share API is supported
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: options.title,
          text: options.message,
          url: options.url,
        });
        return true;
      } else {
        // Fallback to clipboard
        return await this.copyToClipboard(options.url);
      }
    } catch (error) {
      console.error('Web share error:', error);
      // Fallback to clipboard if share fails
      return await this.copyToClipboard(options.url);
    }
  }

  /**
   * Share on native platforms
   */
  private async shareOnNative(options: ShareOptions): Promise<boolean> {
    try {
      const result = await Share.share({
        title: options.title,
        message: options.message,
        url: options.url,
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Native share error:', error);
      return false;
    }
  }

  /**
   * Copy URL to clipboard
   */
  private async copyToClipboard(url: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          console.log('✅ URL copied to clipboard:', url);
          return true;
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = url;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          console.log('✅ URL copied to clipboard (fallback):', url);
          return true;
        }
      } else {
        // For React Native, we'll use React Native Clipboard
        const Clipboard = require('@react-native-clipboard/clipboard');
        await Clipboard.setString(url);
        console.log('✅ URL copied to clipboard:', url);
        return true;
      }
    } catch (error) {
      console.error('Clipboard error:', error);
      return false;
    }
  }

  /**
   * Share to specific social media platforms
   */
  shareToWhatsApp(video: SimplifiedVimeoVideo): void {
    const shareUrl = this.generateSongShareUrl(video.id);
    const message = encodeURIComponent(`🎵 "${video.title}" şarkısını dinle!\n\n${shareUrl}`);
    const whatsappUrl = `https://wa.me/?text=${message}`;
    
    if (Platform.OS === 'web') {
      window.open(whatsappUrl, '_blank');
    } else {
      // For native, we would use Linking
      const Linking = require('expo-linking');
      Linking.openURL(whatsappUrl);
    }
  }

  shareToTwitter(video: SimplifiedVimeoVideo): void {
    const shareUrl = this.generateSongShareUrl(video.id);
    const text = encodeURIComponent(`🎵 "${video.title}" şarkısını dinliyorum! #NaberLA #Music`);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`;
    
    if (Platform.OS === 'web') {
      window.open(twitterUrl, '_blank');
    } else {
      const Linking = require('expo-linking');
      Linking.openURL(twitterUrl);
    }
  }

  shareToFacebook(video: SimplifiedVimeoVideo): void {
    const shareUrl = this.generateSongShareUrl(video.id);
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    
    if (Platform.OS === 'web') {
      window.open(facebookUrl, '_blank');
    } else {
      const Linking = require('expo-linking');
      Linking.openURL(facebookUrl);
    }
  }

  shareToInstagram(video: SimplifiedVimeoVideo): void {
    // Instagram doesn't support direct URL sharing, so we copy to clipboard
    const shareUrl = this.generateSongShareUrl(video.id);
    const message = `🎵 "${video.title}" şarkısını dinle! Link bio'da: ${shareUrl}`;
    
    this.copyToClipboard(message);
    
    // Try to open Instagram app (mobile only)
    if (Platform.OS !== 'web') {
      const Linking = require('expo-linking');
      Linking.openURL('instagram://').catch(() => {
        // If Instagram app is not installed, open web version
        Linking.openURL('https://instagram.com');
      });
    }
  }

  /**
   * Generate QR code URL for sharing
   */
  generateQRCodeUrl(video: SimplifiedVimeoVideo): string {
    const shareUrl = this.generateSongShareUrl(video.id);
    // Using QR Server API for QR code generation
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
  }
}

export const shareService = new ShareService();
export default shareService;
