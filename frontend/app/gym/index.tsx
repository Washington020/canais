import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function GymIndex() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const checkAuthStatus = async () => {
      try {
        // LIMPAR SEMPRE qualquer token antigo da academia
        await AsyncStorage.removeItem('gymToken');
        await AsyncStorage.removeItem('gymInfo');
        
        // SEMPRE ir para login - conforme solicitado pelo usuário
        // O sistema de academia DEVE sempre solicitar login e senha
        if (isMounted) {
          router.replace('/gym/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // If there's an error, go to login
        if (isMounted) {
          router.replace('/gym/login');
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    // Add a small delay to prevent infinite loops
    const timeoutId = setTimeout(checkAuthStatus, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  if (isChecking) {
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
          Verificando autenticação...
        </Text>
      </View>
    );
  }

  return null;
}