import React, { useRef, useCallback } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export default function ScreenFade({ children, style }) {
  const overlay = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      overlay.setValue(1);
      Animated.timing(overlay, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    }, [])
  );

  return (
    <View style={[{ flex: 1 }, style]}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#F3F4F6', opacity: overlay }]}
      />
    </View>
  );
}
