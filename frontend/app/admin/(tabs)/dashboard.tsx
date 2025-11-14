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
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = '/api';

interface DashboardStats {
  total_clients: number;
  pending_approval: number;
  approved_clients: number;
  total_gyms: number;
  total_nutritionists: number;
  total_personal_trainers: number;
  pending_payments: number;
  total_revenue: number;
}

interface PendingClient {
  id: string;
  full_name: string;
  email: string;
  plan_type: string;
  created_at: string;
  status: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingClients, setPendingClients] = useState<PendingClient[]>([]);
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
      
      // Carregar estatísticas
      const statsResponse = await axios.get(`${API_URL}/admin/dashboard/stats`, { headers });
      setStats(statsResponse.data);

      // Carregar clientes pendentes
      const clientsResponse = await axios.get(`${API_URL}/admin/pending-clients`, { headers });
      setPendingClients(clientsResponse.data.clients || []);

    } catch (error: any) {
      console.error('Erro ao carregar dashboard:', error);
      if (error.response?.status === 401) {
        router.replace('/admin/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const approveClient = async (clientId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(
        `${API_URL}/admin/approve-client/${clientId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      Alert.alert('Sucesso!', 'Cliente aprovado com sucesso!');
      loadDashboard();
    } catch (error) {
      console.error('Erro ao aprovar cliente:', error);
      Alert.alert('Erro', 'Não foi possível aprovar o cliente.');
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType?.toLowerCase()) {
      case 'basico': return '#22C55E';
      case 'intermediario': return '#F59E0B';
      case 'vip': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getPlanName = (planType: string) => {
    switch (planType?.toLowerCase()) {
      case 'basico': return 'Básico';
      case 'intermediario': return 'Intermediário';
      case 'vip': return 'VIP';
      default: return 'Padrão';
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
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadDashboard} tintColor="#8B5CF6" />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={['#8B5CF6', '#6D28D9']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Dashboard Admin</Text>
          <Text style={styles.headerSubtitle}>Painel de Controle</Text>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          {/* Clientes Card */}
          <View style={[styles.statCard, { backgroundColor: '#22C55E20', borderColor: '#22C55E40' }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={32} color="#22C55E" />
            </View>
            <Text style={styles.statValue}>{stats?.total_clients || 0}</Text>
            <Text style={styles.statLabel}>Total de Clientes</Text>
          </View>

          {/* Pendentes Card */}
          <View style={[styles.statCard, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B40' }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time" size={32} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{stats?.pending_approval || 0}</Text>
            <Text style={styles.statLabel}>Aguardando Aprovação</Text>
          </View>

          {/* Academias Card */}
          <View style={[styles.statCard, { backgroundColor: '#3B82F620', borderColor: '#3B82F640' }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="fitness" size={32} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{stats?.total_gyms || 0}</Text>
            <Text style={styles.statLabel}>Academias</Text>
          </View>

          {/* Nutricionistas Card */}
          <View style={[styles.statCard, { backgroundColor: '#10B98120', borderColor: '#10B98140' }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="restaurant" size={32} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{stats?.total_nutritionists || 0}</Text>
            <Text style={styles.statLabel}>Nutricionistas</Text>
          </View>

          {/* Personal Trainers Card */}
          <View style={[styles.statCard, { backgroundColor: '#8B5CF620', borderColor: '#8B5CF640' }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="barbell" size={32} color="#8B5CF6" />
            </View>
            <Text style={styles.statValue}>{stats?.total_personal_trainers || 0}</Text>
            <Text style={styles.statLabel}>Personal Trainers</Text>
          </View>

          {/* Pagamentos Pendentes Card */}
          <View style={[styles.statCard, { backgroundColor: '#EF444420', borderColor: '#EF444440' }]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="cash" size={32} color="#EF4444" />
            </View>
            <Text style={styles.statValue}>R$ {(stats?.pending_payments || 0).toFixed(2).replace('.', ',')}</Text>
            <Text style={styles.statLabel}>Pagamentos Pendentes</Text>
          </View>
        </View>

        {/* Clientes Pendentes de Aprovação */}
        {pendingClients.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="alert-circle" size={24} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Clientes Aguardando Aprovação</Text>
            </View>

            {pendingClients.map((client) => (
              <View key={client.id} style={styles.clientCard}>
                <View style={styles.clientInfo}>
                  <View style={styles.clientHeader}>
                    <Text style={styles.clientName}>{client.full_name}</Text>
                    <View style={[styles.planBadge, { backgroundColor: `${getPlanColor(client.plan_type)}30` }]}>
                      <Text style={[styles.planBadgeText, { color: getPlanColor(client.plan_type) }]}>
                        {getPlanName(client.plan_type)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.clientDetails}>
                    <Ionicons name="mail" size={14} color="#94A3B8" />
                    <Text style={styles.clientEmail}>{client.email}</Text>
                  </View>
                  
                  <View style={styles.clientDetails}>
                    <Ionicons name="calendar" size={14} color="#94A3B8" />
                    <Text style={styles.clientDate}>
                      Cadastrado em: {new Date(client.created_at).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.approveButton}
                  onPress={() => {
                    Alert.alert(
                      'Aprovar Cliente',
                      `Deseja aprovar o acesso de ${client.full_name}?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { 
                          text: 'Aprovar', 
                          onPress: () => approveClient(client.id)
                        }
                      ]
                    );
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.approveButtonText}>Aprovar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {pendingClients.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
            <Text style={styles.emptyStateText}>Nenhum cliente aguardando aprovação</Text>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/admin/(tabs)/gyms')}
            >
              <Ionicons name="fitness" size={32} color="#3B82F6" />
              <Text style={styles.actionButtonText}>Gerenciar Academias</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/admin/(tabs)/nutritionist')}
            >
              <Ionicons name="restaurant" size={32} color="#10B981" />
              <Text style={styles.actionButtonText}>Gerenciar Nutricionistas</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/admin/(tabs)/personal')}
            >
              <Ionicons name="barbell" size={32} color="#8B5CF6" />
              <Text style={styles.actionButtonText}>Gerenciar Personal</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/admin/(tabs)/users')}
            >
              <Ionicons name="people" size={32} color="#22C55E" />
              <Text style={styles.actionButtonText}>Ver Todos Clientes</Text>
            </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginTop: -20,
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  clientCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  clientInfo: {
    marginBottom: 16,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clientDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  clientEmail: {
    fontSize: 14,
    color: '#94A3B8',
  },
  clientDate: {
    fontSize: 13,
    color: '#94A3B8',
  },
  approveButton: {
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 16,
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
});
