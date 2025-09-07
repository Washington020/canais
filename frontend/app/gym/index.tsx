import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function GymIndex() {
  const router = useRouter();

  useEffect(() => {
    // FORÇA redirecionamento imediato para login
    // Sistema Academia SEMPRE deve solicitar login e senha
    const forceLoginRedirect = async () => {
      try {
        // Limpar qualquer token antigo
        await AsyncStorage.removeItem('gymToken');
        await AsyncStorage.removeItem('gymInfo');
        console.log('🔄 Redirecionando para gym/login...');
      } catch (error) {
        console.error('Erro ao limpar cache:', error);
      }
      
      // Redirecionar IMEDIATAMENTE para login
      router.replace('/gym/login');
    };

    forceLoginRedirect();
  }, [router]);

  // Mostrar tela de carregamento enquanto redireciona
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#0B0D17' 
    }}>
      <StatusBar style="light" />
      <ActivityIndicator size="large" color="#8B5CF6" />
      <Text style={{ color: '#FFFFFF', marginTop: 16, fontSize: 16 }}>
        Redirecionando para login...
      </Text>
    </View>
  );
}