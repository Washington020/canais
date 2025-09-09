import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  gradient?: boolean;
}

export default function LoadingSpinner({ 
  size = 40, 
  color = '#8B5CF6',
  gradient = false 
}: LoadingSpinnerProps) {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    spinAnimation.start();

    return () => spinAnimation.stop();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (gradient) {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.spinner,
            { 
              width: size, 
              height: size,
              transform: [{ rotate: spin }] 
            }
          ]}
        >
          <LinearGradient
            colors={['#8B5CF6', '#06B6D4', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.gradientSpinner,
              { width: size, height: size }
            ]}
          />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.spinner,
          styles.solidSpinner,
          { 
            width: size, 
            height: size,
            borderColor: color,
            transform: [{ rotate: spin }] 
          }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    borderRadius: 1000,
  },
  solidSpinner: {
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  gradientSpinner: {
    borderRadius: 1000,
    opacity: 0.8,
  },
});