import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ClienteApp() {
  const router = useRouter();

  const handleExit = () => {
    Alert.alert(
      'Sair do App Cliente',
      'Deseja realmente sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => router.replace('/')
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        {/* Header with Exit Button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.exitButton} 
            onPress={handleExit}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
            <Text style={styles.exitText}>SAIR</Text>
          </TouchableOpacity>
        </View>

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

        {/* Client Access - SOMENTE LOGIN OBRIGATÓRIO */}
        <View style={styles.accessSection}>
          <Text style={styles.welcomeTitle}>Bem-vindo, Cliente!</Text>
          <Text style={styles.welcomeSubtitle}>
            Para acessar o app, você precisa fazer login ou se cadastrar
          </Text>
          
          <TouchableOpacity 
            style={[styles.accessButton, styles.plansButton]}
            onPress={() => router.push('/client/plans')}
          >
            <View style={styles.buttonIcon}>
              <Text style={styles.buttonIconText}>🎯</Text>
            </View>
            <View style={styles.buttonContent}>
              <Text style={styles.buttonTitle}>Ver Planos e Cadastrar</Text>
              <Text style={styles.buttonSubtitle}>Escolha um plano e crie sua conta</Text>
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
              <Text style={styles.buttonTitle}>Fazer Login Obrigatório</Text>
              <Text style={styles.buttonSubtitle}>Entre com email e senha</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>⚠️ LOGIN OBRIGATÓRIO:</Text>
            <Text style={styles.warningText}>
              • Não é possível usar o app sem fazer login{'\n'}
              • Todos os recursos exigem autenticação{'\n'}
              • Sua conta garante segurança e personalização{'\n'}
              • Dados sincronizados em todos os dispositivos
            </Text>
          </View>
        </View>

        {/* Exit Button */}
        <View style={styles.exitSection}>
          <TouchableOpacity style={styles.exitFullButton} onPress={handleExit}>
            <Ionicons name="log-out" size={20} color="#FFFFFF" />
            <Text style={styles.exitFullText}>Sair do App Cliente</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🔒</Text>
            <Text style={styles.featureText}>Login Seguro</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📱</Text>
            <Text style={styles.featureText}>App Personalizado</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🏋️</Text>
            <Text style={styles.featureText}>Tokens Únicos</Text>
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  exitText: {
    color: '#FF4444',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
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
  warningCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  warningTitle: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  warningText: {
    color: '#FEF3C7',
    fontSize: 14,
    lineHeight: 20,
  },
  exitSection: {
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  exitFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4444',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  exitFullText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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