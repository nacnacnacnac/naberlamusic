import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import MusicPlayerTabBar from '@/components/MusicPlayerTabBar';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: 'none', // Tab bar'ı gizle, kendi music player'ımızı kullanacağız
        },
        swipeEnabled: true, // Swipe gesture'ını aktifleştir
        animationEnabled: true, // Animasyonları aktifleştir
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Naber LA',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="play.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="videos"
        options={{
          title: 'Playlist',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet" color={color} />,
        }}
      />
    </Tabs>
  );
}
