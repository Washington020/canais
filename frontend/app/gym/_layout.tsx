import React from 'react';
import { Stack } from 'expo-router';

export default function GymLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0B0D17' },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="validation" />
      <Stack.Screen name="dashboard" />
    </Stack>
  );
}