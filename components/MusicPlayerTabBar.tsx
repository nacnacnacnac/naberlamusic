import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/IconSymbol';
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
  console.log(prefix + msg, data ?? '');
};
const logError = (prefix: string) => (msg: string, data?: any) => {
  if (!isDev) return;
  console.error(prefix + msg, data ?? '');
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
  onPlaylistPress: () => void;
  onAddToPlaylist: () => void;
  testState?: any;
  onTestStateChange?: (state: any) => void;
}

export default function MusicPlayerTabBar({
  currentVideo,
  isPaused,
  onPlayPause,
  onPrevious,
  onNext,
  onPlaylistPress,
  onAddToPlaylist,
  testState,
  onTestStateChange
}: MusicPlayerTabBarProps) {
  if (!currentVideo) return null;

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
    <LinearGradient
      colors={['#000000', 'rgba(0,0,0,0.9)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0)']}
      style={styles.container}
      start={{ x: 0, y: 1 }}
      end={{ x: 0, y: 0 }}
    >
      {/* Music Controls - Centered */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={onPrevious}>
          <IconSymbol name="backward.fill" size={20} color="#e0af92" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.playPauseButton} onPress={handlePlayPausePress}>
          <IconSymbol 
            name={isPaused ? "play.fill" : "pause.fill"} 
            size={28} 
            color="#e0af92" 
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={onNext}>
          <IconSymbol name="forward.fill" size={20} color="#e0af92" />
        </TouchableOpacity>
      </View>

      {/* Right Actions */}
      <View style={styles.rightActions}>
        <TouchableOpacity style={styles.actionButton} onPress={onPlaylistPress}>
          <IconSymbol name="list.bullet" size={22} color="#e0af92" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
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
    paddingBottom: 40, // Safe area için daha fazla
    height: 150, // Daha büyük footer - gradient için
    zIndex: 1000,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
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
    marginHorizontal: 20,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
