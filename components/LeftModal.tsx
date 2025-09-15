import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';

interface LeftModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  height?: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function LeftModal({ 
  visible, 
  onClose, 
  children, 
  width, 
  height = screenHeight * 0.8 
}: LeftModalProps) {
  // Mobil detection ve width hesaplama component içinde
  const isMobile = screenWidth <= 768;
  const modalWidth = width || (isMobile ? (screenWidth * 0.60) + 125 : 500); // Mobilde 125px daha geniş (45+60+20)
  
  const slideAnim = useRef(new Animated.Value(-modalWidth)).current; // Sol taraftan başlar
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
          toValue: -modalWidth, // Sol tarafa gider
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
  }, [visible, slideAnim, opacityAnim, modalWidth]);

  if (!visible && slideAnim._value === -modalWidth) {
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
            width: modalWidth,
            height,
            left: 0, // Her zaman sol kenarda
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
    left: 0, // Sol kenarda sabit
    bottom: 0,
    backgroundColor: '#000000',
    borderTopRightRadius: 20, // Sağ üst köşe yuvarlatılmış
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 2, // Sağa doğru gölge
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalContent: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#000000' : 'transparent',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
});
