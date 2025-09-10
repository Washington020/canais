import React from 'react';
import { Stack } from 'expo-router';

export default function ProfessionalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0B0D17' },
      }}
    >
      <Stack.Screen name="nutritionist" />
      <Stack.Screen name="personal" />
    </Stack>
  );
}