import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, StatusBar, Platform, Animated, Dimensions, Easing } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/contexts/AuthContext';
import { useVimeo } from '@/contexts/VimeoContext';
import * as ScreenOrientation from 'expo-screen-orientation';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { isLoading, videos } = useVimeo();
  const [progressAnim] = useState(new Animated.Value(0));
  const [showLoading, setShowLoading] = useState(false);

  // Logo Animation Values
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const naberX = useRef(new Animated.Value(28)).current; // Start N 70% more to the right
  const laX = useRef(new Animated.Value(8)).current; // Start A 40% more to the right (was 4, now 8)
  const logoOpacity = useRef(new Animated.Value(1)).current;
  const logoWrapperX = useRef(new Animated.Value(-width * 0.1)).current; // Start 20% to the left
  
  // Dynamic mask animation values
  const naberMaskWidth = useRef(new Animated.Value(0)).current; // Start with 0 width (hidden)
  const laMaskWidth = useRef(new Animated.Value(0)).current; // Start with 0 width (hidden)

  // Ripple animation values
  const ripple1Scale = useRef(new Animated.Value(1)).current;
  const ripple1Opacity = useRef(new Animated.Value(0)).current;
  
  // Button entrance animation
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonY = useRef(new Animated.Value(30)).current; // Start 30px below

  // Start logo animation on component mount
  useEffect(() => {
    startLogoAnimation();
  }, []);

  // Force hide home indicator for development
  useEffect(() => {
    const setupScreen = async () => {
      if (Platform.OS === 'ios') {
        // Lock orientation and hide home indicator
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      }
    };
    
    setupScreen();
  }, []);


  const startLogoAnimation = () => {
    // Step 1: Heart appears and grows with heartbeat effect
    Animated.sequence([
      // Initial heart appearance with smooth fade and scale
      Animated.parallel([
        Animated.timing(heartOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1.3,
          duration: 600,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]),
      
      // Heartbeat effect - realistic heart pulse
      Animated.timing(heartScale, {
        toValue: 0.85,
        duration: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1.15,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 0.92,
        duration: 100,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      
      // Wait a moment before text slides
      Animated.delay(400),
      
      // Step 2: Naber and La slide out with synchronized mask effect + Logo wrapper slides to final position
      Animated.parallel([
        // Logo wrapper slides to final position
        Animated.timing(logoWrapperX, {
          toValue: 0, // Move to final position (current position)
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        
        // Naber: slides LEFT from under heart (NABER on left side)
        Animated.timing(naberX, {
          toValue: -72, // 20% more to the left (was -60, now -72)
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(naberMaskWidth, {
          toValue: 120, // Wider mask to prevent clipping (was 100, now 120)
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        
        // La: slides RIGHT from under heart (LA on right side)
        Animated.timing(laX, {
          toValue: 40, // 10% more to the right (was 36, now 40)
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(laMaskWidth, {
          toValue: 50, // Wider mask to prevent clipping (was 36, now 50)
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    ]).start(() => {
      // Start subtle heartbeat after main animation
      startSubtleHeartbeat();
    });
  };

  const startRippleAnimation = () => {
    const singleRipple = () => {
      // Reset to button size and invisible
      ripple1Scale.setValue(1);
      ripple1Opacity.setValue(0.5);
      
      // Animate outward
      Animated.parallel([
        Animated.timing(ripple1Scale, {
          toValue: 3, // Grow outward from button
          duration: 2000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ripple1Opacity, {
          toValue: 0, // Fade out as it grows
          duration: 2000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Wait and repeat
        setTimeout(singleRipple, 1500);
      });
    };
    
    // Start first ripple after delay
    setTimeout(singleRipple, 1000);
  };

  const startSubtleHeartbeat = () => {
    const heartbeatLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1800), // Wait 1.8 seconds
        // First beat
        Animated.timing(heartScale, {
          toValue: 1.15, // More prominent beat
          duration: 150,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 0.98, // Slight dip
          duration: 100,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // Second beat (double beat like real heart)
        Animated.timing(heartScale, {
          toValue: 1.12, // Second beat slightly smaller
          duration: 120,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1, // Back to normal smoothly
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );
    heartbeatLoop.start();
  };

  // Animate progress bar
  useEffect(() => {
    if (isLoading) {
      setShowLoading(true);
      // Start progress animation
      Animated.timing(progressAnim, {
        toValue: 0.7, // 70% while loading
        duration: 2000,
        useNativeDriver: false,
      }).start();
    } else if (videos.length > 0) {
      // Complete progress when loaded
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start(() => {
        // Hide loading after animation
        setTimeout(() => {
          setShowLoading(false);
          // Start button entrance animation
          startButtonEntrance();
        }, 500);
      });
    }
  }, [isLoading, videos.length]);

  const startButtonEntrance = () => {
    Animated.parallel([
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(buttonY, {
        toValue: 0, // Move to final position
        duration: 600,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Start ripple after button appears
      startRippleAnimation();
    });
  };

  const handleEnter = () => {
    if (isLoading) return; // Prevent action while loading
    
    // Sign in user and navigate directly
    signIn();
    
    // Navigate to main app
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 100);
  };

  const isReady = !isLoading && videos.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background Video */}
      <Video
        source={require('@/assets/videos/background.mp4')}
        style={styles.backgroundVideo}
        shouldPlay
        isLooping
        isMuted
        resizeMode="cover"
      />
      
      {/* Dark Overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
        style={styles.overlay}
      />
      
      {/* Content */}
      <View style={styles.content}>
        {/* Animated Logo Wrapper - for easy scaling and positioning */}
        <Animated.View style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ translateX: logoWrapperX }],
          }
        ]}>
          <View style={styles.logoContainer}>
            {/* Naber - with dynamic mask */}
            <Animated.View style={[
              styles.naberContainer,
              {
                transform: [{ translateX: naberX }],
              }
            ]}>
              <View style={styles.naberMaskContainer}>
                <Animated.View style={[
                  styles.naberMask,
                  {
                    width: naberMaskWidth, // Normal left-to-right mask (N first, then A,B,E,R)
                  }
                ]}>
                  <Image
                    source={require('@/assets/images/animation/naber.png')}
                    style={styles.naberImage}
                    contentFit="contain"
                  />
                </Animated.View>
              </View>
            </Animated.View>

            {/* Heart - center with heartbeat */}
            <Animated.View style={[
              styles.heartContainer,
              {
                transform: [{ scale: heartScale }],
                opacity: heartOpacity,
              }
            ]}>
              <Image
                source={require('@/assets/images/animation/heart.png')}
                style={styles.heartImage}
                contentFit="contain"
              />
            </Animated.View>

            {/* La - with dynamic mask */}
            <Animated.View style={[
              styles.laContainer,
              {
                transform: [{ translateX: laX }],
              }
            ]}>
              <View style={styles.laMaskContainer}>
                <Animated.View style={[
                  styles.laMask,
                  {
                    width: laMaskWidth, // Normal left-to-right mask (L first, then A)
                  }
                ]}>
                  <Image
                    source={require('@/assets/images/animation/la.png')}
                    style={styles.laImage}
                    contentFit="contain"
                  />
                </Animated.View>
              </View>
            </Animated.View>
          </View>
        </Animated.View>
        
        {/* Enter Icon Button with Ripples - Animated entrance */}
        <Animated.View style={[
          styles.buttonContainer,
          {
            opacity: buttonOpacity,
            transform: [{ translateY: buttonY }],
          }
        ]}>
          {/* Ripple circle */}
          <Animated.View style={[
            styles.rippleCircle,
            {
              transform: [{ scale: ripple1Scale }],
              opacity: ripple1Opacity,
            }
          ]} />
          
          {/* Main button */}
          <TouchableOpacity
            style={styles.enterIconButton}
            onPress={handleEnter}
            activeOpacity={0.7}
          >
            <View style={styles.arrowIcon}>
              <ThemedText style={styles.arrowText}>›</ThemedText>
            </View>
          </TouchableOpacity>
        </Animated.View>

      </View>

      {/* Progress Bar */}
      {showLoading && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View 
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                }
              ]} 
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  backgroundPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  blackBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 5,
  },
  logoWrapper: {
    // Main wrapper for easy scaling and positioning
    transform: [{ scale: 1 }], // Easy to change: 0.8 for smaller, 1.2 for bigger
    alignSelf: 'center', // Center the wrapper
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: width * 0.4 * 0.4, // 40% shift to the right (40% of 40% of screen width)
  },
  logoContainer: {
    height: 80,
    width: width * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  heartImage: {
    width: 32,
    height: 29,
  },
  naberContainer: {
    position: 'absolute',
    left: '50%', // Start from center reference
    marginLeft: -50, // Centered under heart (closer to center)
    top: 1.0, // Moved up 20% more (1.3 * 0.8 = 1.04 ≈ 1.0)
    zIndex: 1, // Behind heart
  },
  naberMaskContainer: {
    width: 120, // Wider container (was 100, now 120)
    height: 60,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  naberMask: {
    overflow: 'hidden', // This creates the mask effect
    height: 60,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  naberImage: {
    width: 100,
    height: 60,
  },
  heartContainer: {
    position: 'absolute',
    left: '50%',
    marginLeft: -16, // Half of heartImage width (32/2)
    zIndex: 3, // Front (mask)
    top: 16.7, // Moved down 10% more (15.2 * 1.1 = 16.72 ≈ 16.7)
  },
  heartImage: {
    width: 32, // 10% smaller than 36 (36 * 0.9 = 32.4 ≈ 32)
    height: 29, // 10% smaller than 32 (32 * 0.9 = 28.8 ≈ 29)
  },
  laContainer: {
    position: 'absolute',
    left: '50%', // Start from center reference
    marginLeft: -18, // Centered under heart (closer to center)
    top: 13.6, // Moved down 10% more (12.4 * 1.1 = 13.64 ≈ 13.6)
    zIndex: 2, // Behind heart
  },
  laMaskContainer: {
    width: 50, // Wider container (was 36, now 50)
    height: 36,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  laMask: {
    overflow: 'hidden', // This creates the mask effect
    height: 36,
    alignItems: 'flex-start', // Align image to left side of mask (A harfi kalbin içinden başlar)
  },
  laImage: {
    width: 36, // 9% bigger than 33 (33 * 1.09 = 35.97 ≈ 36)
    height: 36, // 9% bigger than 33 (33 * 1.09 = 35.97 ≈ 36)
  },
  logo: {
    width: 250,
    height: 150,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 80, // Progress barın üstünde
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rippleCircle: {
    position: 'absolute',
    width: 70, // Same size as button
    height: 70,
    borderRadius: 35,
    borderWidth: 1, // Thinner border (was 2, now 1)
    borderColor: '#666666', // Dark grey color
    backgroundColor: 'transparent', // Transparent inside
  },
  enterIconButton: {
    width: 70, // Bigger circle to fit the arrow (was 60, now 70)
    height: 70,
    borderRadius: 35, // Perfect circle
    backgroundColor: '#e0af92', // Vurgu rengi
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10, // Above ripples
  },
  arrowIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  arrowText: {
    fontSize: 32, // Smaller to fit properly in circle (was 42, now 32)
    color: '#000000', // Siyah ok
    fontWeight: '300', // Thinner weight for minimal look
    textAlign: 'center',
    lineHeight: 32, // Match font size for better vertical centering
    paddingLeft: 4, // Better horizontal centering for arrow shape
    paddingTop: 1, // Fine-tune vertical position
  },
  enterButtonDisabled: {
    borderColor: '#444444',
    backgroundColor: 'transparent',
    opacity: 0.6,
  },
  enterButtonText: {
    color: '#e0af92',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
  },
  enterButtonTextDisabled: {
    color: '#666666',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(224, 175, 146, 0.2)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#e0af92',
  },
});
