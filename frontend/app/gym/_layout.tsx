import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function GymLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Verificar autenticação da academia
    const checkGymAuth = async () => {
      try {
        const gymToken = await AsyncStorage.getItem('gymToken');
        const currentPath = segments.join('/');
        
        console.log('🔍 [GYM_LAYOUT] Current path:', currentPath);
        console.log('🔍 [GYM_LAYOUT] Gym token exists:', !!gymToken);
        
        // Se não está na página de login e não tem token, redirecionar
        if (!gymToken && !currentPath.includes('login')) {
          console.log('❌ [GYM_LAYOUT] Token da academia não encontrado, redirecionando para login');
          router.replace('/gym/login');
          return;
        }
        
        if (gymToken && currentPath.includes('login')) {
          console.log('✅ [GYM_LAYOUT] Academia já autenticada, redirecionando para validação');
          router.replace('/gym/validation');
          return;
        }
        
        if (gymToken) {
          console.log('✅ [GYM_LAYOUT] Academia autenticada');
        }
      } catch (error) {
        console.error('❌ [GYM_LAYOUT] Erro ao verificar autenticação da academia:', error);
        router.replace('/gym/login');
      }
    };

    checkGymAuth();
  }, [router, segments]);

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