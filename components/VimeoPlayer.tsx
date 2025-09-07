import React, { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SimplifiedVimeoVideo } from '@/types/vimeo';
import { VimeoWrapper, VimeoWrapperRef } from './VimeoWrapper';

// VimeoPlayer Testing Infrastructure
interface PlayerTestState {
  commandsExecuted: number;
  commandsSuccessful: number;
  commandsFailed: number;
  averageCommandLatency: number;
  stateTransitions: number;
  errorRecoveryAttempts: number;
  lastCommandType: 'play' | 'pause' | 'getCurrentTime' | null;
  lastCommandTimestamp: number;
  playerReadyTransitions: number;
}

interface CommandExecution {
  id: string;
  type: 'play' | 'pause' | 'getCurrentTime';
  timestamp: number;
  startTime: number;
  endTime?: number;
  success?: boolean;
  error?: string;
  latencyMs?: number;
  playerState: {
    isReady: boolean;
    internalPaused: boolean;
    isVideoChanging: boolean;
  };
}

interface StateTransition {
  timestamp: number;
  from: any;
  to: any;
  trigger: string;
  source: 'prop-change' | 'player-event' | 'internal';
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

// Enhanced debug logging for VimeoPlayer
const playerDebugLog = {
  command: log('🎬⚙️ [PLAYER-CMD] '),
  state: log('🎬🔄 [PLAYER-STATE] '),
  integration: log('🎬🔗 [PLAYER-INTEGRATION] '),
  performance: log('🎬⚡ [PLAYER-PERF] '),
  error: logError('🎬❌ [PLAYER-ERROR] '),
  recovery: log('🎬🔧 [PLAYER-RECOVERY] '),
  validation: log('🎬✅ [PLAYER-VALIDATION] '),
  test: log('🎬🧪 [PLAYER-TEST] ')
};

/**
 * VimeoPlayer Component - Uses single Vimeo Player.js instance via ref-driven API
 * 
 * This component creates a unified bridge to the Vimeo Player.js API, avoiding
 * HTML5 video element manipulation and ensuring single-player control.
 * 
 * Key changes:
 * - Uses VimeoWrapper with standardized bridge API
 * - No direct JavaScript injection from this component
 * - Single Vimeo.Player instance managed by wrapper
 * - Readiness check based on wrapper's player_ready event
 * - All commands go through wrapper's ref methods
 */

// Interface for exposed control methods
export interface VimeoPlayerRef {
  play(): Promise<void>;
  pause(): Promise<void>;
  getCurrentTime(): Promise<number>;
  isReady(): boolean;
  flushPosition(): Promise<void>;
  // Testing methods
  getPlayerState?(): any;
  validateStateSync?(): any;
  simulatePlayerEvent?(event: string, data?: any): void;
  measureCommandLatency?(command: 'play' | 'pause'): Promise<number>;
  testErrorRecovery?(): Promise<void>;
  getTestReport?(): any;
}

interface VimeoPlayerProps {
  video: SimplifiedVimeoVideo;
  isFullscreen?: boolean;
  playerHeight?: number;
  onFullscreenToggle?: () => void;
  onError?: (error: string) => void;
  onVideoEnd?: () => void;
  isPaused?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

const VimeoPlayer = forwardRef<VimeoPlayerRef, VimeoPlayerProps>(({ 
  video, 
  isFullscreen = false, 
  playerHeight = 300,
  onFullscreenToggle,
  onError,
  onVideoEnd,
  isPaused = false,
  onPlayStateChange,
  onTimeUpdate
}, ref) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const vimeoWrapperRef = useRef<VimeoWrapperRef>(null);
  const [internalPaused, setInternalPaused] = useState(isPaused);
  const [savedPosition, setSavedPosition] = useState<number>(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [positionLoaded, setPositionLoaded] = useState(false);
  const [isVideoChanging, setIsVideoChanging] = useState(false); // Track video transition periods
  const [reloadNonce, setReloadNonce] = useState(0); // Force WebView reload on retry
  const lastSavedRef = useRef(0);
  const lastKnownTimeRef = useRef(0); // Cache last known time from timeupdate for fallback
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const pendingDesiredPauseRef = useRef<boolean | null>(null);
  const [isAppInBackground, setIsAppInBackground] = useState(false);
  const queuedCommandsRef = useRef<Array<() => Promise<void>>>([]);

  // Testing infrastructure state
  const playerTestRef = useRef<PlayerTestState>({
    commandsExecuted: 0,
    commandsSuccessful: 0,
    commandsFailed: 0,
    averageCommandLatency: 0,
    stateTransitions: 0,
    errorRecoveryAttempts: 0,
    lastCommandType: null,
    lastCommandTimestamp: 0,
    playerReadyTransitions: 0
  });
  const commandHistoryRef = useRef<CommandExecution[]>([]);
  const stateHistoryRef = useRef<StateTransition[]>([]);
  const commandLatenciesRef = useRef<number[]>([]);
  const currentCommandIdRef = useRef<number>(0);

  // Enhanced direct control methods with comprehensive testing
  // Background policy: playVideo commands are queued when app is in background to preserve battery
  const playVideo = async (): Promise<void> => {
    // Increment command ID for race condition handling
    currentCommandIdRef.current++;
    const commandToken = currentCommandIdRef.current;
    const commandId = `play-${Date.now()}-${commandToken}`;
    const startTime = Date.now();
    
    const commandExecution: CommandExecution = {
      id: commandId,
      type: 'play',
      timestamp: startTime,
      startTime,
      playerState: {
        isReady: isPlayerReady,
        internalPaused,
        isVideoChanging
      }
    };
    
    playerDebugLog.command(`🎵 PLAY COMMAND STARTING - ID: ${commandId}, Token: ${commandToken}`);
    playerDebugLog.command(`🎵 Player state before play:`, commandExecution.playerState);
    playerDebugLog.command(`🎵 Wrapper ref available: ${!!vimeoWrapperRef.current}`);
    
    playerTestRef.current.commandsExecuted++;
    playerTestRef.current.lastCommandType = 'play';
    playerTestRef.current.lastCommandTimestamp = startTime;
    
    try {
      if (!vimeoWrapperRef.current) {
        throw new Error('Wrapper not ready');
      }
      
      // Queue command if app is in background
      if (isAppInBackground) {
        playerDebugLog.command('App in background, queueing play command');
        queuedCommandsRef.current.push(() => playVideo());
        return;
      }
      
      playerDebugLog.command('Calling wrapper play method');
      await vimeoWrapperRef.current.play();
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      // Update command execution record
      commandExecution.endTime = endTime;
      commandExecution.success = true;
      commandExecution.latencyMs = latency;
      
      // Track performance
      commandLatenciesRef.current.push(latency);
      if (commandLatenciesRef.current.length > 50) {
        commandLatenciesRef.current = commandLatenciesRef.current.slice(-50);
      }
      
      const avgLatency = commandLatenciesRef.current.reduce((a, b) => a + b, 0) / commandLatenciesRef.current.length;
      playerTestRef.current.averageCommandLatency = Math.round(avgLatency);
      playerTestRef.current.commandsSuccessful++;
      
      playerDebugLog.performance(`Play command latency: ${latency}ms (avg: ${Math.round(avgLatency)}ms)`);
      playerDebugLog.command('Play command executed successfully');
      
      // Check if this command is still current (race condition protection)
      if (commandToken === currentCommandIdRef.current) {
        setInternalPaused(false);
        onPlayStateChange?.(true);
      } else {
        playerDebugLog.command(`Ignoring stale play command - Token: ${commandToken}, Current: ${currentCommandIdRef.current}`);
      }
      
    } catch (error) {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      // Update command execution record with error
      commandExecution.endTime = endTime;
      commandExecution.success = false;
      commandExecution.error = error instanceof Error ? error.message : String(error);
      commandExecution.latencyMs = latency;
      
      playerTestRef.current.commandsFailed++;
      
      playerDebugLog.error(`Play command failed after ${latency}ms:`, error);
      throw error;
    } finally {
      // Store command execution record
      commandHistoryRef.current.push(commandExecution);
      if (commandHistoryRef.current.length > 100) {
        commandHistoryRef.current = commandHistoryRef.current.slice(-100);
      }
    }
  };

  // Background policy: pauseVideo commands execute immediately even in background for audio control
  const pauseVideo = async (): Promise<void> => {
    // Save current position before pausing to prevent loss
    try {
      if (lastKnownTimeRef.current > 0) {
        await savePosition(lastKnownTimeRef.current, true);
        playerDebugLog.state('Position saved before pause:', lastKnownTimeRef.current);
      }
    } catch (error) {
      playerDebugLog.error('Failed to save position before pause:', error);
    }
    
    // Increment command ID for race condition handling
    currentCommandIdRef.current++;
    const commandToken = currentCommandIdRef.current;
    const commandId = `pause-${Date.now()}-${commandToken}`;
    const startTime = Date.now();
    
    const commandExecution: CommandExecution = {
      id: commandId,
      type: 'pause',
      timestamp: startTime,
      startTime,
      playerState: {
        isReady: isPlayerReady,
        internalPaused,
        isVideoChanging
      }
    };
    
    playerDebugLog.command(`Executing pause command - ID: ${commandId}, Token: ${commandToken}`);
    playerDebugLog.command(`Player state before pause:`, commandExecution.playerState);
    
    playerTestRef.current.commandsExecuted++;
    playerTestRef.current.lastCommandType = 'pause';
    playerTestRef.current.lastCommandTimestamp = startTime;
    
    try {
      if (!vimeoWrapperRef.current) {
        throw new Error('Wrapper not ready');
      }
      
      // Execute pause immediately even in background for audio control
      // Note: Pause commands are not queued to ensure immediate audio stopping
      
      playerDebugLog.command('Calling wrapper pause method');
      await vimeoWrapperRef.current.pause();
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      // Update command execution record
      commandExecution.endTime = endTime;
      commandExecution.success = true;
      commandExecution.latencyMs = latency;
      
      // Track performance
      commandLatenciesRef.current.push(latency);
      if (commandLatenciesRef.current.length > 50) {
        commandLatenciesRef.current = commandLatenciesRef.current.slice(-50);
      }
      
      const avgLatency = commandLatenciesRef.current.reduce((a, b) => a + b, 0) / commandLatenciesRef.current.length;
      playerTestRef.current.averageCommandLatency = Math.round(avgLatency);
      playerTestRef.current.commandsSuccessful++;
      
      playerDebugLog.performance(`Pause command latency: ${latency}ms (avg: ${Math.round(avgLatency)}ms)`);
      playerDebugLog.command('Pause command executed successfully');
      
      // Check if this command is still current (race condition protection)
      if (commandToken === currentCommandIdRef.current) {
        setInternalPaused(true);
        onPlayStateChange?.(false);
      } else {
        playerDebugLog.command(`Ignoring stale pause command - Token: ${commandToken}, Current: ${currentCommandIdRef.current}`);
      }
      
    } catch (error) {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      // Update command execution record with error
      commandExecution.endTime = endTime;
      commandExecution.success = false;
      commandExecution.error = error instanceof Error ? error.message : String(error);
      commandExecution.latencyMs = latency;
      
      playerTestRef.current.commandsFailed++;
      
      playerDebugLog.error(`Pause command failed after ${latency}ms:`, error);
      throw error;
    } finally {
      // Store command execution record
      commandHistoryRef.current.push(commandExecution);
      if (commandHistoryRef.current.length > 100) {
        commandHistoryRef.current = commandHistoryRef.current.slice(-100);
      }
    }
  };

  const getCurrentTimeFromPlayer = async (): Promise<number> => {
    const commandId = `getCurrentTime-${Date.now()}`;
    const startTime = Date.now();
    
    const commandExecution: CommandExecution = {
      id: commandId,
      type: 'getCurrentTime',
      timestamp: startTime,
      startTime,
      playerState: {
        isReady: isPlayerReady,
        internalPaused,
        isVideoChanging
      }
    };
    
    playerDebugLog.command(`Executing getCurrentTime command - ID: ${commandId}`);
    
    playerTestRef.current.commandsExecuted++;
    playerTestRef.current.lastCommandType = 'getCurrentTime';
    playerTestRef.current.lastCommandTimestamp = startTime;
    
    try {
      if (!vimeoWrapperRef.current) {
        throw new Error('Wrapper not ready');
      }
      
      playerDebugLog.command('Calling wrapper getCurrentTime method');
      const time = await vimeoWrapperRef.current.getCurrentTime();
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      if (typeof time === 'number') {
        // Update command execution record
        commandExecution.endTime = endTime;
        commandExecution.success = true;
        commandExecution.latencyMs = latency;
        
        playerTestRef.current.commandsSuccessful++;
        playerDebugLog.performance(`getCurrentTime latency: ${latency}ms, result: ${time}s`);
        
        return time;
      } else {
        throw new Error(`Invalid time value: ${time}`);
      }
    } catch (error) {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      // Update command execution record with error
      commandExecution.endTime = endTime;
      commandExecution.success = false;
      commandExecution.error = error instanceof Error ? error.message : String(error);
      commandExecution.latencyMs = latency;
      
      playerTestRef.current.commandsFailed++;
      
      playerDebugLog.error(`getCurrentTime failed after ${latency}ms:`, error);
      throw error;
    } finally {
      // Store command execution record
      commandHistoryRef.current.push(commandExecution);
      if (commandHistoryRef.current.length > 100) {
        commandHistoryRef.current = commandHistoryRef.current.slice(-100);
      }
    }
  };

  // Extract clean video ID for VimeoWrapper
  const videoId = useMemo(() => video.id.replace(/\D/g, ''), [video.id]);

  // Enhanced ref interface with testing methods
  useImperativeHandle(ref, () => ({
    play: async () => {
      if (!isPlayerReady) {
        playerDebugLog.error('Play command rejected - Player not ready');
        throw new Error('Player not ready');
      }
      return playVideo();
    },
    pause: async () => {
      if (!isPlayerReady) {
        playerDebugLog.error('Pause command rejected - Player not ready');
        throw new Error('Player not ready');
      }
      return pauseVideo();
    },
    getCurrentTime: async () => {
      if (!isPlayerReady) {
        playerDebugLog.error('getCurrentTime command rejected - Player not ready');
        throw new Error('Player not ready');
      }
      return getCurrentTimeFromPlayer();
    },
    isReady: () => isPlayerReady,
    flushPosition: async () => {
      return flushPosition();
    },
    
    // Testing methods
    getPlayerState: () => ({
      isPlayerReady,
      internalPaused,
      isVideoChanging,
      isLoading,
      hasError,
      positionLoaded,
      savedPosition,
      videoId,
      retryCount: retryCountRef.current
    }),
    
    validateStateSync: () => {
      const playerState = {
        isPlayerReady,
        internalPaused,
        isVideoChanging,
        isLoading,
        hasError
      };
      
      playerDebugLog.validation('State sync validation:', playerState);
      
      const isValid = isPlayerReady && !isVideoChanging && !isLoading && !hasError;
      
      return {
        isValid,
        playerState,
        internalPaused, // Expose internal paused state for comparison
        timestamp: Date.now(),
        issues: {
          notReady: !isPlayerReady,
          videoChanging: isVideoChanging,
          loading: isLoading,
          hasError: hasError
        }
      };
    },
    
    simulatePlayerEvent: (event: string, data?: any) => {
      playerDebugLog.test(`Simulating player event: ${event}`, data);
      
      const mockEvent = {
        nativeEvent: {
          data: JSON.stringify({
            name: event,
            data: data || {}
          })
        }
      };
      
      handleWrapperMessage(mockEvent);
    },
    
    measureCommandLatency: async (command: 'play' | 'pause') => {
      const startTime = Date.now();
      
      try {
        if (command === 'play') {
          await playVideo();
        } else {
          await pauseVideo();
        }
        
        const latency = Date.now() - startTime;
        playerDebugLog.performance(`Measured ${command} latency: ${latency}ms`);
        return latency;
      } catch (error) {
        const latency = Date.now() - startTime;
        playerDebugLog.error(`${command} latency measurement failed after ${latency}ms:`, error);
        throw error;
      }
    },
    
    testErrorRecovery: async () => {
      playerDebugLog.test('Testing error recovery mechanism');
      
      playerTestRef.current.errorRecoveryAttempts++;
      
      // Simulate error condition
      setHasError(true);
      setIsPlayerReady(false);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Trigger recovery
      retry();
      
      playerDebugLog.recovery('Error recovery test completed');
    },
    
    getTestReport: () => {
      const report = {
        testState: { ...playerTestRef.current },
        recentCommands: commandHistoryRef.current.slice(-10),
        recentStateTransitions: stateHistoryRef.current.slice(-10),
        performanceMetrics: {
          averageLatency: playerTestRef.current.averageCommandLatency,
          successRate: playerTestRef.current.commandsExecuted > 0 
            ? (playerTestRef.current.commandsSuccessful / playerTestRef.current.commandsExecuted) * 100 
            : 0,
          totalCommands: playerTestRef.current.commandsExecuted,
          failureRate: playerTestRef.current.commandsExecuted > 0 
            ? (playerTestRef.current.commandsFailed / playerTestRef.current.commandsExecuted) * 100 
            : 0
        },
        currentState: {
          isPlayerReady,
          internalPaused,
          isVideoChanging,
          isLoading,
          hasError,
          videoId
        }
      };
      
      playerDebugLog.test('Generated test report:', report);
      return report;
    }
  }), [isPlayerReady, internalPaused, isVideoChanging, isLoading, hasError, videoId]);

  // Enhanced video change detection with proper cleanup and state management
  useEffect(() => {
    playerDebugLog.state('Video changing to:', `${video.title} ID: ${video.id}`);
    
    // Set video changing state to track transition period
    setIsVideoChanging(true);
    
    // Reset player ready state immediately when video changes
    setIsPlayerReady(false);
    
    // Reset error and loading states for new video
    setHasError(false);
    setIsLoading(true);
    
    // Reset position loading gate before loading saved position
    setPositionLoaded(false);
    
    // Load saved position for new video
    loadSavedPosition();
    
    // Reset retry counter for new video
    retryCountRef.current = 0;
    
    // Clear video changing state after component updates
    const timer = setTimeout(() => {
      setIsVideoChanging(false);
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, [video.id]);

  // Enhanced isPaused prop handling with comprehensive testing and validation
  useEffect(() => {
    const transitionId = `transition-${Date.now()}`;
    
    playerDebugLog.integration(`useEffect triggered - ID: ${transitionId}`);
    playerDebugLog.integration(`State snapshot - isPaused: ${isPaused}, internal: ${internalPaused}, playerReady: ${isPlayerReady}, videoChanging: ${isVideoChanging}`);
    
    // Create state transition record
    const stateTransition: StateTransition = {
      timestamp: Date.now(),
      from: { isPaused: internalPaused, isPlayerReady, isVideoChanging },
      to: { isPaused, isPlayerReady, isVideoChanging },
      trigger: 'isPaused-prop-change',
      source: 'prop-change'
    };
    
    // Track state transitions
    if (isPaused !== internalPaused || stateTransition.from.isPlayerReady !== isPlayerReady) {
      playerTestRef.current.stateTransitions++;
      stateHistoryRef.current.push(stateTransition);
      
      if (stateHistoryRef.current.length > 50) {
        stateHistoryRef.current = stateHistoryRef.current.slice(-50);
      }
      
      playerDebugLog.state(`State transition recorded - Count: ${playerTestRef.current.stateTransitions}`);
    }
    
    // Only execute commands when player is ready and not during video transitions
    if (isPaused !== internalPaused && isPlayerReady && !isVideoChanging) {
      const executeCommand = async () => {
        try {
          if (isPaused) {
            playerDebugLog.command('Executing direct pause command');
            await pauseVideo();
          } else {
            playerDebugLog.command('Executing direct play command');
            await playVideo();
          }
        } catch (error) {
          // Handle timeout errors gracefully without excessive retries
          if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('unmounting'))) {
            playerDebugLog.state('Command handled gracefully:', error.message);
            // Update internal state for consistency even if command timed out or component unmounting
            setInternalPaused(isPaused);
            onPlayStateChange?.(!isPaused);
            return; // Don't retry timeout or unmounting errors
          }
          
          playerDebugLog.error('Direct control failed:', error);
          
          // Enhanced retry mechanism with better error handling
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            const delay = Math.min(Math.pow(2, retryCountRef.current) * 500, 2000); // Max 2s delay
            playerDebugLog.recovery(`Retrying command in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
            
            setTimeout(async () => {
              try {
                // Only retry if player is still ready and video hasn't changed
                if (isPlayerReady && !isVideoChanging && !hasError) {
                  await (isPaused ? pauseVideo() : playVideo());
                  playerDebugLog.recovery('Retry successful');
                } else {
                  playerDebugLog.recovery('Skipping retry - player state changed');
                }
              } catch (retryError) {
                // Handle retry timeout errors gracefully too
                if (retryError instanceof Error && retryError.message.includes('timeout')) {
                  playerDebugLog.state('Retry timeout handled gracefully');
                  setInternalPaused(isPaused);
                  onPlayStateChange?.(!isPaused);
                } else {
                  playerDebugLog.error('Retry failed:', retryError);
                  // Only trigger error recovery on final retry failure
                  if (retryCountRef.current >= maxRetries) {
                    playerDebugLog.recovery('Max retries reached, but continuing gracefully');
                    // Don't trigger onError for timeout issues
                    setInternalPaused(isPaused);
                    onPlayStateChange?.(!isPaused);
                  }
                }
              }
            }, delay);
          } else {
            playerDebugLog.recovery('Max retries reached, handling gracefully');
            retryCountRef.current = 0;
            // Update state for consistency
            setInternalPaused(isPaused);
            onPlayStateChange?.(!isPaused);
          }
        }
      };
      
      executeCommand();
    }
  }, [isPaused, internalPaused, isPlayerReady, isVideoChanging]);

  // Handle pending desired pause state when player becomes ready
  useEffect(() => {
    if (isPlayerReady && pendingDesiredPauseRef.current !== null) {
      const pendingPaused = pendingDesiredPauseRef.current;
      playerDebugLog.integration(`Applying pending desired pause state: ${pendingPaused}`);
      
      const executeCommand = async () => {
        try {
          // Add a small delay to ensure player is fully ready
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (pendingPaused) {
            await pauseVideo();
          } else {
            await playVideo();
          }
          playerDebugLog.integration(`Successfully applied pending state: ${pendingPaused ? 'paused' : 'playing'}`);
        } catch (error) {
          // Handle timeout and unmounting errors gracefully
          if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('unmounting'))) {
            playerDebugLog.state('Pending state handled gracefully:', error.message);
            // Still update internal state for consistency
            setInternalPaused(pendingPaused);
            onPlayStateChange?.(!pendingPaused);
          } else {
            playerDebugLog.error('Failed to apply pending desired state:', error);
          }
        } finally {
          // Always clear the pending state
          pendingDesiredPauseRef.current = null;
        }
      };
      
      executeCommand();
    }
  }, [isPlayerReady]);

  // Track isPaused changes and store as pending if player not ready
  useEffect(() => {
    if (!isPlayerReady) {
      playerDebugLog.integration(`Player not ready, storing pending desired pause state: ${isPaused}`);
      pendingDesiredPauseRef.current = isPaused;
    }
  }, [isPaused, isPlayerReady]);

  // AppState lifecycle management for background audio
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      playerDebugLog.state(`AppState changed to: ${nextAppState}`);
      
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App is going to background
        setIsAppInBackground(true);
        
        // Immediately flush current position
        try {
          await flushPosition();
          playerDebugLog.state('Position flushed on background transition');
        } catch (error) {
          playerDebugLog.error('Failed to flush position on background:', error);
        }
        
        // Clear any pending timeouts to prevent execution during background
        // Note: Individual command timeouts are handled by VimeoWrapper
        
      } else if (nextAppState === 'active') {
        // App is returning to foreground
        const wasInBackground = isAppInBackground;
        setIsAppInBackground(false);
        
        if (wasInBackground) {
          playerDebugLog.state('App returned to foreground, processing queued commands');
          
          // Process any queued commands
          const commandsToExecute = [...queuedCommandsRef.current];
          queuedCommandsRef.current = [];
          
          for (const command of commandsToExecute) {
            try {
              await command();
            } catch (error) {
              playerDebugLog.error('Failed to execute queued command:', error);
            }
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [isAppInBackground]);

  // Load saved position
  const loadSavedPosition = async () => {
    try {
      const newKey = `video_position_${videoId}`;
      const oldKey = `video_position_${video.id}`;
      
      let saved = await AsyncStorage.getItem(newKey);
      
      // Migration: if new key doesn't exist, try old key
      if (!saved && newKey !== oldKey) {
        saved = await AsyncStorage.getItem(oldKey);
        if (saved) {
          // Migrate to new key format
          await AsyncStorage.setItem(newKey, saved);
          playerDebugLog.state('Migrated position from old key to new key');
        }
      }
      
      if (saved) {
        const position = parseFloat(saved);
        setSavedPosition(position);
        playerDebugLog.state('Loaded saved position for video', `${videoId}: ${position}`);
      } else {
        setSavedPosition(0);
      }
    } catch (error) {
      playerDebugLog.error('Error loading saved position:', error);
      setSavedPosition(0);
    } finally {
      // CRITICAL: Always set position loaded to true so VimeoWrapper can render
      setPositionLoaded(true);
      playerDebugLog.state('Position loaded, VimeoWrapper can now render');
    }
  };

  // Save video position with immediate flush option
  const savePosition = async (position: number, immediate = false) => {
    try {
      await AsyncStorage.setItem(`video_position_${videoId}`, position.toString());
      playerDebugLog.state(`${immediate ? 'Immediately saved' : 'Saved'} position for video`, `${videoId}: ${position}`);
    } catch (error) {
      playerDebugLog.error('Error saving position:', error);
    }
  };

  // Flush current position immediately (for background transitions)
  const flushPosition = async (): Promise<void> => {
    try {
      if (!isPlayerReady || !vimeoWrapperRef.current) {
        // Use cached time instead of throwing error
        if (lastKnownTimeRef.current > 0) {
          await savePosition(lastKnownTimeRef.current, true);
          playerDebugLog.state('Position flushed using cached time:', lastKnownTimeRef.current);
          return;
        }
        playerDebugLog.state('Cannot flush position - player not ready and no cached time available');
        return;
      }
      
      let currentTime: number;
      try {
        currentTime = await getCurrentTimeFromPlayer();
      } catch (error) {
        // Fallback to last known time from timeupdate if getCurrentTime fails
        playerDebugLog.error('getCurrentTime failed during flush, using fallback:', error);
        currentTime = lastKnownTimeRef.current;
        playerDebugLog.state('Using cached time for flush:', currentTime);
      }
      
      await savePosition(currentTime, true);
      playerDebugLog.state('Position flushed successfully:', currentTime);
    } catch (error) {
      playerDebugLog.error('Failed to flush position:', error);
    }
  };

  // Handle video ID validation side effects
  useEffect(() => {
    if (!videoId || typeof videoId !== 'string' || videoId.length < 6) {
      if (__DEV__) console.warn('Invalid video ID:', video.id, 'cleaned:', videoId);
      setHasError(true);
      onError?.('Invalid video ID format');
    } else {
      setHasError(false);
      playerDebugLog.state('Video info', `Original: ${video.id}, Clean: ${videoId}, Title: ${video.title}`);
    }
  }, [videoId, video.id, video.title, onError]);

  // Generate params string for VimeoWrapper - stable params to prevent reloading
  const params = useMemo(() => {
    const paramsList = [
      'autoplay=0', // Always start with autoplay=0 to prevent unwanted auto-start
      'muted=0',
      'controls=0',
      'loop=0',
      'title=0',
      'byline=0',
      'portrait=0',
      'dnt=1',
      'playsinline=1',
      'pip=0',
      'transparent=0'
    ];
    
    // Add saved position if available
    if (savedPosition > 0) {
      paramsList.push(`t=${Math.floor(savedPosition)}s`);
      playerDebugLog.state('Adding saved position to params:', savedPosition);
    }
    
    const paramsString = paramsList.join('&');
    playerDebugLog.state('Stable Vimeo params:', paramsString);
    
    return paramsString;
  }, [savedPosition]); // Remove isPaused dependency to prevent reloading

  // Handle wrapper events
  const handleWrapperMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      // Handle wrapper's native events
      if (data.name === 'timeupdate') {
        if (typeof data.data.currentTime === 'number' && typeof data.data.duration === 'number') {
          const currentTime = data.data.currentTime;
          const duration = data.data.duration;
          const sec = Math.floor(currentTime);
          
          // Cache the last known time for fallback in flushPosition
          lastKnownTimeRef.current = currentTime;
          
          // Throttle saving: only save every 5 seconds
          if (sec - lastSavedRef.current >= 5) {
            savePosition(currentTime);
            lastSavedRef.current = sec;
          }
          
          onTimeUpdate?.(currentTime, duration);
        }
      } else if (data.name === 'play') {
        playerDebugLog.state('Video started playing');
        // Only update state if no commands are pending (avoid race conditions)
        if (currentCommandIdRef.current === 0) {
          setInternalPaused(false);
          onPlayStateChange?.(true);
        }
      } else if (data.name === 'pause') {
        playerDebugLog.state('Video paused');
        // Immediately save position when paused to prevent loss
        if (lastKnownTimeRef.current > 0) {
          savePosition(lastKnownTimeRef.current, true);
          playerDebugLog.state('Position saved on pause:', lastKnownTimeRef.current);
        }
        // Only update state if no commands are pending (avoid race conditions)
        if (currentCommandIdRef.current === 0) {
          setInternalPaused(true);
          onPlayStateChange?.(false);
        }
      } else if (data.name === 'ended') {
        playerDebugLog.state('Video ended');
        // Reset position when video ends
        savePosition(0);
        onVideoEnd?.();
      } else if (data.name === 'loaded' || data.name === 'player_ready') {
        playerDebugLog.state('VIMEO LOADED! (simplified)');
        setIsLoading(false);
        setHasError(false);
        setIsPlayerReady(true);
        
        playerDebugLog.state('Video ready for playback');
      } else if (data.name === 'error') {
        playerDebugLog.error('Vimeo Wrapper Error:', data.data);
        setIsLoading(false);
        setHasError(true);
        setIsPlayerReady(false);
        retryCountRef.current = 0;
        onError?.(`Video loading failed: ${data.data?.message || 'Unknown error'}`);
      }
    } catch (parseError) {
      playerDebugLog.error('Failed to parse wrapper message:', parseError);
    }
  };

  // Simplified wrapper ready handler - no complex Player.js expectations
  const handleWrapperReady = () => {
    playerDebugLog.state('Vimeo WebView ready (simplified mode)');
    
    // Always stop loading when wrapper is ready
    setIsLoading(false);
    setIsPlayerReady(true);
    setHasError(false);
    retryCountRef.current = 0;
    
    // Auto-start playback if not paused
    if (!isPaused) {
      playerDebugLog.state('Auto-starting playback on ready');
      // Small delay to ensure player is fully ready
      setTimeout(async () => {
        try {
          // Force play regardless of internal state when player becomes ready
          await playVideo();
          playerDebugLog.state('Auto-play successful');
        } catch (error) {
          playerDebugLog.state('Auto-play handled gracefully:', error);
        }
      }, 500); // Increased delay for better reliability
    }
    
    playerDebugLog.state('Player ready in simplified mode');
  };

  // Handle wrapper error event
  const handleWrapperError = (error: string) => {
    playerDebugLog.error('Wrapper error:', error);
    setIsLoading(false);
    setHasError(true);
    setIsPlayerReady(false);
    retryCountRef.current = 0;
    onError?.(error);
  };

  // Optimized player key generation - only remount on essential changes
  const playerKey = useMemo(() => {
    // Include video ID and reload nonce only when necessary
    // This prevents unnecessary WebView remounts during normal operation
    const key = reloadNonce > 0 ? `vimeo-player-${videoId}-${reloadNonce}` : `vimeo-player-${videoId}`;
    playerDebugLog.state('Generating player key for video:', `${key}`);
    return key;
  }, [videoId, reloadNonce]);

  // Enhanced retry function with error handling reset
  const retry = () => {
    playerDebugLog.recovery('Retrying video load...');
    setHasError(false);
    setIsLoading(true);
    setIsPlayerReady(false);
    retryCountRef.current = 0;
    // Only force WebView reload on manual retry, not automatic retries
    setReloadNonce(n => n + 1);
    playerDebugLog.recovery(`Reload nonce incremented to: ${reloadNonce + 1}`);
  };

  // Error state UI
  if (hasError) {
    return (
      <ThemedView style={[styles.container, isFullscreen && styles.fullscreenContainer]}>
        <ThemedView style={styles.errorContainer}>
          <IconSymbol name="exclamationmark.triangle" size={48} color="#FF6B6B" />
          <ThemedText style={styles.errorTitle}>Video Loading Failed</ThemedText>
          <ThemedText style={styles.errorText}>
            {video.title}
          </ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={retry}>
            <IconSymbol name="arrow.clockwise" size={20} color="white" />
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </TouchableOpacity>
        </ThemedView>
        
        {/* Fullscreen Toggle */}
        {onFullscreenToggle && (
          <TouchableOpacity 
            style={styles.fullscreenButton}
            onPress={onFullscreenToggle}
          >
            <IconSymbol 
              name={isFullscreen ? "arrow.down.right.and.arrow.up.left" : "arrow.up.left.and.arrow.down.right"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        )}
      </ThemedView>
    );
  }

  // Early return while position is not loaded to prevent race conditions
  if (!positionLoaded) {
    return <ThemedView style={[styles.container, isFullscreen && styles.fullscreenContainer]} />
  }

  return (
    <ThemedView style={[styles.container, isFullscreen && styles.fullscreenContainer]}>
      {/* Loading Indicator */}
      {isLoading && (
        <ThemedView style={styles.loadingContainer}>
          <Image 
            source={require('@/assets/images/loading.gif')} 
            style={styles.loadingGif}
            resizeMode="contain"
          />
        </ThemedView>
      )}

      {/* Vimeo Player via Enhanced Wrapper */}
      <VimeoWrapper
        key={playerKey}
        ref={vimeoWrapperRef}
        videoId={videoId}
        params={params}
        isFullscreen={isFullscreen}
        playerHeight={playerHeight}
        onMessage={handleWrapperMessage}
        onReady={handleWrapperReady}
        onError={handleWrapperError}
        style={styles.vimeoPlayer}
      />
    </ThemedView>
  );
});

// Set display name for debugging
VimeoPlayer.displayName = 'VimeoPlayer';

export default VimeoPlayer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  vimeoPlayer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    zIndex: 10,
  },
  loadingGif: {
    width: 60,
    height: 60,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1AB7EA',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  fullscreenButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
  },
});