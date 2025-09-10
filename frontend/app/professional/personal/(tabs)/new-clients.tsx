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

interface NewClient {
  id: string;
  full_name: string;
  email: string;
  plan: string;
  status: string;
  registration_date: string;
  fitness_goals?: string[];
  experience_level?: string;
}

export default function NewClients() {
  const [newClients, setNewClients] = useState<NewClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flagging, setFlagging] = useState<string | null>(null);
  const router = useRouter();

  const loadNewClients = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) {
        Alert.alert('Erro', 'Token não encontrado', [
          { text: 'OK', onPress: () => router.replace('/professional/personal/login') }
        ]);
        return;
      }

      const response = await axios.get(`${API_URL}/professionals/unassigned-clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Simulate new clients data for personal trainer
      const mockNewClients: NewClient[] = [
        {
          id: '4',
          full_name: 'Pedro Costa Premium',
          email: 'pedro@luxepass.com',
          plan: 'premium',
          status: 'active',
          registration_date: '2025-01-13',
          fitness_goals: ['Perda de peso', 'Ganho muscular', 'Condicionamento'],
          experience_level: 'iniciante'
        },
        {
          id: '5', 
          full_name: 'Julia Santos VIP',
          email: 'julia@luxepass.com',
          plan: 'vip',
          status: 'active',
          registration_date: '2025-01-12',
          fitness_goals: ['Tonificação', 'Flexibilidade', 'Força'],
          experience_level: 'intermediario'
        },
        {
          id: '6',
          full_name: 'Roberto Silva Premium',
          email: 'roberto@luxepass.com',
          plan: 'premium',
          status: 'active',
          registration_date: '2025-01-11',
          fitness_goals: ['Hipertrofia', 'Definição'],
          experience_level: 'avancado'
        }
      ];

      setNewClients(mockNewClients);
    } catch (error: any) {
      console.error('Error loading new clients:', error);
      if (error.response?.status === 401) {
        Alert.alert('Erro', 'Sessão expirada', [
          { text: 'OK', onPress: () => router.replace('/professional/personal/login') }
        ]);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar os novos clientes');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNewClients();
  }, [loadNewClients]);

  useEffect(() => {
    loadNewClients();
  }, [loadNewClients]);

  const handleFlagClient = async (client: NewClient) => {
    setFlagging(client.id);
    
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) {
        Alert.alert('Erro', 'Token não encontrado');
        return;
      }

      // API call to flag client
      await axios.post(`${API_URL}/professionals/flag-client`, {
        client_id: client.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert(
        '✅ Cliente Designado!',
        `${client.full_name} foi designado(a) para você como personal trainer.`,
        [
          {
            text: 'Ver Clientes',
            onPress: () => router.push('/professional/personal/(tabs)/index')
          },
          { text: 'OK' }
        ]
      );

      // Remove from new clients list
      setNewClients(prev => prev.filter(c => c.id !== client.id));
    } catch (error: any) {
      console.error('Error flagging client:', error);
      Alert.alert('Erro', 'Não foi possível designar o cliente. Tente novamente.');
    } finally {
      setFlagging(null);
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'vip': return '#8B5CF6';
      case 'premium': return '#F59E0B';
      default: return '#64748B';
    }
  };

  const getExperienceColor = (level: string) => {
    switch (level) {
      case 'iniciante': return '#22C55E';
      case 'intermediario': return '#F59E0B';
      case 'avancado': return '#EF4444';
      default: return '#64748B';
    }
  };

  const getExperienceText = (level: string) => {
    switch (level) {
      case 'iniciante': return 'Iniciante';
      case 'intermediario': return 'Intermediário';
      case 'avancado': return 'Avançado';
      default: return 'N/A';
    }
  };

  const renderNewClient = ({ item }: { item: NewClient }) => (
    <View style={styles.clientCard}>
      <View style={styles.clientHeader}>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{item.full_name}</Text>
          <Text style={styles.clientEmail}>{item.email}</Text>
          <Text style={styles.registrationDate}>
            Registrado em {new Date(item.registration_date).toLocaleDateString('pt-BR')}
          </Text>
        </View>
        <View style={[styles.planBadge, { backgroundColor: getPlanColor(item.plan) }]}>
          <Text style={styles.planText}>{item.plan.toUpperCase()}</Text>
        </View>
      </View>
      
      {item.experience_level && (
        <View style={styles.experienceRow}>
          <Ionicons name="barbell" size={16} color={getExperienceColor(item.experience_level)} />
          <Text style={[styles.experienceText, { color: getExperienceColor(item.experience_level) }]}>
            Nível: {getExperienceText(item.experience_level)}
          </Text>
        </View>
      )}
      
      {item.fitness_goals && item.fitness_goals.length > 0 && (
        <View style={styles.goalsContainer}>
          <Text style={styles.goalsTitle}>🎯 Objetivos:</Text>
          <View style={styles.goalsList}>
            {item.fitness_goals.map((goal, index) => (
              <View key={index} style={styles.goalTag}>
                <Text style={styles.goalText}>{goal}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      <TouchableOpacity
        style={[
          styles.flagButton,
          flagging === item.id && styles.flagButtonLoading
        ]}
        onPress={() => handleFlagClient(item)}
        disabled={flagging === item.id}
      >
        {flagging === item.id ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="person-add" size={20} color="#FFFFFF" />
            <Text style={styles.flagButtonText}>Designar para Mim</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Carregando novos clientes...</Text>
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
          <Text style={styles.headerTitle}>Novos Clientes</Text>
          <Text style={styles.headerSubtitle}>
            Clientes Premium e VIP aguardando designação • {newClients.length} disponíveis
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="person-add" size={24} color="#F59E0B" />
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color="#F59E0B" />
        <Text style={styles.infoText}>
          💪 Clique em "Designar para Mim" para acompanhar um novo cliente como personal trainer
        </Text>
      </View>

      {/* New Clients List */}
      <View style={styles.content}>
        {newClients.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
            <Text style={styles.emptyTitle}>Todos os clientes designados!</Text>
            <Text style={styles.emptySubtitle}>
              Novos clientes Premium e VIP aparecerão aqui quando se cadastrarem
            </Text>
          </View>
        ) : (
          <FlatList
            data={newClients}
            keyExtractor={(item) => item.id}
            renderItem={renderNewClient}
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  infoText: {
    color: '#E2E8F0',
    fontSize: 12,
    marginLeft: 12,
    flex: 1,
    lineHeight: 16,
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
    marginBottom: 12,
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
    marginBottom: 2,
  },
  registrationDate: {
    color: '#64748B',
    fontSize: 12,
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
  experienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  experienceText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  goalsContainer: {
    marginBottom: 16,
  },
  goalsTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  goalsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  goalTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  goalText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '600',
  },
  flagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  flagButtonLoading: {
    backgroundColor: '#64748B',
  },
  flagButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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