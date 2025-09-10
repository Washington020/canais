import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface Client {
  id: string;
  full_name: string;
  email: string;
  plan: string;
  status: string;
  flagged_date?: string;
  last_workout?: string;
  next_session?: string;
  progress_status: 'excellent' | 'good' | 'needs_attention';
}

export default function PersonalTrainerClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [professional, setProfessional] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadProfessionalData = useCallback(async () => {
    try {
      const storedProfessional = await AsyncStorage.getItem('professional');
      if (storedProfessional) {
        setProfessional(JSON.parse(storedProfessional));
      }
    } catch (error) {
      console.error('Error loading professional data:', error);
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) {
        Alert.alert('Erro', 'Token não encontrado', [
          { text: 'OK', onPress: () => router.replace('/professional/personal/login') }
        ]);
        return;
      }

      const response = await axios.get(`${API_URL}/professionals/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Simulate client data with workout progress for personal trainer
      const mockClients: Client[] = [
        {
          id: '1',
          full_name: 'Ana Silva Premium',
          email: 'ana@luxepass.com',
          plan: 'premium',
          status: 'active',
          flagged_date: '2025-01-10',
          last_workout: '2025-01-12',
          next_session: '2025-01-15',
          progress_status: 'excellent'
        },
        {
          id: '2',
          full_name: 'Carlos Santos VIP',
          email: 'carlos@luxepass.com',
          plan: 'vip',
          status: 'active',
          flagged_date: '2025-01-08',
          last_workout: '2025-01-11',
          next_session: '2025-01-14',
          progress_status: 'good'
        },
        {
          id: '3',
          full_name: 'Maria Oliveira Premium',
          email: 'maria@luxepass.com',
          plan: 'premium',
          status: 'active',
          flagged_date: '2025-01-05',
          last_workout: '2025-01-09',
          next_session: '2025-01-16',
          progress_status: 'needs_attention'
        }
      ];

      setClients(mockClients);
    } catch (error: any) {
      console.error('Error loading clients:', error);
      if (error.response?.status === 401) {
        Alert.alert('Erro', 'Sessão expirada', [
          { text: 'OK', onPress: () => router.replace('/professional/personal/login') }
        ]);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar os clientes');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadProfessionalData();
    loadClients();
  }, [loadProfessionalData, loadClients]);

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'excellent': return '#22C55E';
      case 'good': return '#F59E0B';
      case 'needs_attention': return '#EF4444';
      default: return '#64748B';
    }
  };

  const getProgressText = (status: string) => {
    switch (status) {
      case 'excellent': return 'Excelente';
      case 'good': return 'Bom';
      case 'needs_attention': return 'Atenção';
      default: return 'N/A';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'vip': return '#8B5CF6';
      case 'premium': return '#F59E0B';
      default: return '#64748B';
    }
  };

  const handleClientPress = (client: Client) => {
    Alert.alert(
      `👥 ${client.full_name}`,
      `Plano: ${client.plan.toUpperCase()}\n` +
      `Status: ${client.status}\n` +
      `Último treino: ${client.last_workout || 'N/A'}\n` +
      `Próxima sessão: ${client.next_session || 'N/A'}\n` +
      `Progresso: ${getProgressText(client.progress_status)}`,
      [
        { text: 'Criar Plano', onPress: () => router.push('/professional/personal/(tabs)/create-plan') },
        { text: 'Agendar', onPress: () => Alert.alert('Info', 'Funcionalidade em desenvolvimento') },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const renderClient = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={styles.clientCard}
      onPress={() => handleClientPress(item)}
    >
      <View style={styles.clientHeader}>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.full_name}</Text>
          <Text style={styles.clientEmail}>{item.email}</Text>
        </View>
        <View style={[styles.planBadge, { backgroundColor: getPlanColor(item.plan) }]}>
          <Text style={styles.planText}>{item.plan.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.clientDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="fitness" size={16} color="#94A3B8" />
          <Text style={styles.detailText}>Último treino: {item.last_workout || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#94A3B8" />
          <Text style={styles.detailText}>Próxima sessão: {item.next_session || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="trending-up" size={16} color={getProgressColor(item.progress_status)} />
          <Text style={[styles.detailText, { color: getProgressColor(item.progress_status) }]}>
            Progresso: {getProgressText(item.progress_status)}
          </Text>
        </View>
      </View>
      
      <View style={styles.clientActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/professional/personal/(tabs)/create-plan')}
        >
          <Ionicons name="add-circle" size={16} color="#F59E0B" />
          <Text style={styles.actionText}>Criar Plano</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => Alert.alert('Info', 'Funcionalidade de agendamento em desenvolvimento')}
        >
          <Ionicons name="calendar" size={16} color="#22C55E" />
          <Text style={styles.actionText}>Agendar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Carregando clientes...</Text>
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
          <Text style={styles.headerTitle}>Meus Clientes</Text>
          <Text style={styles.headerSubtitle}>
            {professional?.full_name || 'Personal Trainer'} • {clients.length} clientes ativos
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="fitness" size={24} color="#F59E0B" />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{clients.length}</Text>
          <Text style={styles.statLabel}>Clientes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{clients.filter(c => c.progress_status === 'excellent').length}</Text>
          <Text style={styles.statLabel}>Excelentes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{clients.filter(c => c.next_session).length}</Text>
          <Text style={styles.statLabel}>Agendados</Text>
        </View>
      </View>

      {/* Clients List */}
      <View style={styles.content}>
        {clients.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people" size={64} color="#64748B" />
            <Text style={styles.emptyTitle}>Nenhum cliente encontrado</Text>
            <Text style={styles.emptySubtitle}>
              Clientes Premium e VIP aparecerão aqui após serem designados a você
            </Text>
          </View>
        ) : (
          <FlatList
            data={clients}
            keyExtractor={(item) => item.id}
            renderItem={renderClient}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#F59E0B"
                colors={['#F59E0B']}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
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
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
  },
  headerIcon: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statNumber: {
    color: '#F59E0B',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  listContainer: {
    paddingBottom: 100,
  },
  clientCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  clientEmail: {
    color: '#94A3B8',
    fontSize: 14,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  planText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  clientDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    color: '#E2E8F0',
    fontSize: 12,
    marginLeft: 8,
  },
  clientActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  actionText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});