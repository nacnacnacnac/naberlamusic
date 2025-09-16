import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { CustomIcon } from '@/components/ui/CustomIcon';
import { Image } from 'expo-image';

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
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onAddToPlaylist: () => void;
  onPlaylistToggle?: () => void;
  onProfilePress?: () => void;
  testState?: any;
  onTestStateChange?: (state: any) => void;
}

export default function MusicPlayerTabBar({
  currentVideo,
  isPaused,
  onPlayPause,
  onPrevious,
  onNext,
  onAddToPlaylist,
  onPlaylistToggle,
  onProfilePress,
  testState,
  onTestStateChange
}: MusicPlayerTabBarProps) {
  // Web'de currentVideo yokken de göster, mobile'da sadece currentVideo varken göster
  if (!currentVideo && Platform.OS !== 'web') return null;
  

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
  
  // Slap animation values
  const handPosition = useRef(new Animated.Value(-50)).current;
  const handOpacity = useRef(new Animated.Value(0)).current;
  const handRotation = useRef(new Animated.Value(20)).current;
  const handScale = useRef(new Animated.Value(1)).current;
  const textScale = useRef(new Animated.Value(0)).current; // Başlangıçta görünmez
  const textRotation = useRef(new Animated.Value(0)).current;


  // Slap animation
  const startSlapAnimation = () => {
    // Reset values
    handPosition.setValue(-50);
    handOpacity.setValue(0);
    handRotation.setValue(20);
    handScale.setValue(1);
    textScale.setValue(0); // Yazıyı da reset et
    textRotation.setValue(0);

    Animated.parallel([
      // Hand animation
      Animated.sequence([
        // Hand appears and moves to slap position
        Animated.timing(handOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(handPosition, {
          toValue: 55, // Biraz daha sağa
          duration: 275,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        // Slap impact - vurma anı
        Animated.timing(handRotation, {
          toValue: -5,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(handScale, {
          toValue: 1.4, // Büyük el
          duration: 50,
          useNativeDriver: true,
        }),
        // Geri sekme
        Animated.timing(handPosition, {
          toValue: 50, // Geri sekme de biraz daha sağa
          duration: 75,
          useNativeDriver: true,
        }),
        Animated.timing(handRotation, {
          toValue: 5,
          duration: 75,
          useNativeDriver: true,
        }),
        Animated.timing(handScale, {
          toValue: 1,
          duration: 75,
          useNativeDriver: true,
        }),
        // Hand exits - başladığı yere geri dön (opacity olmadan)
        Animated.parallel([
          Animated.timing(handPosition, {
            toValue: -50, // Başladığı yere geri dön
            duration: 400,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(handRotation, {
            toValue: 0, // Normal pozisyona dön
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Text animation - opacity ile gelsin, el vurduktan sonra gitsin
      Animated.sequence([
        // Yazı gidiş animasyonunun tersi - güzel geliş
        Animated.timing(textScale, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.back(1.7)), // Gidiş animasyonunun tersi
          useNativeDriver: true,
        }),
        // Wait for slap impact (375ms'de vurma oluyor)
        Animated.delay(75), // Toplam 375ms olacak şekilde ayarlandı (300+75=375)
        // Text wobble on impact
        Animated.parallel([
          Animated.timing(textScale, {
            toValue: 1.15,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(textRotation, {
            toValue: 8,
            duration: 50,
            useNativeDriver: true,
          }),
        ]),
        // Bounce back
        Animated.parallel([
          Animated.timing(textScale, {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(textRotation, {
            toValue: -8,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // Secondary bounce
        Animated.parallel([
          Animated.timing(textScale, {
            toValue: 1.05,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(textRotation, {
            toValue: 4,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        // Return to normal
        Animated.parallel([
          Animated.timing(textScale, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(textRotation, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        // El vurduktan sonra yazı gitsin
        Animated.delay(200),
        Animated.timing(textScale, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Repeat animation every 4 seconds
      setTimeout(() => {
        startSlapAnimation();
      }, 4000);
    });
  };

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

    const slapTimer = setTimeout(() => {
      startSlapAnimation();
    }, 3000); // Start slap animation after 3 seconds

    return () => {
      clearTimeout(heartbeatTimer);
      clearTimeout(slapTimer);
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
        colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,1)']}
        style={styles.iconGradient}
        start={{ x: 0, y: 0 }}
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
            
            {/* Slap Me Text Overlay */}
            <Animated.View
              style={[
                styles.slapTextContainer,
                {
                  transform: [
                    { scale: textScale },
                    { rotate: textRotation.interpolate({
                        inputRange: [-180, 180],
                        outputRange: ['-180deg', '180deg']
                      })
                    }
                  ],
                }
              ]}
            >
              <Text style={styles.slapText}>sLAP{'\n'}mE!</Text>
            </Animated.View>
            
            {/* Hand Animation */}
            <Animated.View
              style={[
                styles.handContainer,
                {
                  opacity: handOpacity,
                  transform: [
                    { translateX: handPosition },
                    { rotate: handRotation.interpolate({
                        inputRange: [-180, 180],
                        outputRange: ['-180deg', '180deg']
                      })
                    },
                    { scale: handScale }
                  ],
                }
              ]}
            >
              <Text style={styles.handEmoji}>👋🏽</Text>
            </Animated.View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Music Controls - Centered */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={() => {
            onPrevious();
          }}
        >
          <CustomIcon name="skip-previous" size={20} color={currentVideo ? "#ffffff" : "#666666"} />
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
          style={styles.controlButton} 
          onPress={() => {
            onNext();
          }}
        >
          <CustomIcon name="skip-next" size={20} color={currentVideo ? "#ffffff" : "#666666"} />
          {__DEV__ && Platform.OS !== 'web' && (
            <Text style={{position: 'absolute', top: -15, fontSize: 8, color: 'yellow', backgroundColor: 'black'}}>
              NEXT: {currentVideo ? 'ON' : 'OFF'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Right Actions - Profile Icon */}
      <View style={styles.rightActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.profileButton]} 
          onPress={() => {
            onProfilePress?.();
          }}
        >
          <Image
            source={require('@/assets/images/profile.png')}
            style={styles.profileImage}
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250, // Yukarı doğru uzat (190 → 250)
    zIndex: 1,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 30, // İconları çok az daha yukarı
    height: 100, // Daha küçük container
    zIndex: 100, // Daha yüksek z-index
  },
  leftLogo: {
    width: 100, // Sabit genişlik
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  logoContainer: {
    position: 'relative',
    width: 100,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  logoImage: {
    width: 100, // 80'den 100'e çıkarıldı (%25 büyük)
    height: 40, // 32'den 40'a çıkarıldı (%25 büyük)
    marginLeft: -10, // Logo'yu daha sola taşı
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
    gap: 15,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  playPauseButton: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: 'transparent', // İçi boş
    borderWidth: 2,
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
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    borderWidth: 2,
    borderColor: '#444444',
    width: 44,
    height: 44,
    marginRight: 10, // Sola kaydır
  },
  profileImage: {
    width: 28,
    height: 28,
  },
});
