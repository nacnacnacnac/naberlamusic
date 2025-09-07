import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { hybridPlaylistService } from '@/services/hybridPlaylistService';
import Toast from '@/components/Toast';

export default function AdminSettingsScreen() {
  const [loading, setLoading] = useState(false);
  const [useAdminApi, setUseAdminApi] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const adminApiEnabled = await hybridPlaylistService.shouldUseAdminApi();
      const lastSync = await hybridPlaylistService.getLastSyncTime();
      
      setUseAdminApi(adminApiEnabled);
      setLastSyncTime(lastSync);
      
      if (adminApiEnabled) {
        testConnection();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const testConnection = async () => {
    try {
      setConnectionStatus('unknown');
      const isConnected = await hybridPlaylistService.testAdminApiConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
    } catch (error) {
      console.error('Error testing connection:', error);
      setConnectionStatus('disconnected');
    }
  };

  const toggleAdminApi = async (enabled: boolean) => {
    try {
      setLoading(true);
      await hybridPlaylistService.setUseAdminApi(enabled);
      setUseAdminApi(enabled);
      
      if (enabled) {
        await testConnection();
        showToast('Admin API enabled! Playlists will sync with admin panel.');
      } else {
        setConnectionStatus('unknown');
        showToast('Admin API disabled. Using local storage only.');
      }
    } catch (error) {
      console.error('Error toggling admin API:', error);
      showToast('Error updating settings');
    } finally {
      setLoading(false);
    }
  };

  const syncWithAdminApi = async () => {
    if (!useAdminApi) {
      showToast('Enable Admin API first');
      return;
    }

    try {
      setLoading(true);
      await hybridPlaylistService.syncWithAdminApi();
      
      const newLastSync = await hybridPlaylistService.getLastSyncTime();
      setLastSyncTime(newLastSync);
      
      showToast('Successfully synced with admin panel!');
    } catch (error) {
      console.error('Error syncing with admin API:', error);
      showToast('Failed to sync with admin panel');
    } finally {
      setLoading(false);
    }
  };

  const clearLocalData = async () => {
    Alert.alert(
      'Clear Local Data',
      'This will remove all locally stored playlists. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await hybridPlaylistService.clearAllPlaylists();
              setLastSyncTime(null);
              showToast('Local data cleared');
            } catch (error) {
              console.error('Error clearing local data:', error);
              showToast('Error clearing local data');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const formatLastSync = (syncTime: string | null) => {
    if (!syncTime) return 'Never';
    
    const date = new Date(syncTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#10B981';
      case 'disconnected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <ThemedView style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <ThemedText style={styles.headerTitle}>Admin Settings</ThemedText>
        
        <ThemedView style={styles.headerSpacer} />
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Admin API Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Admin Panel Integration</ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Connect to the admin panel to sync playlists across devices
          </ThemedText>
          
          <ThemedView style={styles.settingRow}>
            <ThemedView style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>Use Admin API</ThemedText>
              <ThemedText style={styles.settingSubtext}>
                Sync playlists with admin panel
              </ThemedText>
            </ThemedView>
            
            <Switch
              value={useAdminApi}
              onValueChange={toggleAdminApi}
              disabled={loading}
              trackColor={{ false: '#374151', true: '#10B981' }}
              thumbColor={useAdminApi ? '#FFFFFF' : '#9CA3AF'}
            />
          </ThemedView>

          {useAdminApi && (
            <ThemedView style={styles.connectionStatus}>
              <ThemedView style={styles.statusRow}>
                <ThemedView style={[styles.statusDot, { backgroundColor: getConnectionStatusColor() }]} />
                <ThemedText style={styles.statusText}>
                  {getConnectionStatusText()}
                </ThemedText>
                
                <TouchableOpacity
                  style={styles.testButton}
                  onPress={testConnection}
                  disabled={loading}
                >
                  <ThemedText style={styles.testButtonText}>Test</ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>
          )}
        </ThemedView>

        {/* Sync Section */}
        {useAdminApi && (
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Synchronization</ThemedText>
            
            <ThemedView style={styles.syncInfo}>
              <ThemedText style={styles.syncLabel}>Last Sync</ThemedText>
              <ThemedText style={styles.syncTime}>
                {formatLastSync(lastSyncTime)}
              </ThemedText>
            </ThemedView>
            
            <TouchableOpacity
              style={[styles.syncButton, loading && styles.syncButtonDisabled]}
              onPress={syncWithAdminApi}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <IconSymbol name="arrow.clockwise" size={20} color="#FFFFFF" />
              )}
              <ThemedText style={styles.syncButtonText}>
                {loading ? 'Syncing...' : 'Sync Now'}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}

        {/* Local Data Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Local Data</ThemedText>
          <ThemedText style={styles.sectionDescription}>
            Manage locally stored playlist data
          </ThemedText>
          
          <TouchableOpacity
            style={[styles.clearButton, loading && styles.clearButtonDisabled]}
            onPress={clearLocalData}
            disabled={loading}
          >
            <IconSymbol name="trash" size={20} color="#EF4444" />
            <ThemedText style={styles.clearButtonText}>Clear Local Data</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Info Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>How it Works</ThemedText>
          
          <ThemedView style={styles.infoItem}>
            <ThemedText style={styles.infoTitle}>🔄 Hybrid Sync</ThemedText>
            <ThemedText style={styles.infoText}>
              When admin API is enabled, playlists sync with the admin panel but are also cached locally for offline access.
            </ThemedText>
          </ThemedView>
          
          <ThemedView style={styles.infoItem}>
            <ThemedText style={styles.infoTitle}>📱 Local Storage</ThemedText>
            <ThemedText style={styles.infoText}>
              When admin API is disabled, playlists are stored only on this device.
            </ThemedText>
          </ThemedView>
          
          <ThemedView style={styles.infoItem}>
            <ThemedText style={styles.infoTitle}>🌐 Admin Panel</ThemedText>
            <ThemedText style={styles.infoText}>
              Create and manage playlists from the web admin panel at naberla-admin.pages.dev
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ScrollView>

      {/* Toast */}
      {toastMessage ? (
        <Toast
          message={toastMessage}
          onHide={() => setToastMessage('')}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#000000',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 20,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 20,
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  settingSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  connectionStatus: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  testButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
  },
  testButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  syncInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  syncLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  syncTime: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  syncButtonDisabled: {
    backgroundColor: '#374151',
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  clearButtonDisabled: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderColor: '#6B7280',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
});
