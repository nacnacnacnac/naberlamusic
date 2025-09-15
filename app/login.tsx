import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, StatusBar, Platform, Animated, Dimensions, Easing, Alert, Text } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useVimeo } from '@/contexts/VimeoContext';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/ui/IconSymbol';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';

// Asset imports for web
const appStoreImage = Platform.OS === 'web' ? '/images/appstore2.png' : require('@/assets/images/appstore2.png');
const androidStoreImage = Platform.OS === 'web' ? '/images/android_store.png' : require('@/assets/images/android_store.png');
const backgroundVideo = require('@/assets/videos/NLA.mp4');

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const { isLoading, videos } = useVimeo();
  const { signIn, isLoading: authLoading, isAuthenticated } = useAuth();
  const [progressAnim] = useState(new Animated.Value(0));
  const [showLoading, setShowLoading] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [mainButtonHovered, setMainButtonHovered] = useState(false);
  
  // UI state
  const [showAuthButtons, setShowAuthButtons] = useState(false);

  // Logo Animation Values
  const heartScale = useRef(new Animated.Value(1)).current;
  const heartOpacity = useRef(new Animated.Value(1)).current;
  const naberX = useRef(new Animated.Value(28)).current; // Start N 70% more to the right
  const laX = useRef(new Animated.Value(8)).current; // Start A 40% more to the right (was 4, now 8)
  const logoOpacity = useRef(new Animated.Value(1)).current;
  const logoWrapperX = useRef(new Animated.Value(0)).current; // Start centered
  
  // Dynamic mask animation values
  const naberMaskWidth = useRef(new Animated.Value(0)).current; // Start with 0 width (hidden)
  const laMaskWidth = useRef(new Animated.Value(0)).current; // Start with 0 width (hidden)

  // Ripple animation values
  const ripple1Scale = useRef(new Animated.Value(1)).current;
  const ripple1Opacity = useRef(new Animated.Value(0)).current;
  
  // Button entrance animation - Start visible for better UX
  const buttonOpacity = useRef(new Animated.Value(1)).current; // Always visible
  const buttonY = useRef(new Animated.Value(0)).current; // Start in position
  
  // Hover animation for web
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  // Auth animation values
  const authSlideAnim = useRef(new Animated.Value(0)).current;
  const authFadeAnim = useRef(new Animated.Value(0)).current;
  const authScaleAnim = useRef(new Animated.Value(1)).current;

  // Transition animation values
  const fadeOverlayOpacity = useRef(new Animated.Value(0)).current;
  const [isTransitioning, setIsTransitioning] = useState(false);


  // Check if already authenticated - NO AUTO REDIRECT
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔄 Already authenticated, but staying on login page');
      // User can manually navigate using buttons
    }
  }, [isAuthenticated]);

  // Start logo animation on component mount
  useEffect(() => {
    startLogoAnimation();
    // Start ripple animation immediately since button is always visible
    setTimeout(() => {
      startRippleAnimation();
    }, 2000); // Start after logo animation
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

  // Keyboard event listener for ESC key (Web only)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          if (showPrivacyModal) {
            closePrivacyModal();
          } else if (showSupportModal) {
            closeSupportModal();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showPrivacyModal, showSupportModal]);


  const startLogoAnimation = () => {
    // Step 1: Heart heartbeat effect (skip initial appearance)
    Animated.sequence([
      // Heartbeat effect - realistic heart pulse (2,3,4 steps)
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
        // Logo wrapper stays centered (no movement needed)
        // Animated.timing(logoWrapperX, {
        //   toValue: 0, // Already centered
        //   duration: 800,
        //   easing: Easing.out(Easing.cubic),
        //   useNativeDriver: true,
        // }),
        
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
      // Reset to button size and more visible
      ripple1Scale.setValue(1);
      ripple1Opacity.setValue(0.8); // More visible start
      
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
    
    // Start first ripple immediately
    singleRipple();
  };

  const startSubtleHeartbeat = () => {
    const heartbeatLoop = Animated.loop(
      Animated.sequence([
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
        Animated.delay(1800), // Wait 1.8 seconds between heartbeats
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

  const handleMainButtonPress = () => {
    if (showAuthButtons) {
      // Hide auth buttons
      Animated.parallel([
        Animated.timing(authSlideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(authFadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(authScaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowAuthButtons(false);
      });
    } else {
      // Show auth buttons
      setShowAuthButtons(true);
      Animated.parallel([
        Animated.timing(authSlideAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(authFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(authScaleAnim, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signIn('google');
      // Navigate to main app after successful sign in
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'Sign In Failed',
        error.message || 'Failed to sign in with Google'
      );
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signIn('apple');
      // Navigate to main app after successful sign in
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'Apple Sign In Failed',
        error.message || 'Failed to sign in with Apple'
      );
    }
  };


  const handleGuestSignIn = async () => {
    try {
      console.log('👤 Guest button clicked, starting guest mode...');
      
      // Start transition animation
      setIsTransitioning(true);
      
      // Fade to black animation
      Animated.timing(fadeOverlayOpacity, {
        toValue: 1,
        duration: 800, // 0.8 second fade to black
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        // Navigate after fade completes
        console.log('🚀 Navigating to main app as guest...');
        router.push('/(tabs)');
        
        // Reset transition state after navigation
        setTimeout(() => {
          setIsTransitioning(false);
          fadeOverlayOpacity.setValue(0);
        }, 100);
      });
    } catch (error: any) {
      console.error('❌ Guest mode error:', error);
      setIsTransitioning(false);
      fadeOverlayOpacity.setValue(0);
      Alert.alert(
        'Guest Mode Failed',
        error.message || 'Failed to enter guest mode'
      );
    }
  };

  // Hover animations for web
  const handleMouseEnter = () => {
    if (Platform.OS === 'web') {
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleMouseLeave = () => {
    if (Platform.OS === 'web') {
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  };

  // Modal functions (Web-only)
  const openPrivacyModal = () => {
    if (Platform.OS === 'web') {
      setShowPrivacyModal(true);
      document.body.style.overflow = 'hidden';
    }
  };

  const closePrivacyModal = () => {
    if (Platform.OS === 'web') {
      setShowPrivacyModal(false);
      document.body.style.overflow = 'auto';
    }
  };

  const openSupportModal = () => {
    if (Platform.OS === 'web') {
      setShowSupportModal(true);
      document.body.style.overflow = 'hidden';
    }
  };

  const closeSupportModal = () => {
    if (Platform.OS === 'web') {
      setShowSupportModal(false);
      document.body.style.overflow = 'auto';
    }
  };

  const isReady = !isLoading && videos.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background Video */}
      {Platform.OS === 'web' ? (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          overflow: 'hidden'
        }}>
          <video
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              minWidth: '100%',
              minHeight: '100%',
              width: 'auto',
              height: 'auto',
              transform: 'translate(-50%, -50%)',
              objectFit: 'cover'
            }}
          >
               <source src={backgroundVideo} type="video/mp4" />
          </video>
        </div>
      ) : (
        <View style={styles.videoContainer}>
          <Video
            source={backgroundVideo}
            style={styles.backgroundVideo}
            shouldPlay
            isLooping
            isMuted
            resizeMode="cover"
          />
        </View>
      )}
      
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
        
        {/* Auth Buttons Container - Animated entrance */}
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
          
          {/* Main Action Button */}
          <Animated.View style={[styles.mainButtonContainer, { 
            transform: [
              { scale: authScaleAnim },
              { scale: buttonScale }
            ] 
          }]}>
            <TouchableOpacity
              style={styles.enterIconButton}
              onPress={Platform.OS === 'web' ? handleGuestSignIn : handleMainButtonPress}
              activeOpacity={0.7}
              disabled={authLoading}
              onMouseEnter={Platform.OS === 'web' ? handleMouseEnter : undefined}
              onMouseLeave={Platform.OS === 'web' ? handleMouseLeave : undefined}
            >
              <View style={styles.arrowIcon}>
                {Platform.OS === 'web' ? (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 2,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="32" height="32" style="fill: black;"><path d="M56.379,30.904c1.774,1.103,2.833,3.008,2.833,5.096s-1.059,3.993-2.832,5.096L22.167,62.362 C21.2,62.964,20.101,63.266,19,63.266c-1.004,0-2.008-0.25-2.915-0.755C14.183,61.454,13,59.444,13,57.267V14.733 c0-2.177,1.183-4.187,3.085-5.245c1.903-1.057,4.234-1,6.083,0.149L56.379,30.904z"/></svg>`
                    }}
                  />
                ) : (
                  <ThemedText style={styles.arrowText}>›</ThemedText>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Auth Options */}
          {showAuthButtons && (
            <>
              {/* Google Button - Only on Mobile */}
              {Platform.OS !== 'web' && (
                <Animated.View 
                  style={[
                    styles.authButton,
                    styles.googleButton,
                    {
                      opacity: authFadeAnim,
                      transform: [
                        {
                          translateX: authSlideAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, Platform.OS === 'android' ? -80 : -80], // Android'de daha fazla sola
                          }),
                        },
                        {
                          translateY: authSlideAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, Platform.OS === 'android' ? 0 : 0], // Android'de vurgu butonu ile aynı seviye
                          }),
                        },
                      ],
                    },
                  ]}
                >
                <TouchableOpacity
                  style={styles.authButtonInner}
                  onPress={handleGoogleSignIn}
                  disabled={authLoading}
                >
                  {Platform.OS === 'web' ? (
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      dangerouslySetInnerHTML={{
                        __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24" height="24" style="fill: white;"><path d="M44,24c0,5.88-2.55,11.18-6.59,14.83c0-0.01,0-0.01,0-0.02l-6.19-5.24 c1.86-1.4,3.29-3.33,4.08-5.57H28c-2.209,0-4-1.791-4-4v-4h19.61C43.86,21.27,44,22.66,44,24z M37.62,9.38l-2.916,2.916c-1.473,1.473-3.699,1.753-5.58,0.857C27.571,12.414,25.836,12,24,12 c-5.04,0-9.35,3.1-11.13,7.5l-6.56-4.81v-0.01C9.65,8.32,16.32,4,24,4C29.27,4,34.05,6.05,37.62,9.38z M37.41,38.81c0,0.01,0,0.01,0,0.02C33.86,42.05,29.16,44,24,44c-7.77,0-14.49-4.43-17.8-10.89 v-0.03l6.51-5.02C14.37,32.69,18.79,36,24,36c2.71,0,5.21-0.9,7.22-2.43L37.41,38.81z M12,24c0,1.43,0.25,2.79,0.71,4.06L6.2,33.08v0.03C4.79,30.38,4,27.28,4,24 c0-3.36,0.83-6.53,2.31-9.31l6.56,4.81C12.31,20.89,12,22.41,12,24z"/></svg>`
                      }}
                    />
                  ) : (
                    <Image
                      source={require('@/assets/images/google.png')}
                      style={styles.googleIcon}
                      contentFit="contain"
                    />
                  )}
                </TouchableOpacity>
                </Animated.View>
              )}

              {/* Apple Button - Only on iOS */}
              {Platform.OS === 'ios' && (
                <Animated.View 
                  style={[
                    styles.authButton,
                    styles.appleButton,
                    {
                      opacity: authFadeAnim,
                      transform: [
                        {
                          translateX: authSlideAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 50], // Daha az sağa kaymış
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.authButtonInner}
                    onPress={handleAppleSignIn}
                    disabled={authLoading}
                  >
                    <IconSymbol 
                      name="apple.logo" 
                      size={24} 
                      color="#fff"
                    />
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Guest Mode Button - Only on Mobile */}
              {Platform.OS !== 'web' && (
                <Animated.View 
                  style={[
                    styles.authButton,
                    styles.guestButton,
                    {
                      opacity: authFadeAnim,
                      transform: [
                        {
                          translateX: authSlideAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 80], // Google'ın karşısına (sağa)
                          }),
                        },
                        {
                          translateY: authSlideAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-35, -35], // Başlangıçta da bitişte de 35px yukarıda
                          }),
                        },
                      ],
                    },
                  ]}
                >
                <TouchableOpacity
                  style={styles.authButtonInner}
                  onPress={handleGuestSignIn}
                  disabled={false}
                >
                  {Platform.OS === 'web' ? (
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: 2,
                      }}
                      dangerouslySetInnerHTML={{
                        __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="24" height="24" style="fill: white;"><path d="M56.379,30.904c1.774,1.103,2.833,3.008,2.833,5.096s-1.059,3.993-2.832,5.096L22.167,62.362 C21.2,62.964,20.101,63.266,19,63.266c-1.004,0-2.008-0.25-2.915-0.755C14.183,61.454,13,59.444,13,57.267V14.733 c0-2.177,1.183-4.187,3.085-5.245c1.903-1.057,4.234-1,6.083,0.149L56.379,30.904z"/></svg>`
                      }}
                    />
                  ) : (
                    <Image
                      source={require('@/assets/images/play.png')}
                      style={styles.guestIcon}
                      contentFit="contain"
                    />
                  )}
                </TouchableOpacity>
                </Animated.View>
              )}

            </>
          )}
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

      {/* Web-only Store Logos and Links */}
      {Platform.OS === 'web' && (
        <>
          {/* App Store Logos - Bottom Left */}
          <div style={{
            position: 'fixed',
            bottom: window.innerWidth <= 480 ? '10px' : window.innerWidth <= 768 ? '15px' : '20px',
            left: window.innerWidth <= 480 ? '10px' : window.innerWidth <= 768 ? '15px' : '20px',
            display: 'flex',
            gap: '10px',
            zIndex: 10,
          }}>
            <img 
              src={appStoreImage}
              alt="App Store"
              style={{
                width: window.innerWidth <= 480 ? '80px' : window.innerWidth <= 768 ? '100px' : '120px',
                height: 'auto',
                opacity: 0.6,
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                filter: 'drop-shadow(0 0 10px rgba(224, 175, 146, 0.2))',
                objectFit: 'contain',
              }}
              onMouseEnter={(e) => {
                e.target.style.opacity = '1';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '0.6';
                e.target.style.transform = 'scale(1)';
              }}
              onError={(e) => {
                console.log('App Store image failed to load:', e);
                e.target.style.display = 'none';
              }}
              onClick={() => window.open('https://apps.apple.com/app/naber-la/id6670140659', '_blank')}
            />
            <img 
              src={androidStoreImage}
              alt="Google Play Store"
              style={{
                width: window.innerWidth <= 480 ? '80px' : window.innerWidth <= 768 ? '100px' : '120px',
                height: 'auto',
                opacity: 0.6,
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                filter: 'drop-shadow(0 0 10px rgba(224, 175, 146, 0.2))',
                objectFit: 'contain',
              }}
              onMouseEnter={(e) => {
                e.target.style.opacity = '1';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '0.6';
                e.target.style.transform = 'scale(1)';
              }}
              onError={(e) => {
                console.log('Android Store image failed to load:', e);
                e.target.style.display = 'none';
              }}
              onClick={() => window.open('https://play.google.com/store/apps/details?id=com.nacnac.naberla', '_blank')}
            />
          </div>

          {/* Support and Privacy Links - Bottom Right */}
          <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            zIndex: 10,
          }}>
            <a 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                openSupportModal();
              }}
              style={{
                color: '#666666',
                textDecoration: 'none',
                fontSize: '0.9rem',
                textAlign: 'right',
                transition: 'all 0.3s ease',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: '300',
                letterSpacing: '0.02em',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#999999';
                e.target.style.transform = 'translateX(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#666666';
                e.target.style.transform = 'translateX(0)';
              }}
            >
              Support
            </a>
            <a 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                openPrivacyModal();
              }}
              style={{
                color: '#666666',
                textDecoration: 'none',
                fontSize: '0.9rem',
                textAlign: 'right',
                transition: 'all 0.3s ease',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: '300',
                letterSpacing: '0.02em',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#999999';
                e.target.style.transform = 'translateX(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#666666';
                e.target.style.transform = 'translateX(0)';
              }}
            >
              Privacy Policy
            </a>
          </div>
        </>
      )}

      {/* Privacy Policy Modal - Web Only */}
      {Platform.OS === 'web' && showPrivacyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={closePrivacyModal}
        >
          <div style={{
            backgroundColor: '#000000',
            margin: '2% auto',
            padding: '2rem',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            border: '1px solid rgba(224, 175, 146, 0.2)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            fontFamily: 'Inter, sans-serif',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <span 
              style={{
                color: '#e0af92',
                float: 'right',
                fontSize: '2rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                position: 'absolute',
                top: '1rem',
                right: '1.5rem',
                transition: 'all 0.3s ease',
                opacity: 0.8,
              }}
              onClick={closePrivacyModal}
              onMouseEnter={(e) => {
                e.target.style.opacity = '1';
                e.target.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '0.8';
                e.target.style.color = '#e0af92';
              }}
            >
              ×
            </span>
            
            <h1 style={{
              textAlign: 'center',
              marginBottom: '1rem',
              color: '#e0af92',
              fontSize: '2.5rem',
              fontWeight: '600',
              letterSpacing: '-0.02em',
            }}>
              Privacy Policy
            </h1>
            
            <p style={{
              textAlign: 'center',
              fontStyle: 'italic',
              marginBottom: '2rem',
              color: 'rgba(255, 255, 255, 0.7)',
            }}>
              <strong>Effective Date:</strong> September 7, 2025
            </p>
            
            <div style={{ color: '#ffffff', lineHeight: '1.8' }}>
              <p style={{ marginBottom: '1rem' }}>
                <strong style={{ color: '#e0af92' }}>Naber LA</strong> is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.
              </p>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                1. Information We Collect
              </h2>
              
              <h3 style={{
                color: '#e0af92',
                fontSize: '1.2rem',
                fontWeight: '500',
                margin: '1.5rem 0 0.8rem 0',
                opacity: 0.9,
              }}>
                1.1 Personal Information
              </h3>
              <p style={{ marginBottom: '1rem' }}>When you use Naber LA, we may collect the following personal information:</p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>Device Information:</strong> Device type, operating system, and app version</li>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>Usage Data:</strong> How you interact with the app, features used, and time spent</li>
              </ul>
              
              <h3 style={{
                color: '#e0af92',
                fontSize: '1.2rem',
                fontWeight: '500',
                margin: '1.5rem 0 0.8rem 0',
                opacity: 0.9,
              }}>
                1.2 Content Information
              </h3>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>Playlists:</strong> Video playlists you create and manage</li>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>Video Preferences:</strong> Videos you add to playlists and viewing history</li>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>User-Generated Content:</strong> Any content you create within the app</li>
              </ul>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                2. How We Use Your Information
              </h2>
              <p style={{ marginBottom: '1rem' }}>We use the collected information for the following purposes:</p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>App Functionality:</strong> To provide core features like playlist creation and video management</li>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>Personalization:</strong> To customize your app experience and recommendations</li>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>App Improvement:</strong> To analyze usage patterns and improve our services</li>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>Technical Support:</strong> To provide customer support and troubleshoot issues</li>
              </ul>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                3. Data Storage and Security
              </h2>
              
              <h3 style={{
                color: '#e0af92',
                fontSize: '1.2rem',
                fontWeight: '500',
                margin: '1.5rem 0 0.8rem 0',
                opacity: 0.9,
              }}>
                3.1 Local Storage
              </h3>
              <p style={{ marginBottom: '1rem' }}>Most of your data is stored locally on your device using secure storage mechanisms:</p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Playlists and preferences are stored in encrypted local storage</li>
                <li style={{ marginBottom: '0.5rem' }}>No sensitive personal data is transmitted to external servers without your consent</li>
              </ul>
              
              <h3 style={{
                color: '#e0af92',
                fontSize: '1.2rem',
                fontWeight: '500',
                margin: '1.5rem 0 0.8rem 0',
                opacity: 0.9,
              }}>
                3.2 Third-Party Services
              </h3>
              <p style={{ marginBottom: '1rem' }}>We integrate with the following third-party services:</p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>Vimeo API:</strong> For music content streaming and access. All content is hosted on Vimeo's platform with proper licensing agreements and is subject to Vimeo's content policies and copyright protection mechanisms (governed by Vimeo's Privacy Policy and Terms of Service)</li>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>Google Sign-In:</strong> For authentication (governed by Google's Privacy Policy)</li>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>Apple Sign-In:</strong> For authentication (governed by Apple's Privacy Policy)</li>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>Expo/React Native:</strong> For app development and analytics</li>
              </ul>
              
              <h3 style={{
                color: '#e0af92',
                fontSize: '1.2rem',
                fontWeight: '500',
                margin: '1.5rem 0 0.8rem 0',
                opacity: 0.9,
              }}>
                3.3 Content Licensing & Copyright
              </h3>
              <p style={{ marginBottom: '1rem' }}>Our app uses Vimeo's official API to stream music content. All content licensing, copyright compliance, and content moderation is handled by Vimeo's platform:</p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Content is hosted on Vimeo with proper licensing agreements</li>
                <li style={{ marginBottom: '0.5rem' }}>Protected by Vimeo's advanced copyright detection systems</li>
                <li style={{ marginBottom: '0.5rem' }}>Compliant with Vimeo's Terms of Service and licensing requirements</li>
                <li style={{ marginBottom: '0.5rem' }}>Only accessible through authenticated API calls with proper permissions</li>
                <li style={{ marginBottom: '0.5rem' }}>Subject to Vimeo's content policies and takedown procedures</li>
              </ul>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                4. Data Sharing and Disclosure
              </h2>
              <p style={{ marginBottom: '1rem' }}>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>With Your Consent:</strong> When you explicitly agree to share information</li>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>Legal Requirements:</strong> When required by law, court order, or government request</li>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>Service Providers:</strong> With trusted partners who help us operate the app (under strict confidentiality agreements)</li>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>Safety and Security:</strong> To protect the rights, property, or safety of our users</li>
              </ul>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                5. Your Rights and Choices
              </h2>
              
              <h3 style={{
                color: '#e0af92',
                fontSize: '1.2rem',
                fontWeight: '500',
                margin: '1.5rem 0 0.8rem 0',
                opacity: 0.9,
              }}>
                5.1 Access and Control
              </h3>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>Data Access:</strong> You can access your playlist and app data at any time</li>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>Data Deletion:</strong> You can delete your playlists and app data within the app</li>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>App Control:</strong> You can control data collection through app settings</li>
              </ul>
              
              <h3 style={{
                color: '#e0af92',
                fontSize: '1.2rem',
                fontWeight: '500',
                margin: '1.5rem 0 0.8rem 0',
                opacity: 0.9,
              }}>
                5.2 Data Portability
              </h3>
              <p style={{ marginBottom: '1rem' }}>You have the right to export your playlist data in a standard format upon request.</p>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                6. Children's Privacy
              </h2>
              <p style={{ marginBottom: '1rem' }}>Naber LA is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information.</p>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                7. International Data Transfers
              </h2>
              <p style={{ marginBottom: '1rem' }}>Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your personal information in accordance with applicable data protection laws.</p>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                8. Data Retention
              </h2>
              <p style={{ marginBottom: '1rem' }}>We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy. You can delete your playlist data and associated information at any time through the app settings.</p>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                9. Changes to This Privacy Policy
              </h2>
              <p style={{ marginBottom: '1rem' }}>We may update this Privacy Policy from time to time. We will notify you of any material changes by:</p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>Posting the updated policy in the app</li>
                <li style={{ marginBottom: '0.5rem' }}>Sending you a notification through the app or email</li>
                <li style={{ marginBottom: '0.5rem' }}>Updating the "Effective Date" at the top of this policy</li>
              </ul>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                10. Third-Party Links
              </h2>
              <p style={{ marginBottom: '1rem' }}>Our app may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to read their privacy policies before providing any personal information.</p>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                11. California Privacy Rights
              </h2>
              <p style={{ marginBottom: '1rem' }}>If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect and how we use it, and the right to delete your personal information.</p>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                12. Contact Us
              </h2>
              
              <h3 style={{
                color: '#e0af92',
                fontSize: '1.2rem',
                fontWeight: '500',
                margin: '1.5rem 0 0.8rem 0',
                opacity: 0.9,
              }}>
                Get in Touch
              </h3>
              <p style={{ marginBottom: '1rem' }}>If you have any questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact us:</p>
              <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>Email:</strong> la@naberla.music</li>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>App:</strong> Use the "Contact Support" feature in the app settings</li>
                <li style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#e0af92' }}>Address:</strong> Naber LA Privacy Team</li>
              </ul>
              
              <p style={{ marginBottom: '1rem' }}><strong style={{ color: '#e0af92' }}>Response Time:</strong> We will respond to your inquiries within 30 days.</p>
              
              <div style={{
                textAlign: 'center',
                marginTop: '2rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.7)',
              }}>
                <p>© 2025 Naber LA. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Modal - Web Only */}
      {Platform.OS === 'web' && showSupportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={closeSupportModal}
        >
          <div style={{
            backgroundColor: '#000000',
            margin: '2% auto',
            padding: '2rem',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            border: '1px solid rgba(224, 175, 146, 0.2)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            fontFamily: 'Inter, sans-serif',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <span 
              style={{
                color: '#e0af92',
                float: 'right',
                fontSize: '2rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                position: 'absolute',
                top: '1rem',
                right: '1.5rem',
                transition: 'all 0.3s ease',
                opacity: 0.8,
              }}
              onClick={closeSupportModal}
              onMouseEnter={(e) => {
                e.target.style.opacity = '1';
                e.target.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '0.8';
                e.target.style.color = '#e0af92';
              }}
            >
              ×
            </span>
            
            <h1 style={{
              textAlign: 'center',
              marginBottom: '1rem',
              color: '#e0af92',
              fontSize: '2.5rem',
              fontWeight: '600',
              letterSpacing: '-0.02em',
            }}>
              Support Center
            </h1>
            
            <p style={{
              textAlign: 'center',
              marginBottom: '2rem',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '1.1rem',
            }}>
              Get help with Naber LA Music Streaming App
            </p>
            
            <div style={{ color: '#ffffff', lineHeight: '1.8' }}>
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                📞 Contact Information
              </h2>
              
              <div style={{
                background: 'rgba(224, 175, 146, 0.1)',
                border: '1px solid rgba(224, 175, 146, 0.2)',
                borderRadius: '15px',
                padding: '25px',
                margin: '25px 0',
                backdropFilter: 'blur(10px)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', padding: '10px 0' }}>
                  <span style={{ marginRight: '15px', fontSize: '1.5rem' }}>📧</span>
                  <div>
                    <strong>Email Support:</strong> 
                    <a href="mailto:support@naberla.music" style={{ color: '#e0af92', textDecoration: 'none', marginLeft: '8px' }}>support@naberla.music</a>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', padding: '10px 0' }}>
                  <span style={{ marginRight: '15px', fontSize: '1.5rem' }}>💬</span>
                  <div>
                    <strong>General Inquiries:</strong> 
                    <a href="mailto:info@naberla.music" style={{ color: '#e0af92', textDecoration: 'none', marginLeft: '8px' }}>info@naberla.music</a>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0' }}>
                  <span style={{ marginRight: '15px', fontSize: '1.5rem' }}>⏱️</span>
                  <div>
                    <strong>Response Time:</strong> We typically respond within 24-48 hours
                  </div>
                </div>
              </div>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                ❓ Frequently Asked Questions
              </h2>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '15px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ color: '#e0af92', fontWeight: '600', fontSize: '1.1rem', marginBottom: '10px' }}>
                  How do I sign in to the app?
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.7' }}>
                  You can sign in using your Google account or Apple ID. Simply tap the respective sign-in button on the login screen or in your profile.
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '15px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ color: '#e0af92', fontWeight: '600', fontSize: '1.1rem', marginBottom: '10px' }}>
                  Can I use the app without signing in?
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.7' }}>
                  Yes! You can browse and listen to music as a guest. However, some features like creating playlists require signing in.
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '15px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ color: '#e0af92', fontWeight: '600', fontSize: '1.1rem', marginBottom: '10px' }}>
                  How do I create and manage playlists?
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.7' }}>
                  After signing in, tap the "+" button next to any song to add it to a playlist. You can create new playlists or add to existing ones. Access your playlists from the bottom navigation bar.
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '15px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ color: '#e0af92', fontWeight: '600', fontSize: '1.1rem', marginBottom: '10px' }}>
                  How do I delete my account?
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.7' }}>
                  Go to your Profile page and tap "Delete Account". This will permanently remove all your data and cannot be undone.
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '15px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ color: '#e0af92', fontWeight: '600', fontSize: '1.1rem', marginBottom: '10px' }}>
                  The app is not working properly. What should I do?
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.7' }}>
                  Try restarting the app first. If the problem persists, please contact us at support@naberla.music with details about the issue and your device information.
                </div>
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '15px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ color: '#e0af92', fontWeight: '600', fontSize: '1.1rem', marginBottom: '10px' }}>
                  How do I report a bug or suggest a feature?
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.7' }}>
                  We love hearing from our users! Please email us at support@naberla.music with your feedback, bug reports, or feature suggestions.
                </div>
              </div>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                🛠️ Technical Support
              </h2>
              <p style={{ marginBottom: '1rem' }}>If you're experiencing technical issues, please include the following information when contacting us:</p>
              <ul style={{ 
                listStyle: 'none',
                padding: 0,
                marginBottom: '1rem',
              }}>
                <li style={{
                  background: 'rgba(224, 175, 146, 0.1)',
                  marginBottom: '8px',
                  padding: '12px 15px',
                  borderRadius: '8px',
                  borderLeft: '3px solid #e0af92',
                }}>
                  <strong style={{ color: '#e0af92' }}>Device:</strong> iPhone/Android model and operating system version
                </li>
                <li style={{
                  background: 'rgba(224, 175, 146, 0.1)',
                  marginBottom: '8px',
                  padding: '12px 15px',
                  borderRadius: '8px',
                  borderLeft: '3px solid #e0af92',
                }}>
                  <strong style={{ color: '#e0af92' }}>App Version:</strong> Current version of Naber LA app
                </li>
                <li style={{
                  background: 'rgba(224, 175, 146, 0.1)',
                  marginBottom: '8px',
                  padding: '12px 15px',
                  borderRadius: '8px',
                  borderLeft: '3px solid #e0af92',
                }}>
                  <strong style={{ color: '#e0af92' }}>Issue Description:</strong> Detailed description of the problem
                </li>
                <li style={{
                  background: 'rgba(224, 175, 146, 0.1)',
                  marginBottom: '8px',
                  padding: '12px 15px',
                  borderRadius: '8px',
                  borderLeft: '3px solid #e0af92',
                }}>
                  <strong style={{ color: '#e0af92' }}>Steps to Reproduce:</strong> What you were doing when the issue occurred
                </li>
                <li style={{
                  background: 'rgba(224, 175, 146, 0.1)',
                  marginBottom: '8px',
                  padding: '12px 15px',
                  borderRadius: '8px',
                  borderLeft: '3px solid #e0af92',
                }}>
                  <strong style={{ color: '#e0af92' }}>Screenshots:</strong> If applicable, screenshots help us understand the issue better
                </li>
              </ul>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                🎵 Content & Licensing
              </h2>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '15px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ color: '#e0af92', fontWeight: '600', fontSize: '1.1rem', marginBottom: '10px' }}>
                  How is music content licensed in the app?
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.7' }}>
                  Our app uses Vimeo's official API to stream music content. All content is:
                  <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                    <li style={{ marginBottom: '0.5rem' }}>Hosted on Vimeo's platform with proper licensing agreements</li>
                    <li style={{ marginBottom: '0.5rem' }}>Protected by Vimeo's advanced copyright detection systems</li>
                    <li style={{ marginBottom: '0.5rem' }}>Compliant with Vimeo's Terms of Service and licensing requirements</li>
                    <li style={{ marginBottom: '0.5rem' }}>Only accessible through authenticated API calls with proper permissions</li>
                  </ul>
                  <br />
                  <strong>Vimeo API Documentation:</strong> <a href="https://developer.vimeo.com/api" style={{ color: '#e0af92', textDecoration: 'none' }} target="_blank">https://developer.vimeo.com/api</a><br />
                  <strong>Content Compliance:</strong> All content is subject to Vimeo's content policies and copyright protection mechanisms.
                </div>
              </div>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                🔒 Privacy & Data
              </h2>
              <p style={{ marginBottom: '1rem' }}>For questions about privacy and data handling, please review our Privacy Policy or contact us directly at <a href="mailto:privacy@naberla.music" style={{ color: '#e0af92', textDecoration: 'none' }}>privacy@naberla.music</a>.</p>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                📱 App Features
              </h2>
              <ul style={{ 
                listStyle: 'none',
                padding: 0,
                marginBottom: '1rem',
              }}>
                <li style={{
                  background: 'rgba(224, 175, 146, 0.1)',
                  marginBottom: '8px',
                  padding: '12px 15px',
                  borderRadius: '8px',
                  borderLeft: '3px solid #e0af92',
                }}>
                  <strong style={{ color: '#e0af92' }}>Music Streaming:</strong> High-quality audio streaming
                </li>
                <li style={{
                  background: 'rgba(224, 175, 146, 0.1)',
                  marginBottom: '8px',
                  padding: '12px 15px',
                  borderRadius: '8px',
                  borderLeft: '3px solid #e0af92',
                }}>
                  <strong style={{ color: '#e0af92' }}>Playlist Management:</strong> Create and organize your music collections
                </li>
                <li style={{
                  background: 'rgba(224, 175, 146, 0.1)',
                  marginBottom: '8px',
                  padding: '12px 15px',
                  borderRadius: '8px',
                  borderLeft: '3px solid #e0af92',
                }}>
                  <strong style={{ color: '#e0af92' }}>Guest Mode:</strong> Browse music without creating an account
                </li>
                <li style={{
                  background: 'rgba(224, 175, 146, 0.1)',
                  marginBottom: '8px',
                  padding: '12px 15px',
                  borderRadius: '8px',
                  borderLeft: '3px solid #e0af92',
                }}>
                  <strong style={{ color: '#e0af92' }}>Cross-Platform:</strong> Available on iOS and Android
                </li>
                <li style={{
                  background: 'rgba(224, 175, 146, 0.1)',
                  marginBottom: '8px',
                  padding: '12px 15px',
                  borderRadius: '8px',
                  borderLeft: '3px solid #e0af92',
                }}>
                  <strong style={{ color: '#e0af92' }}>Offline Support:</strong> Some features work without internet connection
                </li>
              </ul>
              
              <h2 style={{
                color: '#e0af92',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '2rem 0 1rem 0',
                borderBottom: '2px solid rgba(224, 175, 146, 0.3)',
                paddingBottom: '0.8rem',
              }}>
                💌 Get in Touch
              </h2>
              <p style={{ marginBottom: '1rem' }}>We value your feedback and are committed to providing the best music streaming experience. Don't hesitate to reach out with any questions, suggestions, or concerns.</p>
              
              <div style={{
                textAlign: 'center',
                marginTop: '2rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.7)',
              }}>
                <p><strong>Naber LA Music Streaming App</strong></p>
                <p>© 2025 Naber LA. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fade to Black Transition Overlay */}
      {isTransitioning && (
        <Animated.View style={[
          styles.fadeOverlay,
          {
            opacity: fadeOverlayOpacity,
          }
        ]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    width: '100%',
    height: '100%',
    minHeight: '100vh',
    overflow: 'hidden',
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  backgroundVideo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '100vw',
    height: '100vh',
    minWidth: '100%',
    minHeight: '100%',
    transform: [
      { translateX: '-50%' },
      { translateY: '-50%' },
      { scale: 1.1 }
    ],
    objectFit: 'cover',
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
    paddingHorizontal: '5%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    zIndex: 5,
  },
  logoWrapper: {
    // Main wrapper for easy scaling and positioning
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  logoContainer: {
    height: 80,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    alignSelf: 'center',
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
    zIndex: 100, // En üstte olsun
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
    zIndex: 200, // Above ripples
    cursor: Platform.OS === 'web' ? 'pointer' : 'default',
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
  
  // Auth Button Styles
  mainButtonContainer: {
    position: 'absolute',
    zIndex: 3,
  },
  authButton: {
    position: 'absolute',
    width: 70, // Ana tuş ile aynı büyüklük
    height: 70,
    borderRadius: 35,
    backgroundColor: 'transparent', // İçi boş
    borderWidth: 2,
    borderColor: '#444', // Koyu gri border
    zIndex: 2,
  },
  authButtonInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 33,
    backgroundColor: 'transparent', // İçi boş, beyaz değil
  },
  googleButton: {
    // Platform-specific positioning handled by transform animations
  },
  appleButton: {
    right: -70, // 70px aralık
  },
  guestButton: {
    top: 0, // Vurgu butonun arkasında başlıyor (aynı konumda)
    borderColor: '#e0af92', // Vurgu rengi border
  },
  googleIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff', // SVG'yi beyaz yapar
  },
  guestIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff', // Beyaz renk
    marginLeft: 2, // Play ikonu için sağa kaydırma
  },
  
  // Fade transition overlay
  fadeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 9999, // En üstte olsun
  },
});
