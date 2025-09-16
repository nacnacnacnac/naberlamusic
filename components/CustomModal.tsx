import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  height?: number;
  bottomOffset?: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CustomModal({ 
  visible, 
  onClose, 
  children, 
  width = 400, 
  height = screenHeight * 0.8,
  bottomOffset = 0
}: CustomModalProps) {
  const slideAnim = useRef(new Animated.Value(width)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Modal açılırken
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Modal kapanırken
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: width,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim, width]);

  if (!visible && slideAnim._value === width) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Background overlay */}
      <TouchableOpacity 
        style={styles.background} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <Animated.View style={[styles.backgroundOverlay, { opacity: opacityAnim }]} />
      </TouchableOpacity>

      {/* Modal content */}
      <Animated.View
        style={[
          styles.modalContainer,
          {
            width,
            height,
            bottom: bottomOffset,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {Platform.OS === 'web' ? (
          <View style={styles.modalContent}>
            {children}
          </View>
        ) : (
          <BlurView intensity={95} style={styles.modalContent}>
            {children}
          </BlurView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalContent: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#000000' : 'transparent',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 0,
    overflow: 'hidden',
  },
});
