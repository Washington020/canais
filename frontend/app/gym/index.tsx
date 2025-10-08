import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function GymIndex() {
  const router = useRouter();

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const token = await AsyncStorage.getItem('gymToken');
      const gymInfo = await AsyncStorage.getItem('gymInfo');
      
      if (token && gymInfo) {
        // Usuário autenticado, redirecionar para dashboard
        router.replace('/gym/dashboard');
      } else {
        // Não autenticado, redirecionar para login
        router.replace('/gym/login');
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      router.replace('/gym/login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});