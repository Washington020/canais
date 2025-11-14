import React, { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { AppState } from 'react-native';
import { notificationService } from '../services/notificationService';

export default function ClientLayout() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Initialize notifications when app starts
    const initializeNotifications = async () => {
      try {
        const initialized = await notificationService.initialize();
        if (initialized) {
          console.log('Notification service initialized successfully');
          
          // Set up notification listeners
          const listeners = notificationService.setupNotificationListeners();
          
          // Schedule welcome notification for new users (can be controlled by backend)
          // notificationService.scheduleWelcomeNotification();
          
          // Cleanup listeners on unmount
          return () => {
            listeners.notificationListener.remove();
            listeners.responseListener.remove();
          };
        }
      } catch (error) {
        console.error('Failed to initialize notification service:', error);
      }
    };

    initializeNotifications();

    // Handle app state changes
    const handleAppStateChange = (nextAppState: string) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground!');
        // Optionally refresh notifications or clear badges
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0B0D17' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="plans" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}