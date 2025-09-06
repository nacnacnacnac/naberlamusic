import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { vimeoService } from '@/services/vimeoService';
import { VimeoConfig } from '@/types/vimeo';

interface VimeoSetupProps {
  onSetupComplete: (config: VimeoConfig) => void;
  onSkip?: () => void;
}

export default function VimeoSetup({ onSetupComplete, onSkip }: VimeoSetupProps) {
  const [accessToken, setAccessToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const savedConfig = await vimeoService.loadSavedConfig();
      if (savedConfig?.accessToken) {
        setAccessToken(savedConfig.accessToken);
        setConnectionStatus('success');
      }
    } catch (error) {
      console.error('Error loading saved config:', error);
    }
  };

  const openVimeoTokenPage = () => {
    const url = 'https://developer.vimeo.com/apps';
    Linking.openURL(url).catch(err => {
      console.error('Error opening Vimeo developer page:', err);
      Alert.alert(
        'Hata',
        'Vimeo geliştirici sayfası açılamadı. Lütfen manuel olarak https://developer.vimeo.com/apps adresini ziyaret edin.'
      );
    });
  };

  const testConnection = async () => {
    if (!accessToken.trim()) {
      Alert.alert('Hata', 'Lütfen access token girin.');
      return;
    }

    // Token format validation
    const cleanToken = accessToken.trim();
    if (cleanToken.length < 20) {
      Alert.alert('Hata', 'Access token çok kısa görünüyor. Lütfen tam token\'ı kopyalayın.');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      console.log('Testing connection with token length:', cleanToken.length);
      console.log('Token starts with:', cleanToken.substring(0, 10) + '...');

      const config: VimeoConfig = {
        accessToken: cleanToken,
      };

      await vimeoService.initialize(config);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const isConnected = await vimeoService.testConnection();

      if (isConnected) {
        setConnectionStatus('success');
        Alert.alert(
          'Başarılı!',
          'Vimeo API bağlantısı başarıyla kuruldu. Videolarınıza erişebilirsiniz.',
          [
            {
              text: 'Devam Et',
              onPress: () => {
                console.log('Test başarılı, onSetupComplete çağrılıyor...');
                onSetupComplete(config);
              },
            },
          ]
        );
      } else {
        setConnectionStatus('error');
        Alert.alert(
          'Bağlantı Hatası',
          'Vimeo API bağlantısı kurulamadı.\n\nOlası nedenler:\n• Token geçersiz veya süresi dolmuş\n• Token izinleri yetersiz\n• Ağ bağlantısı sorunu'
        );
      }
    } catch (error: any) {
      setConnectionStatus('error');
      console.error('Connection test error:', error);
      
      let errorMessage = 'Bağlantı testi sırasında bir hata oluştu.';
      
      if (error.response) {
        const status = error.response.status;
        switch (status) {
          case 401:
            errorMessage = 'Token geçersiz. Lütfen yeni bir token oluşturun.';
            break;
          case 403:
            errorMessage = 'Token izinleri yetersiz. "Private" ve "Public" izinlerini kontrol edin.';
            break;
          case 429:
            errorMessage = 'Çok fazla istek gönderildi. Lütfen 1 dakika bekleyip tekrar deneyin.';
            break;
          case 500:
            errorMessage = 'Vimeo sunucu hatası. Lütfen daha sonra tekrar deneyin.';
            break;
          default:
            errorMessage = `API Hatası (${status}): ${error.response.data?.error || 'Bilinmeyen hata'}`;
        }
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.';
      }
      
      Alert.alert('Bağlantı Hatası', errorMessage);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const skipSetup = () => {
    Alert.alert(
      'Kurulumu Atla',
      'Vimeo entegrasyonu olmadan uygulamayı kullanmaya devam edebilirsiniz. Daha sonra ayarlardan Vimeo\'yu kurabilirsiniz.',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Atla', onPress: () => onSkip?.() },
      ]
    );
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'success':
        return <IconSymbol name="checkmark.circle.fill" size={24} color="#4CAF50" />;
      case 'error':
        return <IconSymbol name="xmark.circle.fill" size={24} color="#F44336" />;
      default:
        return <IconSymbol name="questionmark.circle" size={24} color="#999" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'success':
        return 'Bağlantı başarılı';
      case 'error':
        return 'Bağlantı hatası';
      default:
        return 'Bağlantı test edilmedi';
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <IconSymbol name="video.fill" size={48} color="#1AB7EA" />
          <ThemedText style={styles.title}>Vimeo Entegrasyonu</ThemedText>
          <ThemedText style={styles.subtitle}>
            340 müzik videonuza erişmek için Vimeo API token'ınızı girin
          </ThemedText>
        </ThemedView>

        {/* Instructions */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Nasıl Token Alınır?</ThemedText>
          
          <ThemedView style={styles.step}>
            <ThemedView style={styles.stepNumber}>
              <ThemedText style={styles.stepNumberText}>1</ThemedText>
            </ThemedView>
            <ThemedView style={styles.stepContent}>
              <ThemedText style={styles.stepTitle}>Vimeo Developer Sayfasına Git</ThemedText>
              <ThemedText style={styles.stepDescription}>
                Vimeo geliştirici sayfasında yeni bir uygulama oluşturun
              </ThemedText>
              <TouchableOpacity style={styles.linkButton} onPress={openVimeoTokenPage}>
                <IconSymbol name="link" size={16} color="#1AB7EA" />
                <ThemedText style={styles.linkText}>developer.vimeo.com/apps</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.step}>
            <ThemedView style={styles.stepNumber}>
              <ThemedText style={styles.stepNumberText}>2</ThemedText>
            </ThemedView>
            <ThemedView style={styles.stepContent}>
              <ThemedText style={styles.stepTitle}>Uygulama Oluştur</ThemedText>
              <ThemedText style={styles.stepDescription}>
                "Create App" butonuna tıklayın ve gerekli bilgileri doldurun
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.step}>
            <ThemedView style={styles.stepNumber}>
              <ThemedText style={styles.stepNumberText}>3</ThemedText>
            </ThemedView>
            <ThemedView style={styles.stepContent}>
              <ThemedText style={styles.stepTitle}>Access Token Al</ThemedText>
              <ThemedText style={styles.stepDescription}>
                "Authentication" sekmesinden "Personal Access Token" oluşturun
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>

        {/* Token Input */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Access Token</ThemedText>
          
          <ThemedView style={styles.inputContainer}>
            <TextInput
              style={styles.tokenInput}
              value={accessToken}
              onChangeText={(text) => {
                // Auto-trim whitespace and newlines
                const cleanText = text.replace(/\s+/g, '').trim();
                setAccessToken(cleanText);
              }}
              placeholder="Vimeo Access Token'ınızı buraya yapıştırın"
              placeholderTextColor="#999"
              multiline={false}
              secureTextEntry={false}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
            />
            {accessToken.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => setAccessToken('')}
              >
                <IconSymbol name="xmark.circle.fill" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </ThemedView>

          {/* Connection Status */}
          <ThemedView style={styles.statusContainer}>
            {getStatusIcon()}
            <ThemedText style={[
              styles.statusText,
              connectionStatus === 'success' && styles.successText,
              connectionStatus === 'error' && styles.errorText,
            ]}>
              {getStatusText()}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Action Buttons */}
        <ThemedView style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.testButton]}
            onPress={testConnection}
            disabled={isTestingConnection || !accessToken.trim()}
          >
            {isTestingConnection ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <IconSymbol name="wifi" size={20} color="white" />
            )}
            <ThemedText style={styles.buttonText}>
              {isTestingConnection ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}
            </ThemedText>
          </TouchableOpacity>

          {connectionStatus === 'success' && (
            <TouchableOpacity
              style={[styles.button, styles.continueButton]}
              onPress={async () => {
                console.log('Kurulumu Tamamla butonuna basıldı');
                console.log('Token length:', accessToken.trim().length);
                
                try {
                  setIsLoading(true);
                  await onSetupComplete({ accessToken: accessToken.trim() });
                  console.log('onSetupComplete çağrıldı');
                } catch (error) {
                  console.error('Setup complete error:', error);
                  Alert.alert('Hata', 'Kurulum tamamlanırken bir hata oluştu.');
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <IconSymbol name="checkmark" size={20} color="white" />
              )}
              <ThemedText style={styles.buttonText}>
                {isLoading ? 'Tamamlanıyor...' : 'Kurulumu Tamamla'}
              </ThemedText>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.skipButton]}
            onPress={skipSetup}
          >
            <ThemedText style={styles.skipButtonText}>Şimdilik Atla</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Help Text */}
        <ThemedView style={styles.helpSection}>
          <ThemedText style={styles.helpTitle}>Yardım & Sorun Giderme</ThemedText>
          <ThemedText style={styles.helpText}>
            <ThemedText style={styles.helpSubtitle}>✅ Güvenlik:{'\n'}</ThemedText>
            • Token'ınız güvenli bir şekilde cihazınızda saklanır{'\n'}
            • Sadece kendi videolarınıza erişim sağlar{'\n'}
            • İstediğiniz zaman ayarlardan kaldırabilirsiniz{'\n\n'}
            
            <ThemedText style={styles.helpSubtitle}>🔧 Bağlantı Hatası Alıyorsanız:{'\n'}</ThemedText>
            • Token'ı kopyalarken boşluk bırakmayın{'\n'}
            • Token'ın tam olarak kopyalandığından emin olun{'\n'}
            • Vimeo'da "Private" ve "Public" izinlerini verin{'\n'}
            • İnternet bağlantınızı kontrol edin{'\n'}
            • 1-2 dakika bekleyip tekrar deneyin{'\n\n'}
            
            <ThemedText style={styles.helpSubtitle}>📱 Desteklenen Videolar:{'\n'}</ThemedText>
            • Public (herkese açık) videolar{'\n'}
            • Private (özel) videolar{'\n'}
            • Password korumalı videolar desteklenmez
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1AB7EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  stepDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
    marginBottom: 10,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    color: '#1AB7EA',
    fontSize: 14,
    marginLeft: 5,
    textDecorationLine: 'underline',
  },
  inputContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    position: 'relative',
  },
  tokenInput: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: 50,
    paddingRight: 40,
    color: '#333',
  },
  clearButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  statusText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#666',
  },
  successText: {
    color: '#4CAF50',
  },
  errorText: {
    color: '#F44336',
  },
  actions: {
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  testButton: {
    backgroundColor: '#1AB7EA',
  },
  continueButton: {
    backgroundColor: '#4CAF50',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  helpSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
  },
  helpSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
});
