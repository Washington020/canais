import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        // User is logged in, redirect to appropriate app
        const userType = await AsyncStorage.getItem('userType');
        if (userType === 'admin') {
          router.replace('/admin');
        } else {
          router.replace('/client');
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Carregando Luxe Forma...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo and Brand */}
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>💪</Text>
            </View>
            <Text style={styles.brandName}>FitPass Brasil</Text>
            <Text style={styles.tagline}>Seu passaporte para o fitness</Text>
          </View>

          {/* App Selection */}
          <View style={styles.appSelection}>
            <Text style={styles.selectionTitle}>Escolha seu acesso:</Text>
            
            <TouchableOpacity 
              style={[styles.appButton, styles.clientButton]}
              onPress={() => router.push('/client/login')}
            >
              <View style={styles.buttonIcon}>
                <Text style={styles.buttonIconText}>📱</Text>
              </View>
              <View style={styles.buttonContent}>
                <Text style={styles.buttonTitle}>App Cliente</Text>
                <Text style={styles.buttonSubtitle}>Acesse treinos, academias e tokens</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.appButton, styles.adminButton]}
              onPress={() => router.push('/admin/login')}
            >
              <View style={styles.buttonIcon}>
                <Text style={styles.buttonIconText}>⚙️</Text>
              </View>
              <View style={styles.buttonContent}>
                <Text style={styles.buttonTitle}>App Administrador</Text>
                <Text style={styles.buttonSubtitle}>Gerencie usuários, academias e financeiro</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.appButton, styles.gymButton]}
              onPress={() => router.push('/gym')}
            >
              <View style={styles.buttonIcon}>
                <Text style={styles.buttonIconText}>🏋️</Text>
              </View>
              <View style={styles.buttonContent}>
                <Text style={styles.buttonTitle}>Sistema Academia</Text>
                <Text style={styles.buttonSubtitle}>Validação de tokens e check-in</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Features */}
          <View style={styles.features}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🎯</Text>
              <Text style={styles.featureText}>Treinos Personalizados</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🏃</Text>
              <Text style={styles.featureText}>+500 Academias</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🥗</Text>
              <Text style={styles.featureText}>Nutrição IA</Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D17',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B0D17',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  logoText: {
    fontSize: 40,
  },
  brandName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  appSelection: {
    flex: 1,
    justifyContent: 'center',
  },
  selectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
  },
  appButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  clientButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: '#8B5CF6',
  },
  adminButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#F59E0B',
  },
  gymButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: '#22C55E',
  },
  buttonIcon: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  buttonIconText: {
    fontSize: 24,
  },
  buttonContent: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 40,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});