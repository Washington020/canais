import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function GymLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Verificar autenticação da academia SEMPRE
    const checkGymAuth = async () => {
      try {
        const gymToken = await AsyncStorage.getItem('gymToken');
        const currentPath = segments.join('/');
        
        console.log('🔍 [GYM_LAYOUT] Current path:', currentPath);
        console.log('🔍 [GYM_LAYOUT] Gym token exists:', !!gymToken);
        
        // FORÇAR LOGIN: Se não tem token, sempre redirecionar para login
        if (!gymToken) {
          console.log('❌ [GYM_LAYOUT] Token da academia não encontrado, FORÇANDO login');
          router.replace('/gym/login');
          return;
        }
        
        // Se tem token e está na página de login, ir para dashboard principal
        if (gymToken && currentPath.includes('login')) {
          console.log('✅ [GYM_LAYOUT] Academia já autenticada, redirecionando para dashboard');
          router.replace('/gym/index');
          return;
        }
        
        if (gymToken) {
          console.log('✅ [GYM_LAYOUT] Academia autenticada');
        }
      } catch (error) {
        console.error('❌ [GYM_LAYOUT] Erro ao verificar autenticação da academia:', error);
        // EM CASO DE ERRO, FORÇAR LOGIN
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
      <Stack.Screen name="validation_backup" />
    </Stack>
  );
}