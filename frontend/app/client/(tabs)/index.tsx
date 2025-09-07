import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import NavigationSystem from '../../../components/NavigationSystem';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface UserStats {
  total_workouts: number;
  completed_workouts: number;
  completion_rate: number;
  tokens_available: number;
  tokens_used: number;
  gyms_visited: number;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  plan_type: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
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
        router.replace('/client/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Load user data and stats in parallel
      const [userResponse, statsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/users/me`, { headers }),
        axios.get(`${API_URL}/api/users/stats`, { headers })
      ]);

      setUser(userResponse.data);
      setStats(statsResponse.data);
    } catch (error: any) {
      console.error('Dashboard error:', error);
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        router.replace('/client/login');
      } else {
        Alert.alert('Erro', 'Erro ao carregar dados do dashboard');
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

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'premium': return '#FFD700';
      case 'intermediate': return '#8B5CF6';
      default: return '#22C55E';
    }
  };

  const getPlanName = (planType: string) => {
    switch (planType) {
      case 'premium': return 'Premium';
      case 'intermediate': return 'Intermediário';
      default: return 'Básico';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Navigation System */}
      <NavigationSystem 
        title="Dashboard Cliente" 
        showBackButton={true}
        showExitButton={true}
      />

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="qr-code" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.statNumber}>{stats?.tokens_available || 0}</Text>
              <Text style={styles.statLabel}>Tokens Disponíveis</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="fitness" size={24} color="#22C55E" />
              </View>
              <Text style={styles.statNumber}>{stats?.completed_workouts || 0}</Text>
              <Text style={styles.statLabel}>Treinos Concluídos</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="location" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statNumber}>{stats?.gyms_visited || 0}</Text>
              <Text style={styles.statLabel}>Academias Visitadas</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="trending-up" size={24} color="#EF4444" />
              </View>
              <Text style={styles.statNumber}>{Math.round(stats?.completion_rate || 0)}%</Text>
              <Text style={styles.statLabel}>Taxa de Conclusão</Text>
            </View>
          </View>
        </View>

        {/* Progress Chart */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Progresso Semanal</Text>
          <View style={styles.progressChart}>
            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, index) => (
              <View key={index} style={styles.progressDay}>
                <View style={[
                  styles.progressBar,
                  { height: Math.random() * 40 + 20 },
                  index < 5 ? styles.progressBarCompleted : styles.progressBarPending
                ]} />
                <Text style={styles.progressDayText}>{day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/client/(tabs)/tokens')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="qr-code" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.actionText}>Gerar Token</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/client/(tabs)/workouts')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="fitness" size={24} color="#22C55E" />
              </View>
              <Text style={styles.actionText}>Ver Treinos</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/client/(tabs)/nutrition')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="restaurant" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.actionText}>Nutrição</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/client/(tabs)/gyms')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="location" size={24} color="#EF4444" />
              </View>
              <Text style={styles.actionText}>Buscar Academias</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>Atividades Recentes</Text>
          {[
            { icon: 'fitness', text: 'Treino de Peito concluído', time: '2 horas atrás', color: '#22C55E' },
            { icon: 'qr-code', text: 'Token gerado para SmartFit', time: '1 dia atrás', color: '#8B5CF6' },
            { icon: 'restaurant', text: 'Plano nutricional atualizado', time: '2 dias atrás', color: '#F59E0B' },
            { icon: 'card', text: 'Pagamento processado', time: '3 dias atrás', color: '#EF4444' }
          ].map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: `${activity.color}20` }]}>
                <Ionicons name={activity.icon as any} size={20} color={activity.color} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{activity.text}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Support Section */}
        <View style={styles.supportContainer}>
          <Text style={styles.sectionTitle}>Suporte</Text>
          <View style={styles.supportOptions}>
            <TouchableOpacity style={styles.supportOption}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#8B5CF6" />
              <Text style={styles.supportText}>Chat ao Vivo 24/7</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.supportOption}>
              <Ionicons name="help-circle" size={20} color="#8B5CF6" />
              <Text style={styles.supportText}>Central de Ajuda</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.supportOption}>
              <Ionicons name="call" size={20} color="#8B5CF6" />
              <Text style={styles.supportText}>Contato Direto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configurações</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowSettingsModal(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* User Profile Section */}
            <View style={styles.profileSection}>
              <View style={styles.profileHeader}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>
                    {user?.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{user?.full_name}</Text>
                  <Text style={styles.profileEmail}>{user?.email}</Text>
                  <View style={styles.profilePlan}>
                    <Text style={[styles.profilePlanText, { color: getPlanColor(user?.plan_type || 'basic') }]}>
                      Plano {getPlanName(user?.plan_type || 'basic')}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Account Details */}
            <View style={styles.accountSection}>
              <Text style={styles.sectionTitle}>Detalhes da Conta</Text>
              
              <View style={styles.accountItem}>
                <View style={styles.accountItemIcon}>
                  <Ionicons name="person-outline" size={20} color="#8B5CF6" />
                </View>
                <View style={styles.accountItemContent}>
                  <Text style={styles.accountItemLabel}>Nome Completo</Text>
                  <Text style={styles.accountItemValue}>{user?.full_name}</Text>
                </View>
              </View>

              <View style={styles.accountItem}>
                <View style={styles.accountItemIcon}>
                  <Ionicons name="mail-outline" size={20} color="#8B5CF6" />
                </View>
                <View style={styles.accountItemContent}>
                  <Text style={styles.accountItemLabel}>Email</Text>
                  <Text style={styles.accountItemValue}>{user?.email}</Text>
                </View>
              </View>

              <View style={styles.accountItem}>
                <View style={styles.accountItemIcon}>
                  <Ionicons name="card-outline" size={20} color="#8B5CF6" />
                </View>
                <View style={styles.accountItemContent}>
                  <Text style={styles.accountItemLabel}>Plano Atual</Text>
                  <Text style={[styles.accountItemValue, { color: getPlanColor(user?.plan_type || 'basic') }]}>
                    {getPlanName(user?.plan_type || 'basic')}
                  </Text>
                </View>
              </View>

              <View style={styles.accountItem}>
                <View style={styles.accountItemIcon}>
                  <Ionicons name="calendar-outline" size={20} color="#8B5CF6" />
                </View>
                <View style={styles.accountItemContent}>
                  <Text style={styles.accountItemLabel}>Membro desde</Text>
                  <Text style={styles.accountItemValue}>Janeiro 2024</Text>
                </View>
              </View>
            </View>

            {/* Statistics Section */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Suas Estatísticas</Text>
              
              <View style={styles.modalStatsGrid}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatNumber}>{stats?.tokens_available || 0}</Text>
                  <Text style={styles.modalStatLabel}>Tokens Disponíveis</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatNumber}>{stats?.tokens_used || 0}</Text>
                  <Text style={styles.modalStatLabel}>Tokens Usados</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatNumber}>{stats?.gyms_visited || 0}</Text>
                  <Text style={styles.modalStatLabel}>Academias Visitadas</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatNumber}>{stats?.completed_workouts || 0}</Text>
                  <Text style={styles.modalStatLabel}>Treinos Concluídos</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionSection}>
              <TouchableOpacity style={styles.supportButton}>
                <Ionicons name="help-circle-outline" size={20} color="#22C55E" />
                <Text style={styles.supportButtonText}>Central de Ajuda</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutButtonModal} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={styles.logoutButtonText}>Sair da Conta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  planBadge: {
    alignSelf: 'flex-start',
  },
  planText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  backButton: {
    padding: 8,
  },
  settingsButton: {
    padding: 8,
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 8,
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  progressTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  progressChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
  },
  progressDay: {
    alignItems: 'center',
    flex: 1,
  },
  progressBar: {
    width: 20,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    marginBottom: 8,
  },
  progressBarCompleted: {
    backgroundColor: '#22C55E',
  },
  progressBarPending: {
    backgroundColor: '#64748B',
  },
  progressDayText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  actionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
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
  },
  activityIcon: {
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
    fontWeight: '500',
    marginBottom: 2,
  },
  activityTime: {
    color: '#94A3B8',
    fontSize: 12,
  },
  supportContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  supportOptions: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  supportText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1D29',
    borderRadius: 16,
    padding: 0,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  profileSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 8,
  },
  profilePlan: {
    alignSelf: 'flex-start',
  },
  profilePlanText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  accountSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  accountItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountItemContent: {
    flex: 1,
  },
  accountItemLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 2,
  },
  accountItemValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statsSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modalStatItem: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalStatNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalStatLabel: {
    color: '#94A3B8',
    fontSize: 10,
    textAlign: 'center',
  },
  actionSection: {
    padding: 20,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  supportButtonText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  logoutButtonModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    padding: 12,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});
