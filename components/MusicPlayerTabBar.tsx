import { CustomIcon } from '@/components/ui/CustomIcon';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Footer Testing Infrastructure
interface FooterTestState {
  buttonPressCount: number;
  visualStateChanges: number;
  lastPressTimestamp: number;
  responseTimeMs: number;
  visualStateMismatch: number;
}

interface ButtonPressEvent {
  timestamp: number;
  pressId: string;
  isPausedBefore: boolean;
  isPausedAfter: boolean;
  visualState: 'play' | 'pause';
}

// Logger factory for production performance
const isDev = __DEV__;
const log = (prefix: string) => (msg: string, data?: any) => {
  if (!isDev) return;
};
const logError = (prefix: string) => (msg: string, data?: any) => {
  if (!isDev) return;
};

// Debug logging for footer component
const footerDebugLog = {
  press: log('🎵🔴 [FOOTER-PRESS] '),
  visual: log('🎵👁️ [FOOTER-VISUAL] '),
  validation: log('🎵✅ [FOOTER-VALIDATION] '),
  error: logError('🎵❌ [FOOTER-ERROR] '),
  performance: log('🎵⚡ [FOOTER-PERF] ')
};

interface MusicPlayerTabBarProps {
  currentVideo: any;
  isPaused: boolean;
  isMuted?: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onAddToPlaylist: () => void;
  onMuteToggle?: () => void;
  onPlaylistToggle?: () => void;
  onProfilePress?: () => void;
  testState?: any;
  onTestStateChange?: (state: any) => void;
}

