import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

export default function ClienteApp() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        {/* Logo and Brand */}
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Image 
              source={{ uri: 'https://customer-assets.emergentagent.com/job_fitness-token-app/artifacts/8gnzidak_IMG_0187.png' }}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandName}>LuxePass</Text>
          <Text style={styles.tagline}>Seu passaporte para o fitness</Text>
        </View>

        {/* Client Access */}
        <View style={styles.accessSection}>
          <Text style={styles.welcomeTitle}>Bem-vindo, Cliente!</Text>
          <Text style={styles.welcomeSubtitle}>
            Escolha seus planos, faça login ou comece sua jornada fitness
          </Text>
          
          <TouchableOpacity 
            style={[styles.accessButton, styles.plansButton]}
            onPress={() => router.push('/client/plans')}
          >
            <View style={styles.buttonIcon}>
              <Text style={styles.buttonIconText}>🎯</Text>
            </View>
            <View style={styles.buttonContent}>
              <Text style={styles.buttonTitle}>Ver Planos</Text>
              <Text style={styles.buttonSubtitle}>Escolha o plano ideal para você</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.accessButton, styles.loginButton]}
            onPress={() => router.push('/client/login')}
          >
            <View style={styles.buttonIcon}>
              <Text style={styles.buttonIconText}>🔑</Text>
            </View>
            <View style={styles.buttonContent}>
              <Text style={styles.buttonTitle}>Fazer Login</Text>
              <Text style={styles.buttonSubtitle}>Já sou cliente LuxePass</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🏋️</Text>
            <Text style={styles.featureText}>+500 Academias</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🥗</Text>
            <Text style={styles.featureText}>Nutrição Personalizada</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📱</Text>
            <Text style={styles.featureText}>App Exclusivo</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D17',
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
  logoImage: {
    width: 60,
    height: 60,
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
  accessSection: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  accessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  plansButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: '#8B5CF6',
  },
  loginButton: {
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