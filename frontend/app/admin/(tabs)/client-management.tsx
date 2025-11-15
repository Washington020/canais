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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface ClientWithProfessionals {
  id: string;
  full_name: string;
  email: string;
  plan_type: string;
  nutritionist_id?: string;
  nutritionist_name?: string;
  personal_id?: string;
  personal_name?: string;
  subscription_end?: string;
}

export default function ClientManagement() {
  const [clients, setClients] = useState<ClientWithProfessionals[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const token = await AsyncStorage.getItem('adminToken');
      if (!token) {
        Alert.alert('Erro', 'Token de autenticação não encontrado');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Buscar todos os usuários premium/vip
      const response = await axios.get(`${API_URL}/admin/users`, { headers });
      
      // Filtrar apenas clientes com planos premium/vip/intermediário
      const premiumClients = response.data.users?.filter((user: any) => 
        ['premium', 'vip', 'intermediario'].includes(user.plan_type)
      ) || [];

      setClients(premiumClients);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
      Alert.alert('Erro', 'Não foi possível carregar os clientes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClients();
  };

  const releaseClient = async (clientId: string, clientName: string, professionalType: 'nutritionist' | 'personal') => {
    const typeName = professionalType === 'nutritionist' ? 'Nutricionista' : 'Personal Trainer';
    
    Alert.alert(
      'Liberar Cliente',
      `Deseja liberar ${clientName} do ${typeName}?\n\nO cliente voltará a estar disponível para outros profissionais.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Liberar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('adminToken');
              const headers = { Authorization: `Bearer ${token}` };
              
              await axios.post(
                `${API_URL}/admin/release-client/${clientId}?professional_type=${professionalType}`,
                {},
                { headers }
              );
              
              Alert.alert('Sucesso!', `Cliente liberado do ${typeName} com sucesso`);
              loadClients();
            } catch (error: any) {
              console.error('Erro ao liberar cliente:', error);
              Alert.alert(
                'Erro',
                error.response?.data?.detail || 'Não foi possível liberar o cliente'
              );
            }
          },
        },
      ]
    );
  };

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchText.toLowerCase()) ||
    client.email.toLowerCase().includes(searchText.toLowerCase())
  );

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'vip': return '#8B5CF6';
      case 'premium': return '#F59E0B';
      case 'intermediario': return '#3B82F6';
      default: return '#64748B';
    }
  };

  const renderClient = (client: ClientWithProfessionals) => (
    <View key={client.id} style={styles.clientCard}>
      <View style={styles.clientHeader}>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{client.full_name}</Text>
          <Text style={styles.clientEmail}>{client.email}</Text>
        </View>
        <View style={[styles.planBadge, { backgroundColor: getPlanColor(client.plan_type) }]}>
          <Text style={styles.planText}>{client.plan_type.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.professionalsSection}>
        {/* Nutricionista */}
        <View style={styles.professionalRow}>
          <View style={styles.professionalInfo}>
            <Ionicons name="nutrition" size={20} color="#22C55E" />
            <View style={styles.professionalText}>
              <Text style={styles.professionalLabel}>Nutricionista:</Text>
              {client.nutritionist_id ? (
                <Text style={styles.professionalName}>{client.nutritionist_name}</Text>
              ) : (
                <Text style={styles.professionalUnassigned}>Não atribuído</Text>
              )}
            </View>
          </View>
          {client.nutritionist_id && (
            <TouchableOpacity
              style={styles.releaseButton}
              onPress={() => releaseClient(client.id, client.full_name, 'nutritionist')}
            >
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.releaseButtonText}>Liberar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Personal Trainer */}
        <View style={styles.professionalRow}>
          <View style={styles.professionalInfo}>
            <Ionicons name="barbell" size={20} color="#3B82F6" />
            <View style={styles.professionalText}>
              <Text style={styles.professionalLabel}>Personal Trainer:</Text>
              {client.personal_id ? (
                <Text style={styles.professionalName}>{client.personal_name}</Text>
              ) : (
                <Text style={styles.professionalUnassigned}>Não atribuído</Text>
              )}
            </View>
          </View>
          {client.personal_id && (
            <TouchableOpacity
              style={styles.releaseButton}
              onPress={() => releaseClient(client.id, client.full_name, 'personal')}
            >
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.releaseButtonText}>Liberar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Carregando clientes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Gerenciar Clientes</Text>
        <Text style={styles.subtitle}>Controle de profissionais atribuídos</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou email..."
          placeholderTextColor="#64748B"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F59E0B"
          />
        }
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{clients.length}</Text>
            <Text style={styles.statLabel}>Total Clientes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {clients.filter(c => c.nutritionist_id).length}
            </Text>
            <Text style={styles.statLabel}>Com Nutricionista</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {clients.filter(c => c.personal_id).length}
            </Text>
            <Text style={styles.statLabel}>Com Personal</Text>
          </View>
        </View>

        {filteredClients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#475569" />
            <Text style={styles.emptyText}>
              {searchText ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </Text>
          </View>
        ) : (
          filteredClients.map(renderClient)
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 16,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 14,
  },
  scrollView: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  clientCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 14,
    color: '#94A3B8',
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 12,
  },
  planText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  professionalsSection: {
    gap: 16,
  },
  professionalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0F172A',
    borderRadius: 12,
  },
  professionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  professionalText: {
    marginLeft: 12,
    flex: 1,
  },
  professionalLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  professionalName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  professionalUnassigned: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
  },
  releaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7F1D1D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  releaseButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
});
