import React, { useState, useEffect } from 'react';
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

interface User {
  id: string;
  full_name: string;
  email: string;
  plan_type: string;
  payment_status: 'active' | 'overdue' | 'suspended';
  subscription_end: string;
  monthly_amount: number;
}

interface GymRevenue {
  id: string;
  name: string;
  monthly_checkins: number;
  monthly_revenue: number;
  commission_rate: number;
  commission_earned: number;
  status: string;
}

interface FinancialStats {
  monthly_revenue: number;
  overdue_payments: number;
  active_subscriptions: number;
  blocked_users: number;
  total_gym_commissions: number;
  total_tokens_used: number;
  avg_revenue_per_user: number;
}

export default function AdminFinancial() {
  const [users, setUsers] = useState<User[]>([]);
  const [gymRevenues, setGymRevenues] = useState<GymRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<FinancialStats>({
    monthly_revenue: 0,
    overdue_payments: 0,
    active_subscriptions: 0,
    blocked_users: 0,
    total_gym_commissions: 0,
    total_tokens_used: 0,
    avg_revenue_per_user: 0
  });

  const router = useRouter();

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Load dashboard stats
      const statsResponse = await axios.get(`${API_URL}/api/admin/dashboard`, { headers });
      setStats({
        monthly_revenue: statsResponse.data.monthly_revenue,
        overdue_payments: statsResponse.data.overdue_payments,
        active_subscriptions: statsResponse.data.active_subscriptions,
        blocked_users: statsResponse.data.blocked_users
      });

      // Load users for financial management
      const usersResponse = await axios.get(`${API_URL}/api/admin/users`, { headers });
      setUsers(usersResponse.data);
      
    } catch (error: any) {
      console.error('Error loading financial data:', error);
      if (error.response?.status === 401) {
        router.replace('/admin/login');
      } else {
        Alert.alert('Erro', 'Erro ao carregar dados financeiros');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFinancialData();
  };

  const blockUser = async (userId: string) => {
    Alert.alert(
      'Bloquear Usuário',
      'Tem certeza que deseja bloquear este usuário? Ele não poderá gerar tokens.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) return;

              const headers = { Authorization: `Bearer ${token}` };
              await axios.put(`${API_URL}/api/admin/users/${userId}/block`, {}, { headers });

              Alert.alert('Sucesso', 'Usuário bloqueado com sucesso');
              loadFinancialData();
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.detail || 'Erro ao bloquear usuário');
            }
          }
        }
      ]
    );
  };

  const verifyPayment = async (userId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/api/admin/users/${userId}/verify-payment`, {}, { headers });

      Alert.alert('Sucesso', 'Pagamento verificado e atualizado');
      loadFinancialData();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.detail || 'Erro ao verificar pagamento');
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'basic': return '#64748B';
      case 'premium': return '#F59E0B';
      case 'vip': return '#A855F7';
      default: return '#64748B';
    }
  };

  const getPlanName = (planType: string) => {
    switch (planType) {
      case 'basic': return 'Básico';
      case 'premium': return 'Premium';
      case 'vip': return 'VIP';
      default: return 'Desconhecido';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#22C55E';
      case 'overdue': return '#F59E0B';
      case 'suspended': return '#EF4444';
      default: return '#64748B';
    }
  };

  const getPaymentStatusName = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'overdue': return 'Em Atraso';
      case 'suspended': return 'Suspenso';
      default: return 'Desconhecido';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Carregando dados financeiros...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Controle Financeiro</Text>
        <Text style={styles.subtitle}>Gerencie pagamentos e assinaturas</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Financial Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                <Ionicons name="cash" size={24} color="#22C55E" />
              </View>
              <Text style={styles.statValue}>R$ {stats.monthly_revenue.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Receita Mensal</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                <Ionicons name="warning" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{stats.overdue_payments}</Text>
              <Text style={styles.statLabel}>Pagamentos em Atraso</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                <Ionicons name="people" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.statValue}>{stats.active_subscriptions}</Text>
              <Text style={styles.statLabel}>Assinaturas Ativas</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                <Ionicons name="ban" size={24} color="#EF4444" />
              </View>
              <Text style={styles.statValue}>{stats.blocked_users}</Text>
              <Text style={styles.statLabel}>Usuários Bloqueados</Text>
            </View>
          </View>
        </View>

        {/* Users List for Financial Management */}
        <View style={styles.usersContainer}>
          <Text style={styles.sectionTitle}>Controle de Pagamentos</Text>
          
          {users.length > 0 ? users.map(user => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.full_name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.userMeta}>
                    <View style={[styles.planBadge, { backgroundColor: getPlanColor(user.plan_type) + '20' }]}>
                      <Text style={[styles.planText, { color: getPlanColor(user.plan_type) }]}>
                        {getPlanName(user.plan_type)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getPaymentStatusColor(user.payment_status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getPaymentStatusColor(user.payment_status) }]}>
                        {getPaymentStatusName(user.payment_status)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.paymentInfo}>
                <View style={styles.paymentDetail}>
                  <Ionicons name="card" size={16} color="#94A3B8" />
                  <Text style={styles.paymentText}>R$ {user.monthly_amount?.toFixed(2) || '0.00'}/mês</Text>
                </View>
                <View style={styles.paymentDetail}>
                  <Ionicons name="calendar" size={16} color="#94A3B8" />
                  <Text style={styles.paymentText}>
                    Vence: {user.subscription_end ? new Date(user.subscription_end).toLocaleDateString('pt-BR') : 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.userActions}>
                <TouchableOpacity 
                  style={styles.verifyButton}
                  onPress={() => verifyPayment(user.id)}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={styles.verifyButtonText}>Verificar Pagamento</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.blockButton}
                  onPress={() => blockUser(user.id)}
                >
                  <Ionicons name="ban" size={16} color="#EF4444" />
                  <Text style={styles.blockButtonText}>Bloquear</Text>
                </TouchableOpacity>
              </View>
            </View>
          )) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="card-outline" size={64} color="#64748B" />
              <Text style={styles.emptyText}>Nenhum usuário encontrado</Text>
            </View>
          )}
        </View>

        {/* Revenue Chart Placeholder */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Receita dos Últimos 6 Meses</Text>
          <View style={styles.chartPlaceholder}>
            <Ionicons name="bar-chart" size={48} color="#64748B" />
            <Text style={styles.chartText}>Gráfico de receita em desenvolvimento</Text>
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
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  usersContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  userHeader: {
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paymentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 4,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  verifyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  verifyButtonText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  blockButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  blockButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 16,
  },
  chartContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  chartPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  chartText: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 12,
  },
});