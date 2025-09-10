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
import { hybridVimeoService } from '@/services/hybridVimeoService';
import Toast from '@/components/Toast';
import { authService } from '@/services/authService';

export default function DebugApiScreen() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  
  // Admin check - only allow uurcan@gmail.com
  const user = authService.getCurrentUser();
  const isAdmin = user?.email === 'uurcan@gmail.com';
  
  // Redirect if not admin
  if (!isAdmin) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <IconSymbol name="chevron.left" size={24} color="#e0af92" />
            </TouchableOpacity>
            <ThemedText style={styles.title}>Access Denied</ThemedText>
          </ThemedView>
          
          <ThemedView style={styles.centerContent}>
            <IconSymbol name="exclamationmark.triangle" size={64} color="#ff6b6b" />
            <ThemedText style={styles.errorTitle}>Access Denied</ThemedText>
            <ThemedText style={styles.errorText}>
              This page is only accessible to administrators.
            </ThemedText>
            <TouchableOpacity
              style={styles.backToProfileButton}
              onPress={() => router.back()}
            >
              <ThemedText style={styles.backToProfileButtonText}>Go Back</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </>
    );
  }

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

  const testBackendTokens = async () => {
    setLoading(true);
    addResult('Testing Backend Token Service...');
    
    try {
      const serviceInfo = hybridVimeoService.getServiceInfo();
      addResult(`Backend tokens enabled: ${serviceInfo.useBackendTokens ? '✅ YES' : '❌ NO'}`);
      addResult(`Service initialized: ${serviceInfo.isInitialized ? '✅ YES' : '❌ NO'}`);
      
      if (serviceInfo.useBackendTokens) {
        addResult('🌐 Backend Configuration:');
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 
                          require('../app.json').expo.extra?.EXPO_PUBLIC_BACKEND_URL;
        const appId = process.env.EXPO_PUBLIC_APP_ID || 
                     require('../app.json').expo.extra?.EXPO_PUBLIC_APP_ID;
        
        addResult(`  Backend URL: ${backendUrl}`);
        addResult(`  App ID: ${appId}`);
        addResult(`  Token Info: ${JSON.stringify(serviceInfo.tokenInfo)}`);
        
        // Test backend token fetch
        try {
          const token = await hybridVimeoService.getCurrentToken();
          addResult(`✅ Backend token fetch: SUCCESS`);
          addResult(`  Token: ${token.substring(0, 15)}...`);
        } catch (error) {
          addResult(`❌ Backend token fetch: FAILED`);
          addResult(`  Error: ${error}`);
        }
      } else {
        addResult('📱 Using local token configuration');
        const localToken = process.env.EXPO_PUBLIC_VIMEO_ACCESS_TOKEN || 
                          require('../app.json').expo.extra?.EXPO_PUBLIC_VIMEO_ACCESS_TOKEN;
        addResult(`  Local token available: ${localToken && localToken !== 'your_new_vimeo_token_here' ? '✅ YES' : '❌ NO'}`);
      }
      
    } catch (error) {
      addResult(`❌ Backend token test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testVimeoConnection = async () => {
    setLoading(true);
    addResult('Testing Vimeo API connection...');
    
    try {
      const token = process.env.EXPO_PUBLIC_VIMEO_ACCESS_TOKEN || 
                   require('../app.json').expo.extra?.EXPO_PUBLIC_VIMEO_ACCESS_TOKEN;
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
        
        // Test video access with enhanced filtering
        addResult('Testing video access with enhanced filtering...');
        try {
          const videos = await vimeoService.getAllUserVideos();
          addResult(`✅ Loaded ${videos.length} videos with enhanced access`);
          
          // Show video access statistics
          const restrictedCount = videos.filter(v => v.hasEmbedRestriction).length;
          const privateCount = videos.filter(v => v.isPasswordProtected || v.isPrivateView).length;
          const publicCount = videos.length - restrictedCount - privateCount;
          
          addResult(`📊 Video Access Stats:`);
          addResult(`   - Public videos: ${publicCount}`);
          addResult(`   - Restricted embed: ${restrictedCount}`);
          addResult(`   - Private/Password: ${privateCount}`);
          addResult(`   - Total accessible: ${videos.length}`);
          
          // Show access denied statistics
          const accessStats = await vimeoService.getAccessDeniedStats();
          addResult(`🚨 Access Denied Monitoring:`);
          addResult(`   - Error rate: ${accessStats.errorRate.toFixed(1)}%`);
          addResult(`   - Blocked videos: ${accessStats.accessDeniedCount}`);
          addResult(`   - Recent errors: ${accessStats.recentErrors.length}`);
          
          if (accessStats.recentErrors.length > 0) {
            addResult(`   - Last 3 errors:`);
            accessStats.recentErrors.slice(-3).forEach(error => {
              addResult(`     ${error}`);
            });
          }
          
          // Check embed settings for first few videos
          addResult(`🔍 Checking embed settings for first 3 videos:`);
          videos.slice(0, 3).forEach((video, index) => {
            addResult(`   ${index + 1}. ${video.title}`);
            addResult(`      - ID: ${video.id}`);
            addResult(`      - Embed Privacy: ${video.embedPrivacy || 'public'}`);
            addResult(`      - Has Restrictions: ${video.hasEmbedRestriction ? 'YES' : 'NO'}`);
            addResult(`      - Password Protected: ${video.isPasswordProtected ? 'YES' : 'NO'}`);
            addResult(`      - Private View: ${video.isPrivateView ? 'YES' : 'NO'}`);
          });
          
        } catch (videoError: any) {
          addResult(`❌ Video access test failed: ${videoError.message}`);
        }
      }
    } catch (error: any) {
      addResult(`❌ Vimeo connection error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDirectApiCall = async () => {
    setLoading(true);
    addResult('Testing direct naberla.org API call...');
    
    try {
      const response = await fetch('https://naberla.org/api/playlists', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      addResult(`Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        addResult(`✅ Naberla.org API call success: Found ${data.playlists?.length || 0} playlists`);
        if (data.playlists?.[0]) {
          addResult(`First playlist: "${data.playlists[0].name}" with ${data.playlists[0].videos?.length || 0} videos`);
        }
      } else {
        const errorText = await response.text();
        addResult(`❌ Naberla.org API call failed: ${errorText}`);
      }
    } catch (error: any) {
      addResult(`❌ Naberla.org API call error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetToOriginalState = async () => {
    setLoading(true);
    addResult('🔄 Resetting to original working state...');
    
    try {
      // Clear all the filtering and error tracking we added
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      
      addResult('Clearing private video list...');
      await AsyncStorage.default.removeItem('private_video_ids');
      
      addResult('Clearing access denied log...');
      await AsyncStorage.default.removeItem('access_denied_log');
      
      addResult('🔍 DEBUG: Clearing video cache...');
      try {
        await hybridVimeoService.clearCache();
        addResult('✅ Video cache cleared');
      } catch (error) {
        addResult(`🔍 DEBUG: ❌ Reset error: ${error}`);
      }
      
      addResult('✅ Reset complete - back to original working state!');
      addResult('💡 Now try loading videos again - should work like before');
      showToast('Reset to original state complete!');
    } catch (error: any) {
      addResult(`❌ Reset error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDomainBypass = async () => {
    setLoading(true);
    addResult('Testing domain bypass methods...');
    
    try {
      // Test different embed URLs for a sample video
      const sampleVideoId = '140178314'; // Use a known video ID
      
      addResult(`🔍 Testing different embed methods for video ${sampleVideoId}:`);
      
      // Method 1: Standard embed
      const standardUrl = `https://player.vimeo.com/video/${sampleVideoId}?autoplay=0&title=0&byline=0&portrait=0`;
      addResult(`   1. Standard: ${standardUrl}`);
      
      // Method 2: Premium features
      const premiumUrl = vimeoService.getEmbedUrl(sampleVideoId, { 
        autoplay: true, 
        usePremiumFeatures: true 
      });
      addResult(`   2. Premium Features: ${premiumUrl}`);
      
      // Method 3: Domain bypass
      const bypassUrl = vimeoService.getDomainBypassUrl(sampleVideoId);
      addResult(`   3. Domain Bypass: ${bypassUrl}`);
      
      // Method 4+: Alternative URLs
      const altUrls = vimeoService.getAlternativeUrls(sampleVideoId);
      altUrls.forEach((url, index) => {
        addResult(`   ${index + 4}. Alternative ${index + 1}: ${url}`);
      });
      
      addResult('💡 Try these URLs manually in a browser to see which works');
      addResult('✅ Domain bypass test completed');
      
    } catch (error: any) {
      addResult(`❌ Domain bypass test error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkVideoAccess = async () => {
    setLoading(true);
    addResult('Checking video access status...');
    
    try {
      // Check multiple problematic videos
      const problemVideos = ['287272607', '530776691'];
      
      for (const videoId of problemVideos) {
        addResult(`🔍 Checking access for video ${videoId}:`);
        
        // Check if video exists in API
        try {
          addResult(`   Testing API access...`);
          const videoData = await vimeoService.getVideo(videoId);
          addResult(`   ✅ API Access: SUCCESS`);
          addResult(`   Title: ${videoData.title}`);
          addResult(`   Duration: ${videoData.duration}s`);
        } catch (apiError: any) {
          addResult(`   ❌ API Access: FAILED - ${apiError.message}`);
          if (apiError.message?.includes('401')) {
            addResult(`   💡 Token doesn't have access to this video via API either`);
          }
        }
        
        const accessStatus = await vimeoService.getVideoAccessStatus(videoId);
        
        if (accessStatus.accessible) {
          addResult(`   ✅ Local Status: Accessible`);
        } else {
          addResult(`   ❌ Local Status: NOT accessible`);
          addResult(`     Reason: ${accessStatus.reason}`);
          addResult(`     Last Error: ${accessStatus.lastError}`);
          addResult(`     Error Count: ${accessStatus.errorCount}`);
        }
        
        addResult(''); // Empty line for separation
      }
      
      // Check overall access denied stats
      const stats = await vimeoService.getAccessDeniedStats();
      addResult(`📊 Overall Access Stats:`);
      addResult(`   Total blocked videos: ${stats.accessDeniedCount}`);
      addResult(`   Error rate: ${stats.errorRate.toFixed(1)}%`);
      addResult(`   Recent errors: ${stats.recentErrors.length}`);
      
      if (stats.recentErrors.length > 0) {
        addResult(`   Recent error examples:`);
        stats.recentErrors.slice(-5).forEach(error => {
          addResult(`     - ${error}`);
        });
      }
      
    } catch (error: any) {
      addResult(`❌ Video access check error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkTokenPermissions = async () => {
    setLoading(true);
    addResult('Checking Vimeo token permissions...');
    
    try {
      // Test basic connection first
      const isConnected = await vimeoService.testConnection();
      addResult(`🔗 Basic Connection: ${isConnected ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (!isConnected) {
        addResult('❌ Cannot proceed - basic connection failed');
        return;
      }
      
      // Try to get user info with detailed scopes
      addResult('🔍 Testing token scopes...');
      
      try {
        // Test /me endpoint for user info
        const response = await fetch('https://api.vimeo.com/me', {
          headers: {
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_VIMEO_ACCESS_TOKEN || require('../app.json').expo.extra?.EXPO_PUBLIC_VIMEO_ACCESS_TOKEN}`,
            'Accept': 'application/vnd.vimeo.*+json;version=3.4'
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          addResult(`✅ User Data Access: SUCCESS`);
          addResult(`   User: ${userData.name}`);
          addResult(`   Account: ${userData.account}`);
          addResult(`   Available Scopes: ${userData.available_scopes || 'Not provided'}`);
          
          // Test video list access
          addResult('🎬 Testing video list access...');
          const videoResponse = await fetch('https://api.vimeo.com/me/videos?per_page=1', {
            headers: {
              'Authorization': `Bearer ${process.env.EXPO_PUBLIC_VIMEO_ACCESS_TOKEN || require('../app.json').expo.extra?.EXPO_PUBLIC_VIMEO_ACCESS_TOKEN}`,
              'Accept': 'application/vnd.vimeo.*+json;version=3.4'
            }
          });
          
          if (videoResponse.ok) {
            const videoData = await videoResponse.json();
            addResult(`✅ Video List Access: SUCCESS`);
            addResult(`   Total Videos: ${videoData.total}`);
            addResult(`   Can access video metadata: YES`);
          } else {
            addResult(`❌ Video List Access: FAILED (${videoResponse.status})`);
          }
          
        } else {
          addResult(`❌ User Data Access: FAILED (${response.status})`);
          const errorData = await response.text();
          addResult(`   Error: ${errorData}`);
        }
        
      } catch (error: any) {
        addResult(`❌ Token permission test failed: ${error.message}`);
      }
      
      addResult('💡 If token has limited scopes, some videos may be inaccessible');
      
    } catch (error: any) {
      addResult(`❌ Token permission check error: ${error.message}`);
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
            <ThemedText style={styles.testButtonText}>3. Test Naberla.org API</ThemedText>
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
          
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: '#10B981' }, loading && styles.testButtonDisabled]}
            onPress={resetToOriginalState}
            disabled={loading}
          >
            <ThemedText style={styles.testButtonText}>8. 🔄 Reset to Original State</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: '#8B5CF6' }, loading && styles.testButtonDisabled]}
            onPress={testDomainBypass}
            disabled={loading}
          >
            <ThemedText style={styles.testButtonText}>9. 🌐 Test Domain Bypass</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: '#10B981' }, loading && styles.testButtonDisabled]}
            onPress={testBackendTokens}
            disabled={loading}
          >
            <ThemedText style={styles.testButtonText}>10. 🔗 Test Backend Tokens</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: '#F59E0B' }, loading && styles.testButtonDisabled]}
            onPress={checkVideoAccess}
            disabled={loading}
          >
            <ThemedText style={styles.testButtonText}>11. 🔍 Check Video Access</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: '#EF4444' }, loading && styles.testButtonDisabled]}
            onPress={checkTokenPermissions}
            disabled={loading}
          >
            <ThemedText style={styles.testButtonText}>12. 🔑 Check Token Permissions</ThemedText>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  backToProfileButton: {
    backgroundColor: '#e0af92',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  backToProfileButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});
