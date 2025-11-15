import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function LandingPage() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const apps = [
    {
      id: 'client',
      title: 'Cliente',
      subtitle: 'Seu Fitness, Sua Liberdade',
      description: 'Acesse +50 academias, agende consultas com profissionais e transforme seu corpo',
      icon: 'person-circle',
      gradient: ['#22C55E', '#16A34A'],
      route: '/client/auth',
      features: ['🏋️ +50 Academias', '📅 Agendamentos', '💪 Planos Personalizados']
    },
    {
      id: 'luxecoach',
      title: 'LuxeCoach',
      subtitle: 'Plataforma Profissional',
      description: 'Nutricionistas e Personal Trainers: Gerencie seus clientes e impulsione resultados',
      icon: 'fitness',
      gradient: ['#F59E0B', '#D97706'],
      route: '/professional/luxecoach/login',
      features: ['👥 Gestão de Clientes', '📊 Acompanhamento', '🎯 Planos Personalizados']
    },
    {
      id: 'admin',
      title: 'Admin',
      subtitle: 'Controle Total',
      description: 'Painel administrativo completo para gestão de toda a plataforma',
      icon: 'shield-checkmark',
      gradient: ['#8B5CF6', '#7C3AED'],
      route: '/admin/login',
      features: ['📈 Dashboard', '👤 Usuários', '💰 Financeiro']
    },
    {
      id: 'gym',
      title: 'Academia',
      subtitle: 'Check-in Digital',
      description: 'Sistema de validação de tokens e controle de acesso para academias parceiras',
      icon: 'business',
      gradient: ['#3B82F6', '#2563EB'],
      route: '/gym/login',
      features: ['✓ Validação', '📊 Relatórios', '⚡ Rápido']
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header com animação */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="fitness" size={72} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>LuxePass</Text>
          <Text style={styles.subtitle}>Transforme Sua Vida Fitness</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🔥 +10.000 Usuários Ativos</Text>
          </View>
        </Animated.View>

        {/* Cards animados */}
        <View style={styles.appsContainer}>
          {apps.map((app, index) => (
            <Animated.View
              key={app.id}
              style={[
                styles.cardWrapper,
                {
                  opacity: fadeAnim,
                  transform: [{
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 50],
                      outputRange: [0, 50 + (index * 20)],
                    })
                  }]
                }
              ]}
            >
              <TouchableOpacity
                style={styles.appCard}
                onPress={() => router.push(app.route as any)}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={app.gradient}
                  style={styles.cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIcon}>
                      <Ionicons name={app.icon as any} size={32} color="#FFFFFF" />
                    </View>
                    <View style={styles.cardTitleContainer}>
                      <Text style={styles.cardTitle}>{app.title}</Text>
                      <Text style={styles.cardSubtitle}>{app.subtitle}</Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={28} color="rgba(255,255,255,0.9)" />
                  </View>

                  <Text style={styles.cardDescription}>{app.description}</Text>

                  <View style={styles.featuresContainer}>
                    {app.features.map((feature, idx) => (
                      <View key={idx} style={styles.featureBadge}>
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>+50</Text>
              <Text style={styles.statLabel}>Academias</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>+100</Text>
              <Text style={styles.statLabel}>Profissionais</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>24/7</Text>
              <Text style={styles.statLabel}>Suporte</Text>
            </View>
          </View>
          <Text style={styles.footerText}>© 2025 LuxePass - Todos os direitos reservados</Text>
          <Text style={styles.footerVersion}>v1.0.0</Text>
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
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 20,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  badgeText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
  },
  appsContainer: {
    paddingHorizontal: 24,
    gap: 20,
  },
  cardWrapper: {
    marginBottom: 4,
  },
  appCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardGradient: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
    marginBottom: 16,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#334155',
  },
  footerText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    textAlign: 'center',
  },
  footerVersion: {
    fontSize: 11,
    color: '#475569',
  },
});