export default function MusicPlayerTabBar({
  currentVideo,
  isPaused,
  isMuted = false,
  onPlayPause,
  onPrevious,
  onNext,
  onAddToPlaylist,
  onMuteToggle,
  onPlaylistToggle,
  onProfilePress,
  testState,
  onTestStateChange
}: MusicPlayerTabBarProps) {
  // Her zaman göster - currentVideo durumuna bakmadan
  // if (!currentVideo && Platform.OS !== 'web') return null;
  
  // Gerçek mobil cihaz detection (sadece telefon/tablet)
  const { width } = Dimensions.get('window');
  const isMobileDevice = Platform.OS === 'web' && 
    width <= 768 && 
    typeof navigator !== 'undefined' && 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Footer testing state
  const footerTestRef = useRef<FooterTestState>({
    buttonPressCount: 0,
    visualStateChanges: 0,
    lastPressTimestamp: 0,
    responseTimeMs: 0,
    visualStateMismatch: 0
  });
  const pressEventsRef = useRef<ButtonPressEvent[]>([]);
  const lastVisualStateRef = useRef<'play' | 'pause'>(isPaused ? 'play' : 'pause');
  const pressStartTimeRef = useRef<number>(0);

  // Logo animation values
  const logoScale = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;
  



  // Logo heartbeat animation (keep existing)
  const startLogoHeartbeat = () => {
    Animated.sequence([
      // First beat
      Animated.timing(logoScale, {
        toValue: 1.15,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 0.95,
        duration: 100,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      // Second beat
      Animated.timing(logoScale, {
        toValue: 1.1,
        duration: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Repeat animation every 3 seconds
      setTimeout(() => {
        startLogoHeartbeat();
      }, 3000);
    });
  };

  // Start animations on mount
  useEffect(() => {
    const heartbeatTimer = setTimeout(() => {
      startLogoHeartbeat();
    }, 2000); // Start heartbeat after 2 seconds

    return () => {
      clearTimeout(heartbeatTimer);
    };
  }, []); // Only run on mount


  // Track visual state changes and validate consistency
  useEffect(() => {
    const currentVisualState = isPaused ? 'play' : 'pause';
    const previousVisualState = lastVisualStateRef.current;
    
    if (currentVisualState !== previousVisualState) {
      footerDebugLog.visual(`Visual state change: ${previousVisualState} → ${currentVisualState}`);
      footerDebugLog.visual(`Icon will show: ${isPaused ? 'play.fill' : 'pause.fill'}`);
      
      footerTestRef.current.visualStateChanges++;
      lastVisualStateRef.current = currentVisualState;
      
      // Validate visual state matches prop
      const expectedIcon = isPaused ? 'play.fill' : 'pause.fill';
      footerDebugLog.validation(`Visual validation - isPaused: ${isPaused}, Expected icon: ${expectedIcon}`);
      
      // Measure response time if this is from a button press
      if (pressStartTimeRef.current > 0) {
        const responseTime = Date.now() - pressStartTimeRef.current;
        footerTestRef.current.responseTimeMs = responseTime;
        footerDebugLog.performance(`Footer visual update response time: ${responseTime}ms`);
        pressStartTimeRef.current = 0;
      }
    }
  }, [isPaused]);

  // Enhanced play/pause button handler with comprehensive testing
  const handlePlayPausePress = () => {
    const pressTimestamp = Date.now();
    const pressId = `press-${pressTimestamp}`;
    const isPausedBefore = isPaused;
    
    pressStartTimeRef.current = pressTimestamp;
    footerTestRef.current.buttonPressCount++;
    footerTestRef.current.lastPressTimestamp = pressTimestamp;
    
    footerDebugLog.press(`Button press detected - ID: ${pressId}`);
    footerDebugLog.press(`State before press - isPaused: ${isPausedBefore}`);
    footerDebugLog.press(`Expected state after press - isPaused: ${!isPausedBefore}`);
    footerDebugLog.press(`Current visual state: ${lastVisualStateRef.current}`);
    
    // Create button press event record
    const pressEvent: ButtonPressEvent = {
      timestamp: pressTimestamp,
      pressId,
      isPausedBefore,
      isPausedAfter: !isPausedBefore, // Expected state
      visualState: lastVisualStateRef.current
    };
    
    // Store press event
    pressEventsRef.current.push(pressEvent);
    if (pressEventsRef.current.length > 20) {
      pressEventsRef.current = pressEventsRef.current.slice(-20); // Keep last 20
    }
    
    // Validate button state before calling callback
    const expectedVisualState = isPausedBefore ? 'play' : 'pause';
    if (lastVisualStateRef.current === expectedVisualState) {
      footerDebugLog.validation('Button visual state matches isPaused prop - VALID');
    } else {
      footerDebugLog.error('Button visual state mismatch with isPaused prop - INVALID');
      footerTestRef.current.visualStateMismatch++;
    }
    

    // Call the parent callback
    try {
      footerDebugLog.press('Calling onPlayPause callback');
      onPlayPause();
      footerDebugLog.press('onPlayPause callback completed successfully');
    } catch (error) {
      footerDebugLog.error('onPlayPause callback failed:', error);
    }
  };

  // Test helper functions
  const simulateButtonPress = () => {
    footerDebugLog.press('Simulating button press programmatically');
    handlePlayPausePress();
  };

  const validateVisualState = () => {
    const expectedIcon = isPaused ? 'play.fill' : 'pause.fill';
    const currentVisualState = lastVisualStateRef.current;
    const isValid = (isPaused && currentVisualState === 'play') || (!isPaused && currentVisualState === 'pause');
    
    footerDebugLog.validation(`Visual state validation:`);
    footerDebugLog.validation(`- isPaused prop: ${isPaused}`);
    footerDebugLog.validation(`- Expected icon: ${expectedIcon}`);
    footerDebugLog.validation(`- Current visual state: ${currentVisualState}`);
    footerDebugLog.validation(`- Is valid: ${isValid}`);
    
    return {
      isValid,
      isPaused,
      expectedIcon,
      currentVisualState,
      timestamp: Date.now()
    };
  };

  const getFooterTestReport = () => {
    const report = {
      ...footerTestRef.current,
      recentPresses: pressEventsRef.current.slice(-5),
      currentVisualState: lastVisualStateRef.current,
      currentProp: isPaused,
      validationResult: validateVisualState()
    };
    
    footerDebugLog.validation('Footer test report:', report);
    return report;
  };

  // Expose test functions for integration testing
  if (__DEV__ && typeof window !== 'undefined') {
    (window as any).footerTestHelpers = {
      simulateButtonPress,
      validateVisualState,
      getFooterTestReport,
      getTestState: () => footerTestRef.current,
      getPressEvents: () => pressEventsRef.current
    };
  }

  return (
    <>
      {/* Simple black gradient for icons */}
      <LinearGradient
        colors={['transparent', 'transparent', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)', 'rgba(0,0,0,1)', 'rgba(0,0,0,1)']}
        style={styles.iconGradient}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 0, y: 1 }}
        pointerEvents="none"
      />

      {/* Main footer container - only icons */}
      <View style={styles.container}>
      {/* Left Logo - Playlist Toggle with Slap Animation */}
      <View style={styles.leftLogo}>
        <TouchableOpacity 
          onPress={() => {
            onPlaylistToggle?.();
          }}
        >
          <View style={styles.logoContainer}>
            {/* Main Logo */}
            <Animated.View
              style={{
                transform: [{ scale: logoScale }],
                opacity: logoOpacity,
              }}
            >
              <Image
                source={require('@/assets/images/naberla.svg')}
                style={styles.logoImage}
                contentFit="contain"
              />
            </Animated.View>
            
          </View>
        </TouchableOpacity>
      </View>

      {/* Music Controls - Centered */}
      <View style={[
        styles.controls,
        isMobileDevice && styles.controlsMobile
      ]}>
        <TouchableOpacity 
          style={[
            styles.controlButton,
            isMobileDevice && styles.controlButtonMobile
          ]} 
          onPress={() => {
            onPrevious();
          }}
        >
          <CustomIcon name="skip-previous" size={28} color={currentVideo ? "#ffffff" : "#666666"} />
          {__DEV__ && Platform.OS !== 'web' && (
            <Text style={{position: 'absolute', top: -15, fontSize: 8, color: 'yellow', backgroundColor: 'black'}}>
              PREV: {currentVideo ? 'ON' : 'OFF'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.playPauseButton} 
          onPress={() => {
            handlePlayPausePress();
          }}
        >
          <CustomIcon 
            name={isPaused ? "play" : "pause"} 
            size={28} 
            color={Platform.OS === 'web' ? (currentVideo ? "#e0af92" : "#666666") : (currentVideo ? "#e0af92" : "#666666")} 
          />
          {__DEV__ && Platform.OS !== 'web' && (
            <Text style={{position: 'absolute', top: -15, fontSize: 8, color: 'yellow', backgroundColor: 'black'}}>
              PLAY: {currentVideo ? 'ON' : 'OFF'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.controlButton,
            isMobileDevice && styles.controlButtonMobile
          ]} 
          onPress={() => {
            onNext();
          }}
        >
          <CustomIcon name="skip-next" size={28} color={currentVideo ? "#ffffff" : "#666666"} />
          {__DEV__ && Platform.OS !== 'web' && (
            <Text style={{position: 'absolute', top: -15, fontSize: 8, color: 'yellow', backgroundColor: 'black'}}>
              NEXT: {currentVideo ? 'ON' : 'OFF'}
            </Text>
          )}
        </TouchableOpacity>

      </View>

      {/* Right Actions - Mute Button + Profile Icon */}
      <View style={[
        styles.rightActions,
        isMobileDevice && styles.rightActionsMobile
      ]}>
        {/* Mute/Unmute Button - Only show on web for HTML5 video */}
        {Platform.OS === 'web' && onMuteToggle && (
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.muteButton,
              isMobileDevice && styles.muteButtonMobile
            ]} 
            onPress={() => {
              onMuteToggle();
            }}
          >
            <Image
              source={!currentVideo || isMuted ? 
                require('@/assets/images/sound_off.png') : 
                require('@/assets/images/sound_on.png')
              }
              style={[
                styles.soundIcon,
                Platform.OS === 'web' && !isMobileDevice && styles.soundIconWeb,
                isMobileDevice && styles.soundIconMobile,
                { opacity: currentVideo ? 1 : 0.4 }
              ]}
              contentFit="contain"
            />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            styles.profileButton,
            isMobileDevice && styles.profileButtonMobile
          ]} 
          onPress={() => {
            onProfilePress?.();
          }}
        >
          <Image
            source={require('@/assets/images/profile2.png')}
            style={[
              styles.profileImage,
              isMobileDevice && styles.profileImageMobile
            ]}
            contentFit="contain"
          />
        </TouchableOpacity>
      </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  iconGradient: {
    ...(Platform.OS === 'web' ? {
      position: 'fixed', // Web'de fixed
      bottom: 0,
      left: 0,
      right: 0,
    } : {
      position: 'absolute', // Mobile'da absolute
      bottom: 0,
      left: 0,
      right: 0,
    }),
    height: 300, // Daha yukarı doğru uzat (250 → 300)
    zIndex: 1001, // Container'dan (1000) yüksek
  },
  container: {
    ...(Platform.OS === 'web' ? {
      position: 'fixed', // Web'de fixed
      bottom: 0,
      left: 0,
      right: 0,
    } : {
      position: 'absolute', // Mobile'da absolute
      bottom: 0,
      left: 0,
      right: 0,
    }),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'web' ? 30 : 50, // Mobilde daha fazla padding
    height: Platform.OS === 'web' ? 100 : 120, // Mobilde daha yüksek container
    zIndex: 1002, // Gradient'den (1001) yüksek
  },
  leftLogo: {
    width: 80, // Daha küçük genişlik (100 → 80)
    alignItems: 'center', // Ortalanmış hizalama
    justifyContent: 'center',
    marginLeft: -5, // Daha da sağa kaydır (-10 → -5)
  },
  logoContainer: {
    position: 'relative',
    width: 80, // Daha küçük container (100 → 80)
    height: 32, // Daha küçük yükseklik (40 → 32)
    justifyContent: 'center',
    alignItems: 'center', // Ortalanmış hizalama
  },
  logoImage: {
    width: 80, // Daha küçük logo (100 → 80)
    height: 32, // Daha küçük yükseklik (40 → 32)
    marginLeft: 0, // Margin kaldırıldı, ortalanmış
  },
  slapTextContainer: {
    position: 'absolute',
    top: -58, // 50px yukarı çıktı (-8 - 50 = -58)
    left: 20, // 5px sola alındı (25 - 5 = 20)
    zIndex: 10,
    pointerEvents: 'none',
  },
  slapText: {
    color: '#ffffff',
    fontSize: 18.72, // %30 daha büyük (14.4 * 1.3 = 18.72)
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 21.84, // %30 daha büyük (16.8 * 1.3 = 21.84)
    fontFamily: Platform.OS === 'ios' ? 'Marker Felt' : 'monospace',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  handContainer: {
    position: 'absolute',
    top: -5,
    left: -50,
    zIndex: 5,
    pointerEvents: 'none',
  },
  handEmoji: {
    fontSize: 28, // Büyütüldü (20 → 28)
  },
  controls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8, // Sol/sağ okları play/pause'a yaklaştır
    marginLeft: 10, // Play kontrollerini çok az sağa kaydır
  },
  controlsMobile: {
    gap: 2, // Mobilde çok daha az gap - play butonuna yakın
  },
  controlButton: {
    width: 50, // Büyütüldü (40 → 50)
    height: 50, // Büyütüldü (40 → 50)
    borderRadius: 25, // Yarısı (50/2 = 25)
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  controlButtonMobile: {
    marginHorizontal: 2, // Mobilde çok daha az margin - play butonuna yakın
  },
  playPauseButton: {
    width: 65, // Büyütüldü (55 → 65)
    height: 65, // Büyütüldü (55 → 65)
    borderRadius: 32.5, // Yarısı (65/2 = 32.5)
    backgroundColor: 'transparent', // İçi boş
    borderWidth: 1, // Daha ince border
    borderColor: '#333333', // Gri border
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  rightActions: {
    width: 100, // Logo ile eşit genişlik
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rightActionsMobile: {
    gap: 0, // Mobilde hiç gap yok
  },
  actionButton: {
    width: 36,
    height: 36,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  playlistIcon: {
    width: 18,
    height: 18,
  },
  disabledButton: {
    opacity: 0.5,
  },
  
  // Debug styles for footer testing
  debugIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileButton: {
    backgroundColor: 'transparent',
    width: 44,
    height: 44,
    marginRight: 10, // Sola kaydır
  },
  profileButtonMobile: {
    width: 40, // Mobilde büyütüldü (36 → 40)
    height: 40, // Mobilde büyütüldü (36 → 40)
    marginRight: 2, // Mobilde çok az margin
  },
  profileImage: {
    width: 28,
    height: 28,
  },
  profileImageMobile: {
    width: 26, // Mobilde büyütüldü (22 → 26)
    height: 26, // Mobilde büyütüldü (22 → 26)
  },
  muteButton: {
    backgroundColor: 'transparent',
    width: 44, // Profile button ile aynı boyut
    height: 44, // Profile button ile aynı boyut
    marginRight: 8, // Profile button'dan biraz uzak
  },
  muteButtonMobile: {
    width: 40, // Mobilde büyütüldü (36 → 40)
    height: 40, // Mobilde büyütüldü (36 → 40)
    marginRight: -5, // Negatif margin ile üst üste getir
  },
  soundIcon: {
    width: 20,
    height: 20,
  },
  soundIconWeb: {
    width: 26, // Web'de daha büyük
    height: 26, // Web'de daha büyük
  },
  soundIconMobile: {
    width: 22, // Mobilde büyütüldü (18 → 22)
    height: 22, // Mobilde büyütüldü (18 → 22)
  },
});
