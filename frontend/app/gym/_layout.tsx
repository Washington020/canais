import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function GymLayout() {
  const router = useRouter();

  useEffect(() => {
    // Verificar autenticação da academia
    const checkGymAuth = async () => {
      try {
        const gymToken = await AsyncStorage.getItem('gymToken');
        const currentPath = window.location.pathname;
        
        // Se não está na página de login e não tem token, redirecionar
        if (!gymToken && !currentPath.includes('/gym/login')) {
          console.log('❌ Token da academia não encontrado, redirecionando para login');
          router.replace('/gym/login');
          return;
        }
        
        if (gymToken) {
          console.log('✅ Academia autenticada');
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação da academia:', error);
        router.replace('/gym/login');
      }
    };

    checkGymAuth();
  }, [router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="validation" />
    </Stack>
  );
}