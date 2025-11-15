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

interface PendingAppointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_plan: string;
  appointment_date: string;
  appointment_time: string;
  professional_type: string;
  notes: string;
  created_at: string;
}

export default function NewClients() {
  const [availableClients, setAvailableClients] = useState<AvailableClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
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
      const response = await axios.get(`${API_URL}/professionals/available-clients`, { headers });
      
      setAvailableClients(response.data.available_clients || []);
    } catch (error: any) {
      console.error('Error loading available clients:', error);
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
    loadAvailableClients();
  };

  const claimClient = async (clientId: string, clientName: string) => {
    Alert.alert(
      'Assumir Cliente',
      `Deseja assumir ${clientName} como sua cliente?\n\nVocê será responsável pela criação e acompanhamento dos planos de suplementação.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Assumir',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('professionalToken');
              const headers = { Authorization: `Bearer ${token}` };
              
              const response = await axios.post(
                `${API_URL}/professionals/claim-client/${clientId}`,
                {},
                { headers }
              );
              
              Alert.alert('Sucesso!', response.data.message);
              
              // Remove client from available list
              setAvailableClients(prev => prev.filter(client => client.id !== clientId));
            } catch (error: any) {
              console.error('Error claiming client:', error);
              if (error.response?.data?.detail) {
                Alert.alert('Erro', error.response.data.detail);
              } else {
                Alert.alert('Erro', 'Não foi possível assumir o cliente');
              }
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
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Novos Clientes</Text>
        <Text style={styles.subtitle}>Clientes Premium/VIP sem nutricionista</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#22C55E" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Como funciona?</Text>
            <Text style={styles.infoDescription}>
              • Apenas clientes Premium e VIP aparecem aqui{'\n'}
              • Clique em "Assumir" para se tornar a nutricionista do cliente{'\n'}
              • Você poderá criar planos de suplementação personalizados{'\n'}
              • O cliente verá seu nome e CRN nos planos criados
            </Text>
          </View>
        </View>

        {/* Available Clients */}
        {availableClients.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#22C55E" />
            <Text style={styles.emptyTitle}>Todos os clientes têm nutricionista!</Text>
            <Text style={styles.emptyText}>
              No momento não há clientes Premium ou VIP disponíveis para assumir.
              Novos clientes aparecerão aqui automaticamente.
            </Text>
          </View>
        ) : (
          <View style={styles.clientsContainer}>
            <Text style={styles.sectionTitle}>
              {availableClients.length} cliente{availableClients.length > 1 ? 's' : ''} disponível{availableClients.length > 1 ? 'eis' : ''}
            </Text>
            
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
                  
                  <View style={styles.clientBadgeContainer}>
                    <View style={[
                      styles.planBadge,
                      { backgroundColor: client.plan_type === 'vip' ? '#FFD700' : '#8B5CF6' }
                    ]}>
                      <Text style={styles.planBadgeText}>
                        {client.plan_type.toUpperCase()}
                      </Text>
                    </View>
                    
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NOVO</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.clientDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar" size={16} color="#94A3B8" />
                    <Text style={styles.detailText}>
                      Cadastrou-se: {new Date(client.created_at).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="ticket" size={16} color="#94A3B8" />
                    <Text style={styles.detailText}>
                      Tokens disponíveis: {client.tokens_available}
                    </Text>
                  </View>
                  
                  {client.subscription_end && (
                    <View style={styles.detailRow}>
                      <Ionicons name="time" size={16} color="#94A3B8" />
                      <Text style={styles.detailText}>
                        Assinatura até: {new Date(client.subscription_end).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity 
                  style={styles.claimButton}
                  onPress={() => claimClient(client.id, client.full_name)}
                >
                  <Ionicons name="person-add" size={16} color="#FFFFFF" />
                  <Text style={styles.claimButtonText}>Assumir Cliente</Text>
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
  header: {
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
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 12,
    padding: 16,
    margin: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoDescription: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
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
    textAlign: 'center',
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
    color: '#22C55E',
    fontSize: 16,
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
  clientBadgeContainer: {
    alignItems: 'flex-end',
    gap: 4,
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
  newBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
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
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    borderRadius: 8,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});