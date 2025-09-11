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

interface AvailableClient {
  id: string;
  full_name: string;
  email: string;
  plan_type: string;
  registration_date: string;
  fitness_goals: string[];
  experience_level: string;
  status: string;
}

export default function NewClients() {
  const [availableClients, setAvailableClients] = useState<AvailableClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assumingClient, setAssumingClient] = useState<string | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    loadAvailableClients();
  }, []);

  const loadAvailableClients = async () => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) {
        router.replace('/professional/nutritionist/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/professionals/unassigned-clients`, { headers });
      
      console.log('Clientes disponíveis:', response.data);
      setAvailableClients(response.data.clients || []);
    } catch (error: any) {
      console.error('Error loading available clients:', error);
      if (error.response?.status === 401) {
        router.replace('/professional/nutritionist/login');
      } else {
        Alert.alert('Erro', 'Não foi possível carregar clientes disponíveis');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAvailableClients();
  };

  const assumeClient = async (clientId: string, clientName: string) => {
    Alert.alert(
      'Assumir Cliente',
      `Deseja assumir ${clientName} como seu cliente?\n\nAo assumir, você se tornará responsável pelo acompanhamento nutricional desta pessoa.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Assumir Cliente',
          style: 'default',
          onPress: async () => {
            setAssumingClient(clientId);
            try {
              const token = await AsyncStorage.getItem('professionalToken');
              const headers = { Authorization: `Bearer ${token}` };
              
              await axios.post(
                `${API_URL}/professionals/flag-client`,
                { client_id: clientId },
                { headers }
              );
              
              Alert.alert(
                '✅ Cliente Assumido!',
                `${clientName} foi adicionado à sua lista de clientes.\n\nAgora você pode criar planos nutricionais personalizados na aba "Criar Dieta".`,
                [
                  { text: 'Continuar Assumindo', style: 'default' },
                  {
                    text: 'Ver Meus Clientes',
                    style: 'default',
                    onPress: () => router.push('/professional/nutritionist/(tabs)/index')
                  }
                ]
              );
              
              // Remove client from available list
              setAvailableClients(prev => prev.filter(c => c.id !== clientId));
              
            } catch (error: any) {
              console.error('Error assuming client:', error);
              Alert.alert('Erro', 'Não foi possível assumir o cliente. Tente novamente.');
            } finally {
              setAssumingClient(null);
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
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Carregando clientes disponíveis...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header Info */}
      <View style={styles.headerCard}>
        <View style={styles.headerIcon}>
          <Ionicons name="person-add" size={32} color="#22C55E" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Assumir Novos Clientes</Text>
          <Text style={styles.headerSubtitle}>Clientes Premium/VIP aguardando nutricionista</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#22C55E"
          />
        }
      >
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{availableClients.length}</Text>
            <Text style={styles.statLabel}>Disponíveis</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {availableClients.filter(c => c.plan_type === 'vip').length}
            </Text>
            <Text style={styles.statLabel}>VIP</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {availableClients.filter(c => c.plan_type === 'premium').length}
            </Text>
            <Text style={styles.statLabel}>Premium</Text>
          </View>
        </View>

        {/* Available Clients */}
        {availableClients.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
            <Text style={styles.emptyTitle}>Todos os Clientes Atendidos!</Text>
            <Text style={styles.emptyText}>
              Não há clientes Premium/VIP aguardando atribuição no momento. 
              Novos clientes aparecerão aqui quando se cadastrarem.
            </Text>
          </View>
        ) : (
          <View style={styles.clientsContainer}>
            <Text style={styles.sectionTitle}>Clientes Aguardando Nutricionista</Text>
            
            {availableClients.map((client) => (
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
                      Cadastrado: {new Date(client.registration_date).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="target" size={16} color="#22C55E" />
                    <Text style={styles.detailText}>
                      Objetivos: {client.fitness_goals?.join(', ') || 'Não informado'}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="trending-up" size={16} color="#22C55E" />
                    <Text style={styles.detailText}>
                      Nível: {client.experience_level || 'Iniciante'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.assumeButton,
                    assumingClient === client.id && styles.assumeButtonLoading
                  ]}
                  onPress={() => assumeClient(client.id, client.full_name)}
                  disabled={assumingClient === client.id}
                >
                  {assumingClient === client.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="person-add" size={18} color="#FFFFFF" />
                      <Text style={styles.assumeButtonText}>Assumir Cliente</Text>
                    </>
                  )}
                </TouchableOpacity>
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
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 16,
    padding: 20,
    margin: 24,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  headerIcon: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#22C55E',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 20,
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
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
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
    flex: 1,
  },
  assumeButton: {
    backgroundColor: '#22C55E',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assumeButtonLoading: {
    backgroundColor: '#64748B',
  },
  assumeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});