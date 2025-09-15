import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
import { shareService } from '@/services/shareService';
import { CustomIcon } from './ui/CustomIcon';

interface ShareButtonProps {
  video: SimplifiedVimeoVideo;
  size?: 'small' | 'medium' | 'large';
  variant?: 'icon' | 'button' | 'text';
  color?: string;
  onShareSuccess?: () => void;
}

export default function ShareButton({ 
  video, 
  size = 'medium', 
  variant = 'icon',
  color = '#ffffff',
  onShareSuccess 
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (isSharing) return;
    
    try {
      setIsSharing(true);
      const success = await shareService.shareSong(video);
      
      if (success) {
        onShareSuccess?.();
        
        // Show success feedback
        if (Platform.OS === 'web') {
          // For web, we can show a temporary message
          console.log('✅ Şarkı paylaşıldı!');
        } else {
          // For native, we can use Alert or a toast
          Alert.alert('✅ Başarılı', 'Şarkı paylaşıldı!');
        }
      } else {
        // Show error feedback
        if (Platform.OS === 'web') {
          console.log('❌ Paylaşım başarısız');
        } else {
          Alert.alert('❌ Hata', 'Paylaşım sırasında bir hata oluştu');
        }
      }
    } catch (error) {
      console.error('Share button error:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'medium': return 20;
      case 'large': return 24;
      default: return 20;
    }
  };

  const getButtonStyle = () => {
    switch (variant) {
      case 'button':
        return [styles.button, size === 'large' && styles.buttonLarge];
      case 'text':
        return styles.textButton;
      default:
        return styles.iconButton;
    }
  };

  const renderContent = () => {
    const iconSize = getIconSize();
    
    if (variant === 'text') {
      return (
        <Text style={[styles.buttonText, { color }]}>
          Paylaş
        </Text>
      );
    }
    
    if (variant === 'button') {
      return (
        <View style={styles.buttonContent}>
          <CustomIcon 
            name="share" 
            size={iconSize} 
            color={color}
          />
          <Text style={[styles.buttonText, { color }]}>
            Paylaş
          </Text>
        </View>
      );
    }
    
    // Icon variant
    return (
      <CustomIcon 
        name="share" 
        size={iconSize} 
        color={color}
      />
    );
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handleShare}
      disabled={isSharing}
      activeOpacity={0.7}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}

export function ShareModal({ 
  video, 
  visible, 
  onClose 
}: { 
  video: SimplifiedVimeoVideo; 
  visible: boolean; 
  onClose: () => void; 
}) {
  if (!visible) return null;

  const handleSocialShare = (platform: string) => {
    switch (platform) {
      case 'whatsapp':
        shareService.shareToWhatsApp(video);
        break;
      case 'twitter':
        shareService.shareToTwitter(video);
        break;
      case 'facebook':
        shareService.shareToFacebook(video);
        break;
      case 'instagram':
        shareService.shareToInstagram(video);
        break;
    }
    onClose();
  };

  const handleCopyLink = async () => {
    const url = shareService.generateSongShareUrl(video.id);
    const success = await shareService['copyToClipboard'](url);
    
    if (success) {
      Alert.alert('✅ Başarılı', 'Link kopyalandı!');
    } else {
      Alert.alert('❌ Hata', 'Link kopyalanamadı');
    }
    onClose();
  };

  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Şarkıyı Paylaş</Text>
        <Text style={styles.modalSubtitle}>"{video.title}"</Text>
        
        <View style={styles.socialButtons}>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialShare('whatsapp')}
          >
            <View style={[styles.socialIcon, { backgroundColor: '#25D366' }]}>
              <Text style={styles.socialIconText}>W</Text>
            </View>
            <Text style={styles.socialLabel}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialShare('twitter')}
          >
            <View style={[styles.socialIcon, { backgroundColor: '#1DA1F2' }]}>
              <Text style={styles.socialIconText}>T</Text>
            </View>
            <Text style={styles.socialLabel}>Twitter</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialShare('facebook')}
          >
            <View style={[styles.socialIcon, { backgroundColor: '#4267B2' }]}>
              <Text style={styles.socialIconText}>F</Text>
            </View>
            <Text style={styles.socialLabel}>Facebook</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialShare('instagram')}
          >
            <View style={[styles.socialIcon, { backgroundColor: '#E4405F' }]}>
              <Text style={styles.socialIconText}>I</Text>
            </View>
            <Text style={styles.socialLabel}>Instagram</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.copyButton}
          onPress={handleCopyLink}
        >
          <CustomIcon name="link" size={20} color="#ffffff" />
          <Text style={styles.copyButtonText}>Linki Kopyala</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>Kapat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonLarge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textButton: {
    padding: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, sans-serif' : undefined,
  },
  
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, sans-serif' : undefined,
  },
  modalSubtitle: {
    color: '#cccccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, sans-serif' : undefined,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  socialButton: {
    alignItems: 'center',
    gap: 8,
  },
  socialIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIconText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  socialLabel: {
    color: '#cccccc',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, sans-serif' : undefined,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#333333',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 16,
  },
  copyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, sans-serif' : undefined,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#888888',
    fontSize: 16,
    fontFamily: Platform.OS === 'web' ? 'Funnel Display, sans-serif' : undefined,
  },
});
