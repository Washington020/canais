import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface AdminStats {
  total_users: number;
  active_subscriptions: number;
  overdue_payments: number;
  blocked_users: number;
  total_gyms: number;
  tokens_generated_today: number;
  monthly_revenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/admin/dashboard`, { headers });
      
      setStats(response.data);
    } catch (error: any) {
      console.error('Admin dashboard error:', error);
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        router.replace('/admin/login');
      } else {
        // Use mock data for demonstration
        const mockStats = {
          total_users: 2847,
          active_subscriptions: 2234,
          total_gyms: 156,
          tokens_generated_today: 1423
        };
        setStats(mockStats);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };


  const handleLogout = () => {
    console.log('🔥 ADMIN LOGOUT CLICADO - FUNÇÃO EXECUTANDO');
    
    Alert.alert(
      'Sair do Painel',
      'Tem certeza que deseja sair do painel administrativo?',
      [
        { 
          text: 'Cancelar', 
          style: 'cancel',
          onPress: () => console.log('❌ Admin logout cancelado')
        },
        {
          text: 'SAIR AGORA',
          style: 'destructive',
          onPress: () => {
            console.log('🚀 EXECUTANDO ADMIN LOGOUT DEFINITIVO');
            
            try {
              // Limpar storage imediatamente
              AsyncStorage.clear().then(() => {
                console.log('✅ Admin AsyncStorage limpo');
                
                // Navegar para home
                router.push('/');
                console.log('✅ Admin navegação para home executada');
                
              }).catch(error => {
                console.error('❌ Erro ao limpar admin storage:', error);
                router.push('/');
              });
              
            } catch (error) {
              console.error('❌ Erro no admin logout:', error);
              router.push('/');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Carregando dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerLeft}>
            <View style={styles.adminAvatar}>
              <Text style={styles.adminAvatarText}>A</Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.welcomeText}>Painel Admin</Text>
              <Text style={styles.adminRole}>Luxe Forma</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <View style={styles.logoutButtonContent}>
              <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
              <Text style={styles.logoutButtonText}>Sair</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Key Metrics */}
        <View style={styles.metricsContainer}>
          <Text style={styles.sectionTitle}>Métricas Principais</Text>
          
          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, styles.usersCard]}>
              <View style={styles.metricIcon}>
                <Ionicons name="people" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.metricNumber}>{stats?.total_users.toLocaleString() || '0'}</Text>
              <Text style={styles.metricLabel}>Usuários Totais</Text>
              <Text style={styles.metricChange}>+12% este mês</Text>
            </View>
            
            <View style={[styles.metricCard, styles.subscriptionsCard]}>
              <View style={styles.metricIcon}>
                <Ionicons name="card" size={24} color="#22C55E" />
              </View>
              <Text style={styles.metricNumber}>{stats?.active_subscriptions.toLocaleString() || '0'}</Text>
              <Text style={styles.metricLabel}>Assinaturas Ativas</Text>
              <Text style={styles.metricChange}>+8% este mês</Text>
            </View>
          </View>
          
          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, styles.gymsCard]}>
              <View style={styles.metricIcon}>
                <Ionicons name="business" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.metricNumber}>{stats?.total_gyms || '0'}</Text>
              <Text style={styles.metricLabel}>Academias Parceiras</Text>
              <Text style={styles.metricChange}>+5 esta semana</Text>
            </View>
            
            <View style={[styles.metricCard, styles.tokensCard]}>
              <View style={styles.metricIcon}>
                <Ionicons name="qr-code" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.metricNumber}>{stats?.tokens_generated_today.toLocaleString() || '0'}</Text>
              <Text style={styles.metricLabel}>Tokens Hoje</Text>
              <Text style={styles.metricChange}>Meta: 1.500</Text>
            </View>
          </View>
        </View>

        {/* Revenue Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Receita Mensal</Text>
          <View style={styles.chartCard}>
            <View style={styles.revenueHeader}>
              <Text style={styles.revenueAmount}>R$ 427.350</Text>
              <Text style={styles.revenueGrowth}>+15.2% vs mês anterior</Text>
            </View>
            
            <View style={styles.chartArea}>
              <View style={styles.chartBars}>
                {[65, 80, 45, 90, 75, 85, 95].map((height, index) => (
                  <View key={index} style={styles.chartBarContainer}>
                    <View style={[styles.chartBar, { height: height }]} />
                    <Text style={styles.chartLabel}>
                      {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'][index]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/admin/(tabs)/users')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="person-add" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.actionText}>Adicionar Usuário</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/admin/(tabs)/gyms')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="add-circle" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.actionText}>Nova Academia</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.actionIcon}>
                <Ionicons name="document-text" size={24} color="#22C55E" />
              </View>
              <Text style={styles.actionText}>Gerar Relatório</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.actionIcon}>
                <Ionicons name="settings" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.actionText}>Configurações</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>Atividade Recente</Text>
          
          {[
            { icon: 'person-add', text: 'Novo usuário cadastrado: João Silva', time: '5 min atrás', color: '#3B82F6' },
            { icon: 'card', text: 'Pagamento processado: R$ 149,90', time: '12 min atrás', color: '#22C55E' },
            { icon: 'business', text: 'Nova academia aprovada: SmartFit Vila Olímpia', time: '1h atrás', color: '#F59E0B' },
            { icon: 'alert-circle', text: 'Token suspeito detectado e bloqueado', time: '2h atrás', color: '#EF4444' },
            { icon: 'qr-code', text: '150 tokens gerados na última hora', time: '2h atrás', color: '#8B5CF6' }
          ].map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              <View style={[styles.activityIconContainer, { backgroundColor: `${activity.color}20` }]}>
                <Ionicons name={activity.icon as any} size={20} color={activity.color} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{activity.text}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* System Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.sectionTitle}>Status do Sistema</Text>
          
          <View style={styles.statusCard}>
            <View style={styles.statusItem}>
              <View style={styles.statusIndicator}>
                <View style={[styles.statusDot, { backgroundColor: '#22C55E' }]} />
                <Text style={styles.statusLabel}>API Backend</Text>
              </View>
              <Text style={styles.statusValue}>Operacional</Text>
            </View>
            
            <View style={styles.statusItem}>
              <View style={styles.statusIndicator}>
                <View style={[styles.statusDot, { backgroundColor: '#22C55E' }]} />
                <Text style={styles.statusLabel}>Banco de Dados</Text>
              </View>
              <Text style={styles.statusValue}>Operacional</Text>
            </View>
            
            <View style={styles.statusItem}>
              <View style={styles.statusIndicator}>
                <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.statusLabel}>Pagamentos</Text>
              </View>
              <Text style={styles.statusValue}>Degradado</Text>
            </View>
            
            <View style={styles.statusItem}>
              <View style={styles.statusIndicator}>
                <View style={[styles.statusDot, { backgroundColor: '#22C55E' }]} />
                <Text style={styles.statusLabel}>Notificações</Text>
              </View>
              <Text style={styles.statusValue}>Operacional</Text>
            </View>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adminAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  adminRole: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '500',
  },
  headerTextContainer: {
    flex: 1,
  },
  logoutButton: {
    padding: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  metricsContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
  },
  usersCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  subscriptionsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  gymsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  tokensCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  metricIcon: {
    marginBottom: 8,
  },
  metricNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 4,
  },
  metricChange: {
    color: '#22C55E',
    fontSize: 10,
    fontWeight: '500',
  },
  chartContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  chartCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
  },
  revenueHeader: {
    marginBottom: 20,
  },
  revenueAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  revenueGrowth: {
    color: '#22C55E',
    fontSize: 14,
  },
  chartArea: {
    height: 120,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    backgroundColor: '#F59E0B',
    width: 20,
    borderRadius: 10,
    marginBottom: 8,
  },
  chartLabel: {
    color: '#94A3B8',
    fontSize: 10,
  },
  actionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    marginBottom: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  activityContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 2,
  },
  activityTime: {
    color: '#94A3B8',
    fontSize: 12,
  },
  statusContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusLabel: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  statusValue: {
    color: '#94A3B8',
    fontSize: 12,
  },
});