import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { hybridPlaylistService } from '@/services/hybridPlaylistService';
import { adminApiService } from '@/services/adminApiService';
import { vimeoService } from '@/services/vimeoService';
import Toast from '@/components/Toast';

export default function DebugApiScreen() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState('');

  const addResult = (message: string) => {
    console.log('🔍 DEBUG:', message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testAdminApiConnection = async () => {
    setLoading(true);
    addResult('Testing admin API connection...');
    
    try {
      const isConnected = await adminApiService.testConnection();
      addResult(`Admin API connection: ${isConnected ? '✅ SUCCESS' : '❌ FAILED'}`);
    } catch (error: any) {
      addResult(`❌ Admin API error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testFetchPlaylists = async () => {
    setLoading(true);
    addResult('Fetching playlists from admin API...');
    
    try {
      const playlists = await adminApiService.getPlaylists();
      addResult(`✅ Fetched ${playlists.length} playlists from admin API`);
      
      playlists.forEach((playlist, index) => {
        addResult(`  ${index + 1}. ${playlist.name} (${playlist.videos.length} videos)`);
      });
    } catch (error: any) {
      addResult(`❌ Fetch playlists error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testHybridService = async () => {
    setLoading(true);
    addResult('Testing hybrid playlist service...');
    
    try {
      const useAdminApi = await hybridPlaylistService.shouldUseAdminApi();
      addResult(`Admin API enabled: ${useAdminApi ? '✅ YES' : '❌ NO'}`);
      
      const playlists = await hybridPlaylistService.getPlaylists();
      addResult(`✅ Hybrid service returned ${playlists.length} playlists`);
      
      playlists.forEach((playlist, index) => {
        addResult(`  ${index + 1}. ${playlist.name} (${playlist.videos.length} videos)`);
      });
    } catch (error: any) {
      addResult(`❌ Hybrid service error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const enableAdminApi = async () => {
    setLoading(true);
    addResult('Enabling admin API...');
    
    try {
      await hybridPlaylistService.setUseAdminApi(true);
      addResult('✅ Admin API enabled');
      showToast('Admin API enabled!');
    } catch (error: any) {
      addResult(`❌ Enable admin API error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const syncWithAdmin = async () => {
    setLoading(true);
    addResult('Syncing with admin API...');
    
    try {
      await hybridPlaylistService.syncWithAdminApi();
      addResult('✅ Sync completed');
      showToast('Sync completed!');
    } catch (error: any) {
      addResult(`❌ Sync error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testVimeoConnection = async () => {
    setLoading(true);
    addResult('Testing Vimeo API connection...');
    
    try {
      const token = process.env.EXPO_PUBLIC_VIMEO_ACCESS_TOKEN;
      addResult(`Token available: ${token ? '✅ YES' : '❌ NO'}`);
      
      if (!token) {
        addResult('❌ Please set EXPO_PUBLIC_VIMEO_ACCESS_TOKEN in .env file');
        return;
      }
      
      addResult(`Token preview: ${token.substring(0, 10)}...`);
      
      const isConnected = await vimeoService.testConnection();
      addResult(`Vimeo API connection: ${isConnected ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (isConnected) {
        addResult('🎉 Vimeo authentication successful!');
      }
    } catch (error: any) {
      addResult(`❌ Vimeo connection error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDirectApiCall = async () => {
    setLoading(true);
    addResult('Testing direct API call...');
    
    try {
      const response = await fetch('https://igami-worker.ugurcan-b84.workers.dev/api/playlists', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      addResult(`Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        addResult(`✅ Direct API call success: ${JSON.stringify(data, null, 2)}`);
      } else {
        const errorText = await response.text();
        addResult(`❌ Direct API call failed: ${errorText}`);
      }
    } catch (error: any) {
      addResult(`❌ Direct API call error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
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
        
        <ThemedText style={styles.headerTitle}>API Debug</ThemedText>
        
        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearResults}
        >
          <ThemedText style={styles.clearButtonText}>Clear</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Test Buttons */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Debug Tests</ThemedText>
          
          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={testVimeoConnection}
            disabled={loading}
          >
            <ThemedText style={styles.testButtonText}>1. Test Vimeo API Connection</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={testAdminApiConnection}
            disabled={loading}
          >
            <ThemedText style={styles.testButtonText}>2. Test Admin API Connection</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={testDirectApiCall}
            disabled={loading}
          >
            <ThemedText style={styles.testButtonText}>3. Test Direct API Call</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={enableAdminApi}
            disabled={loading}
          >
            <ThemedText style={styles.testButtonText}>4. Enable Admin API</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={testFetchPlaylists}
            disabled={loading}
          >
            <ThemedText style={styles.testButtonText}>5. Fetch Admin Playlists</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={testHybridService}
            disabled={loading}
          >
            <ThemedText style={styles.testButtonText}>6. Test Hybrid Service</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, loading && styles.testButtonDisabled]}
            onPress={syncWithAdmin}
            disabled={loading}
          >
            <ThemedText style={styles.testButtonText}>7. Sync with Admin</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Results */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Debug Results</ThemedText>
          
          {results.length === 0 ? (
            <ThemedText style={styles.noResults}>No results yet. Run a test above.</ThemedText>
          ) : (
            <ThemedView style={styles.resultsContainer}>
              {results.map((result, index) => (
                <ThemedText key={index} style={styles.resultText}>
                  {result}
                </ThemedText>
              ))}
            </ThemedView>
          )}
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
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
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
    marginBottom: 16,
  },
  testButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  testButtonDisabled: {
    backgroundColor: '#374151',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  noResults: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  resultsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
  },
  resultText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    marginBottom: 4,
    lineHeight: 16,
  },
});
