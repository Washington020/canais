import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LandingPage() {
  const router = useRouter();

  const apps = [
    {
      id: 'client',
      title: 'LuxePass Cliente',
      description: 'Acesse academias, agende consultas e gerencie seu plano',
      icon: 'person',
      color: '#22C55E',
      route: '/client/auth',
    },
    {
      id: 'luxecoach',
      title: 'LuxeCoach',
      description: 'Plataforma unificada para Nutricionistas e Personal Trainers',
      icon: 'fitness',
      color: '#F59E0B',
      route: '/professional/luxecoach/login',
    },
    {
      id: 'admin',
      title: 'Admin',
      description: 'Painel administrativo completo',
      icon: 'shield-checkmark',
      color: '#8B5CF6',
      route: '/admin/login',
    },
    {
      id: 'gym',
      title: 'Academia',
      description: 'Sistema de check-in e validação de tokens',
      icon: 'business',
      color: '#3B82F6',
      route: '/gym/login',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="fitness" size={64} color="#F59E0B" />
          </View>
          <Text style={styles.title}>LuxePass</Text>
          <Text style={styles.subtitle}>Plataforma Completa de Fitness</Text>
        </View>

        <View style={styles.appsContainer}>
          {apps.map((app) => (
            <TouchableOpacity
              key={app.id}
              style={styles.appCard}
              onPress={() => router.push(app.route as any)}
            >
              <View style={[styles.appIconContainer, { backgroundColor: `${app.color}20` }]}>
                <Ionicons name={app.icon as any} size={40} color={app.color} />
              </View>
              <View style={styles.appContent}>
                <Text style={styles.appTitle}>{app.title}</Text>
                <Text style={styles.appDescription}>{app.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#64748B" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 LuxePass. Todos os direitos reservados.</Text>
          <Text style={styles.footerVersion}>Versão 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D17',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginVertical: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#94A3B8',
    textAlign: 'center',
  },
  appsContainer: {
    flex: 1,
    gap: 16,
    marginBottom: 32,
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  appIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appContent: {
    flex: 1,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  appDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  footerText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 12,
    color: '#475569',
  },
});
