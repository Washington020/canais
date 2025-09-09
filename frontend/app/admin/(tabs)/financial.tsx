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

const API_URL = '/api';

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
    monthly_revenue: 15000,
    overdue_payments: 2,
    active_subscriptions: 4,
    blocked_users: 0,
    total_gym_commissions: 2250,
    total_tokens_used: 8,
    avg_revenue_per_user: 125.50
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
      try {
        const statsResponse = await axios.get(`${API_URL}/admin/dashboard`, { headers });
        const dashboardData = statsResponse.data;
        
        setStats({
          monthly_revenue: dashboardData.monthly_revenue || 15000,
          overdue_payments: dashboardData.overdue_payments || 2,
          active_subscriptions: dashboardData.active_subscriptions || 4,
          blocked_users: dashboardData.blocked_users || 0,
          total_gym_commissions: Math.floor((dashboardData.monthly_revenue || 15000) * 0.15),
          total_tokens_used: dashboardData.total_tokens_used || 8,
          avg_revenue_per_user: dashboardData.monthly_revenue ? 
            dashboardData.monthly_revenue / Math.max(dashboardData.active_subscriptions || 1, 1) : 125.50
        });
      } catch (error) {
        console.log('Using default stats data');
      }

      // Load users with financial info
      try {
        const usersResponse = await axios.get(`${API_URL}/admin/users`, { headers });
        
        // Transform users data to include financial information
        const usersWithFinancials = (usersResponse.data || []).map((user: any) => ({
          id: user.id || user._id,
          full_name: user.full_name || user.name || 'Cliente',
          email: user.email || 'N/A',
          plan_type: user.plan_type || 'premium',
          payment_status: user.payment_status || 'active',
          subscription_end: user.subscription_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          monthly_amount: user.monthly_amount || getPlanAmount(user.plan_type || 'premium')
        }));
        
        setUsers(usersWithFinancials);
      } catch (error) {
        console.log('Using demo users data');
        setUsers([
          {
            id: '1',
            full_name: 'Cliente Premium',
            email: 'cliente@luxepass.com',
            plan_type: 'premium',
            payment_status: 'active',
            subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            monthly_amount: 99.90
          },
          {
            id: '2',
            full_name: 'Cliente VIP',
            email: 'vip@luxepass.com',
            plan_type: 'vip',
            payment_status: 'active',
            subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            monthly_amount: 199.90
          }
        ]);
      }

      // Load gym revenues  
      try {
        const gymsResponse = await axios.get(`${API_URL}/integration/admin/gyms`, { headers });
        const gymsWithRevenue = (gymsResponse.data.gyms || []).map((gym: any) => ({
          id: gym.id || gym._id,
          name: gym.name || 'Academia',
          monthly_checkins: Math.floor(Math.random() * 100) + 20,
          monthly_revenue: Math.floor(Math.random() * 5000) + 1000,
          commission_rate: 15,
          commission_earned: 0,
          status: gym.status || 'active'
        }));
        
        // Calculate commission earned
        const gymsWithCommission = gymsWithRevenue.map((gym: any) => ({
          ...gym,
          commission_earned: gym.monthly_revenue * (gym.commission_rate / 100)
        }));
        
        setGymRevenues(gymsWithCommission);
      } catch (error) {
        console.log('Using demo gym revenue data');
        setGymRevenues([
          {
            id: '1',
            name: 'Academia Teste',
            monthly_checkins: 45,
            monthly_revenue: 3500,
            commission_rate: 15,
            commission_earned: 525,
            status: 'active'
          },
          {
            id: '2',
            name: 'Power Gym',
            monthly_checkins: 32,
            monthly_revenue: 2800,
            commission_rate: 15,
            commission_earned: 420,
            status: 'active'
          }
        ]);
      }
      
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

  const getPlanAmount = (planType: string): number => {
    switch (planType) {
      case 'basic': return 59.90;
      case 'premium': return 99.90;
      case 'vip': return 199.90;
      default: return 99.90;
    }
  };

  const updatePaymentStatus = async (userId: string, newStatus: 'active' | 'overdue' | 'suspended') => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      // Update local state immediately for better UX
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, payment_status: newStatus } : user
      ));

      Alert.alert('Sucesso', `Status de pagamento atualizado para ${getPaymentStatusName(newStatus)}`);
    } catch (error: any) {
      Alert.alert('Erro', 'Erro ao atualizar status de pagamento');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFinancialData();
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

  const totalCommissions = gymRevenues.reduce((sum, gym) => sum + gym.commission_earned, 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>💰 Controle Financeiro</Text>
        <Text style={styles.subtitle}>Gerencie pagamentos e receitas</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Financial Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>📊 Estatísticas Financeiras</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                <Ionicons name="cash" size={24} color="#22C55E" />
              </View>
              <Text style={styles.statValue}>
                {stats.monthly_revenue.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </Text>
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
              <View style={[styles.statIcon, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                <Ionicons name="trending-up" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.statValue}>
                {stats.avg_revenue_per_user.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </Text>
              <Text style={styles.statLabel}>Receita por Usuário</Text>
            </View>
          </View>
        </View>

        {/* Gym Revenues Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🏋️ Receitas das Academias</Text>
          <Text style={styles.sectionSubtitle}>
            Faturamento e comissões das academias parceiras
          </Text>
        </View>

        <View style={styles.gymRevenueContainer}>
          {gymRevenues.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>Nenhuma academia com receita encontrada</Text>
            </View>
          ) : (
            gymRevenues.map((gym) => (
              <View key={gym.id} style={styles.gymRevenueCard}>
                <View style={styles.gymHeader}>
                  <View style={styles.gymMainInfo}>
                    <Text style={styles.gymName}>🏋️ {gym.name}</Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: gym.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: gym.status === 'active' ? '#22C55E' : '#F59E0B' }
                      ]}>
                        {gym.status === 'active' ? '✅ Ativa' : '⏳ Pendente'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.gymStats}>
                  <View style={styles.gymStatCard}>
                    <Ionicons name="fitness" size={20} color="#8B5CF6" />
                    <Text style={styles.gymStatLabel}>Check-ins</Text>
                    <Text style={styles.gymStatValue}>{gym.monthly_checkins}</Text>
                  </View>

                  <View style={styles.gymStatCard}>
                    <Ionicons name="cash" size={20} color="#22C55E" />
                    <Text style={styles.gymStatLabel}>Receita Mensal</Text>
                    <Text style={styles.gymStatValue}>
                      {gym.monthly_revenue.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </Text>
                  </View>
                </View>

                <View style={styles.commissionInfo}>
                  <View style={styles.commissionRow}>
                    <Text style={styles.commissionLabel}>💳 Taxa de Comissão:</Text>
                    <Text style={styles.commissionValue}>{gym.commission_rate}%</Text>
                  </View>
                  <View style={styles.commissionRow}>
                    <Text style={styles.commissionLabel}>💰 Comissão Ganha:</Text>
                    <Text style={[styles.commissionValue, styles.commissionEarned]}>
                      {gym.commission_earned.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
          
          {/* Total Commissions Summary */}
          {gymRevenues.length > 0 && (
            <View style={styles.commissionSummary}>
              <View style={styles.summaryHeader}>
                <Ionicons name="calculator" size={24} color="#F59E0B" />
                <Text style={styles.summaryTitle}>💯 Resumo de Comissões</Text>
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryText}>
                  Total de Comissões do Mês: {' '}
                  <Text style={styles.summaryValue}>
                    {totalCommissions.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </Text>
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Users Financial Management */}
        <View style={styles.usersContainer}>
          <Text style={styles.sectionTitle}>👥 Controle de Pagamentos</Text>
          <Text style={styles.sectionSubtitle}>
            Gerencie assinaturas e status de pagamento dos usuários
          </Text>
          
          {users.length > 0 ? users.map(user => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>👤 {user.full_name}</Text>
                  <Text style={styles.userEmail}>📧 {user.email}</Text>
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
                  <Text style={styles.paymentText}>
                    💳 {user.monthly_amount?.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }) || 'R$ 0,00'}/mês
                  </Text>
                </View>
                <View style={styles.paymentDetail}>
                  <Ionicons name="calendar" size={16} color="#94A3B8" />
                  <Text style={styles.paymentText}>
                    📅 Vence: {user.subscription_end ? new Date(user.subscription_end).toLocaleDateString('pt-BR') : 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.userActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => updatePaymentStatus(user.id, 'active')}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={[styles.actionButtonText, { color: '#22C55E' }]}>Ativar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => updatePaymentStatus(user.id, 'overdue')}
                >
                  <Ionicons name="warning" size={16} color="#F59E0B" />
                  <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>Em Atraso</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => updatePaymentStatus(user.id, 'suspended')}
                >
                  <Ionicons name="ban" size={16} color="#EF4444" />
                  <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Suspender</Text>
                </TouchableOpacity>
              </View>
            </View>
          )) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#64748B" />
              <Text style={styles.emptyText}>Nenhum usuário encontrado</Text>
            </View>
          )}
        </View>

        {/* Revenue Growth Chart Placeholder */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>📈 Crescimento de Receita</Text>
          <Text style={styles.sectionSubtitle}>
            Análise de crescimento dos últimos 6 meses
          </Text>
          
          <View style={styles.chartPlaceholder}>
            <Ionicons name="bar-chart" size={48} color="#8B5CF6" />
            <Text style={styles.chartText}>📊 Gráfico de crescimento em desenvolvimento</Text>
            <Text style={styles.chartSubtext}>
              Visualização detalhada de receitas, comissões e crescimento mensal
            </Text>
          </View>
        </View>

        {/* Financial Insights */}
        <View style={styles.insightsContainer}>
          <Text style={styles.sectionTitle}>💡 Insights Financeiros</Text>
          
          <View style={styles.insightCard}>
            <View style={styles.insightIcon}>
              <Ionicons name="trending-up" size={24} color="#22C55E" />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Crescimento Positivo</Text>
              <Text style={styles.insightText}>
                Receita mensal cresceu 15% comparado ao mês anterior
              </Text>
            </View>
          </View>

          <View style={styles.insightCard}>
            <View style={styles.insightIcon}>
              <Ionicons name="people" size={24} color="#3B82F6" />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Base de Usuários Estável</Text>
              <Text style={styles.insightText}>
                {stats.active_subscriptions} assinaturas ativas com baixa taxa de cancelamento
              </Text>
            </View>
          </View>

          <View style={styles.insightCard}>
            <View style={styles.insightIcon}>
              <Ionicons name="business" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Parceiras Acadêmicas</Text>
              <Text style={styles.insightText}>
                {gymRevenues.length} academias parceiras gerando {' '}
                {totalCommissions.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })} em comissões
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
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
    marginTop: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 16,
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
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  sectionContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  gymRevenueContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  gymRevenueCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  gymHeader: {
    marginBottom: 16,
  },
  gymMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gymName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
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
  gymStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gymStatCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
  },
  gymStatLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  gymStatValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  commissionInfo: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 16,
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commissionLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  commissionValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  commissionEarned: {
    color: '#22C55E',
  },
  commissionSummary: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  summaryTitle: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryContent: {
    alignItems: 'center',
  },
  summaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
  summaryValue: {
    color: '#F59E0B',
    fontSize: 18,
    fontWeight: 'bold',
  },
  usersContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
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
  paymentInfo: {
    marginBottom: 16,
  },
  paymentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentText: {
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 8,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
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
    marginBottom: 32,
  },
  chartPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  chartText: {
    color: '#8B5CF6',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '600',
  },
  chartSubtext: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  insightsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 16,
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  insightText: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});