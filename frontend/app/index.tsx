import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

export default function MainSelector() {
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
          <Text style={styles.tagline}>Central Administrativa</Text>
        </View>

        {/* App Selection - ADMIN CENTRAL */}
        <View style={styles.appSelection}>
          <Text style={styles.selectionTitle}>Painel de Controle</Text>
          <Text style={styles.selectionSubtitle}>
            Acesso completo para administração do sistema LuxePass
          </Text>
          
          <TouchableOpacity 
            style={[styles.appButton, styles.adminButton]}
            onPress={() => router.push('/admin/login')}
          >
            <View style={styles.buttonIcon}>
              <Text style={styles.buttonIconText}>⚙️</Text>
            </View>
            <View style={styles.buttonContent}>
              <Text style={styles.buttonTitle}>Entrar no Admin</Text>
              <Text style={styles.buttonSubtitle}>Gerencie usuários, academias, tokens e financeiro</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.appsAccess}>
            <Text style={styles.appsAccessTitle}>🔗 Acesso aos Apps (LOGIN OBRIGATÓRIO):</Text>
            
            <TouchableOpacity 
              style={styles.appLink}
              onPress={() => router.push('/cliente')}
            >
              <Text style={styles.appLinkIcon}>📱</Text>
              <View style={styles.appLinkContent}>
                <Text style={styles.appLinkText}>App Cliente</Text>
                <Text style={styles.appLinkSubtext}>Login obrigatório para clientes</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.appLink}
              onPress={() => router.push('/academia')}
            >
              <Text style={styles.appLinkIcon}>🏋️</Text>
              <View style={styles.appLinkContent}>
                <Text style={styles.appLinkText}>Sistema Academia</Text>
                <Text style={styles.appLinkSubtext}>Login obrigatório para academias</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.securityInfo}>
            <Text style={styles.securityTitle}>🔐 Sistema Seguro:</Text>
            <Text style={styles.securityText}>
              • Todos os apps exigem login obrigatório{'\n'}
              • Não há acesso direto sem autenticação{'\n'}
              • Credenciais são gerenciadas pelo admin{'\n'}
              • Sistema 100% seguro e auditado
            </Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🔐</Text>
            <Text style={styles.featureText}>Login Obrigatório</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📊</Text>
            <Text style={styles.featureText}>Controle Total</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🔄</Text>
            <Text style={styles.featureText}>Sistema Seguro</Text>
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
    color: '#8B5CF6',
    textAlign: 'center',
    fontWeight: '600',
  },
  appSelection: {
    flex: 1,
    justifyContent: 'center',
  },
  selectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  selectionSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  appButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 2,
  },
  adminButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: '#8B5CF6',
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
  appsAccess: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  appsAccessTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  appLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  appLinkIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  appLinkContent: {
    flex: 1,
  },
  appLinkText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  appLinkSubtext: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  securityInfo: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  securityTitle: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  securityText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
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