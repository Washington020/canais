import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor="#0B0D17" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0B0D17' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="client" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="gym" />
        <Stack.Screen name="professional" />
      </Stack>
    </GestureHandlerRootView>
  );
}