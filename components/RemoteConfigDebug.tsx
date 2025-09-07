import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, ScrollView } from 'react-native';
import { useVimeo } from '@/contexts/VimeoContext';
import { remoteConfigService } from '@/services/remoteConfigService';

export function RemoteConfigDebug() {
  const { remoteConfig, refreshRemoteConfig, videos } = useVimeo();
  const [videoIdToBlock, setVideoIdToBlock] = useState('');

  const handleEmergencyHide = async () => {
    Alert.alert(
      'Emergency Hide All',
      'This will hide ALL videos immediately. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Hide All',
          style: 'destructive',
          onPress: async () => {
            await remoteConfigService.setEmergencyHideAll(true, 'Content temporarily unavailable');
            Alert.alert('Success', 'All videos hidden');
          },
        },
      ]
    );
  };

  const handleEmergencyShow = async () => {
    await remoteConfigService.setEmergencyHideAll(false);
    Alert.alert('Success', 'Videos restored');
  };

  const handleBlockVideo = async () => {
    if (!videoIdToBlock.trim()) {
      Alert.alert('Error', 'Please enter a video ID');
      return;
    }
    
    await remoteConfigService.blockVideo(videoIdToBlock.trim());
    setVideoIdToBlock('');
    Alert.alert('Success', `Video ${videoIdToBlock} blocked`);
  };

  const handleRefreshConfig = async () => {
    await refreshRemoteConfig();
    Alert.alert('Success', 'Remote config refreshed');
  };

  if (!remoteConfig) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Remote Config Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🎛️ Remote Config Debug</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        <Text style={styles.info}>Videos Shown: {videos.length}</Text>
        <Text style={styles.info}>Emergency Hide: {remoteConfig.emergencyHideAll ? '🔴 ON' : '🟢 OFF'}</Text>
        <Text style={styles.info}>Filtering: {remoteConfig.enableVideoFiltering ? '🔴 ON' : '🟢 OFF'}</Text>
        <Text style={styles.info}>Blocked Videos: {remoteConfig.blockedVideoIds.length}</Text>
        <Text style={styles.info}>Max Videos: {remoteConfig.maxVideosToShow}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Controls</Text>
        <TouchableOpacity style={styles.dangerButton} onPress={handleEmergencyHide}>
          <Text style={styles.buttonText}>🚨 Emergency Hide All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.successButton} onPress={handleEmergencyShow}>
          <Text style={styles.buttonText}>✅ Restore All Videos</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Block Individual Video</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Video ID"
          value={videoIdToBlock}
          onChangeText={setVideoIdToBlock}
        />
        <TouchableOpacity style={styles.warningButton} onPress={handleBlockVideo}>
          <Text style={styles.buttonText}>🚫 Block Video</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Blocked Videos</Text>
        {remoteConfig.blockedVideoIds.length > 0 ? (
          remoteConfig.blockedVideoIds.map((videoId, index) => (
            <View key={index} style={styles.blockedItem}>
              <Text style={styles.blockedText}>{videoId}</Text>
              <TouchableOpacity
                style={styles.unblockButton}
                onPress={() => remoteConfigService.unblockVideo(videoId)}
              >
                <Text style={styles.unblockText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.info}>No blocked videos</Text>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleRefreshConfig}>
          <Text style={styles.buttonText}>🔄 Refresh Config</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Config Details</Text>
        <Text style={styles.configText}>{JSON.stringify(remoteConfig, null, 2)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  info: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    fontSize: 16,
  },
  dangerButton: {
    backgroundColor: '#ff4444',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  successButton: {
    backgroundColor: '#44ff44',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  warningButton: {
    backgroundColor: '#ffaa00',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  blockedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    marginBottom: 5,
  },
  blockedText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  unblockButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 5,
  },
  unblockText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  configText: {
    fontSize: 10,
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    color: '#333',
  },
});

export default RemoteConfigDebug;
