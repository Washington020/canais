import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
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
  plan_type: string;
  assigned_at: string;
  active_plans: number;
  tokens_available: number;
  subscription_end?: string;
}

export default function MyClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [professional, setProfessional] = useState<any>(null);
  
  const router = useRouter();

  useEffect(() => {
    loadProfessionalData();
    loadClients();
  }, []);

  const loadProfessionalData = async () => {
    try {
      const professionalData = await AsyncStorage.getItem('professional');
      if (professionalData) {
        setProfessional(JSON.parse(professionalData));
      }
    } catch (error) {
      console.error('Error loading professional data:', error);
    }
  };

  const loadClients = async () => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) {
        router.replace('/professional/nutritionist/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/professionals/my-assigned-clients`, { headers });
      
      setClients(response.data.assigned_clients || []);
    } catch (error: any) {
      console.error('Error loading clients:', error);
      if (error.response?.status === 401) {
        router.replace('/professional/nutritionist/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClients();
  };

  const requestTransfer = (clientId: string, clientName: string) => {
    Alert.prompt(
      'Solicitar Transferência',
      `Por que deseja transferir ${clientName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async (reason) => {
            if (!reason) return;
            
            try {
              const token = await AsyncStorage.getItem('professionalToken');
              const headers = { Authorization: `Bearer ${token}` };
              
              await axios.post(
                `${API_URL}/professionals/request-client-transfer?client_id=${clientId}&reason=${encodeURIComponent(reason)}`,
                {},
                { headers }
              );
              
              Alert.alert('Sucesso', 'Solicitação enviada para análise do administrador');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível enviar a solicitação');
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const createPlan = (clientId: string, clientName: string) => {
    Alert.alert(
      'Criar Plano',
      `Criar plano de suplementação para ${clientName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Criar',
          onPress: () => {
            // Navigate to create plan screen with client data
            router.push(`/professional/nutritionist/(tabs)/create-plan?clientId=${clientId}&clientName=${encodeURIComponent(clientName)}`);
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
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
        <View>
          <Text style={styles.title}>Meus Clientes</Text>
          <Text style={styles.subtitle}>
            {professional?.full_name} - {professional?.cref_crn}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={async () => {
            await AsyncStorage.multiRemove(['professionalToken', 'professional']);
            router.replace('/professional/nutritionist/login');
          }}
        >
          <Ionicons name="log-out" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{clients.length}</Text>
            <Text style={styles.statLabel}>Clientes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {clients.reduce((total, client) => total + client.active_plans, 0)}
            </Text>
            <Text style={styles.statLabel}>Planos Ativos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{clients.filter(c => c.plan_type === 'vip').length}</Text>
            <Text style={styles.statLabel}>VIP</Text>
          </View>
        </View>

        {/* Clients List */}
        {clients.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#64748B" />
            <Text style={styles.emptyTitle}>Nenhum Cliente Atribuído</Text>
            <Text style={styles.emptyText}>
              Vá para a aba "Novos" para assumir clientes que ainda não têm nutricionista
            </Text>
          </View>
        ) : (
          <View style={styles.clientsContainer}>
            {clients.map((client) => (
              <View key={client.id} style={styles.clientCard}>
                <View style={styles.clientHeader}>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{client.full_name}</Text>
                    <Text style={styles.clientEmail}>{client.email}</Text>
                    <Text style={styles.clientPlan}>
                      Plano: {client.plan_type === 'premium' ? 'Premium' : 'VIP'}
                    </Text>
                  </View>
                  <View style={[
                    styles.planBadge,
                    { backgroundColor: client.plan_type === 'vip' ? '#FFD700' : '#8B5CF6' }
                  ]}>
                    <Text style={styles.planBadgeText}>
                      {client.plan_type.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.clientDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar" size={16} color="#22C55E" />
                    <Text style={styles.detailText}>
                      Cliente desde: {new Date(client.assigned_at).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="fitness" size={16} color="#22C55E" />
                    <Text style={styles.detailText}>
                      Planos ativos: {client.active_plans}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="ticket" size={16} color="#22C55E" />
                    <Text style={styles.detailText}>
                      Tokens: {client.tokens_available}
                    </Text>
                  </View>
                  
                  {client.subscription_end && (
                    <View style={styles.detailRow}>
                      <Ionicons name="time" size={16} color="#F59E0B" />
                      <Text style={styles.detailText}>
                        Vence: {new Date(client.subscription_end).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.clientActions}>
                  <TouchableOpacity 
                    style={styles.createPlanButton}
                    onPress={() => createPlan(client.id, client.full_name)}
                  >
                    <Ionicons name="add-circle" size={16} color="#22C55E" />
                    <Text style={styles.createPlanText}>Criar Plano</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.transferButton}
                    onPress={() => requestTransfer(client.id, client.full_name)}
                  >
                    <Ionicons name="swap-horizontal" size={16} color="#F59E0B" />
                    <Text style={styles.transferText}>Transferir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#22C55E',
    fontSize: 14,
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statNumber: {
    color: '#22C55E',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  clientsContainer: {
    paddingHorizontal: 24,
  },
  clientCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clientEmail: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 4,
  },
  clientPlan: {
    color: '#A1A1AA',
    fontSize: 12,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  planBadgeText: {
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
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 8,
  },
  clientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  createPlanButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    paddingVertical: 8,
    borderRadius: 6,
  },
  createPlanText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  transferText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});