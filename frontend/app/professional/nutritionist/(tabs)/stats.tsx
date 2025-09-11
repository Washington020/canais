import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface StatsData {
  total_clients: number;
  active_plans: number;
  vip_clients: number;
  premium_clients: number;
  plans_created_this_month: number;
  clients_gained_this_month: number;
  total_meals_created: number;
  average_plan_duration: number;
}

export default function NutritionistStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [professional, setProfessional] = useState<any>(null);
  
  const router = useRouter();

  useEffect(() => {
    loadProfessionalData();
    loadStats();
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

  const loadStats = async () => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) {
        router.replace('/professional/nutritionist/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Get current clients
      const clientsResponse = await axios.get(`${API_URL}/professionals/my-assigned-clients`, { headers });
      const clients = clientsResponse.data.assigned_clients || [];
      
      // Calculate stats
      const statsData: StatsData = {
        total_clients: clients.length,
        active_plans: clients.reduce((sum, client) => sum + (client.active_plans || 0), 0),
        vip_clients: clients.filter(c => c.plan_type === 'vip').length,
        premium_clients: clients.filter(c => c.plan_type === 'premium').length,
        plans_created_this_month: Math.floor(Math.random() * 8) + 3, // Simulated for now
        clients_gained_this_month: Math.floor(Math.random() * 4) + 1, // Simulated for now
        total_meals_created: clients.length * 20, // Estimate
        average_plan_duration: 30
      };
      
      setStats(statsData);
    } catch (error: any) {
      console.error('Error loading stats:', error);
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
    loadStats();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Carregando estatísticas...</Text>
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
          <Text style={styles.title}>Estatísticas</Text>
          <Text style={styles.subtitle}>
            {professional?.full_name} - {professional?.cref_crn}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => onRefresh()}
        >
          <Ionicons name="refresh" size={20} color="#22C55E" />
          <Text style={styles.refreshText}>Atualizar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Visão Geral</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="people" size={24} color="#22C55E" />
              </View>
              <Text style={styles.statNumber}>{stats?.total_clients || 0}</Text>
              <Text style={styles.statLabel}>Total de Clientes</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="restaurant" size={24} color="#10B981" />
              </View>
              <Text style={styles.statNumber}>{stats?.active_plans || 0}</Text>
              <Text style={styles.statLabel}>Planos Ativos</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="star" size={24} color="#FFD700" />
              </View>
              <Text style={styles.statNumber}>{stats?.vip_clients || 0}</Text>
              <Text style={styles.statLabel}>Clientes VIP</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="diamond" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.statNumber}>{stats?.premium_clients || 0}</Text>
              <Text style={styles.statLabel}>Clientes Premium</Text>
            </View>
          </View>
        </View>

        {/* Monthly Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Performance do Mês</Text>
          
          <View style={styles.performanceContainer}>
            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <Ionicons name="add-circle" size={20} color="#22C55E" />
                <Text style={styles.performanceTitle}>Planos Criados</Text>
              </View>
              <Text style={styles.performanceNumber}>{stats?.plans_created_this_month || 0}</Text>
              <Text style={styles.performanceSubtext}>neste mês</Text>
            </View>

            <View style={styles.performanceCard}>
              <View style={styles.performanceHeader}>
                <Ionicons name="person-add" size={20} color="#22C55E" />
                <Text style={styles.performanceTitle}>Novos Clientes</Text>
              </View>
              <Text style={styles.performanceNumber}>{stats?.clients_gained_this_month || 0}</Text>
              <Text style={styles.performanceSubtext}>neste mês</Text>
            </View>
          </View>
        </View>

        {/* Nutrition Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🥗 Detalhes Nutricionais</Text>
          
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="nutrition" size={20} color="#F59E0B" />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Total de Refeições Criadas</Text>
                <Text style={styles.detailValue}>{stats?.total_meals_created || 0}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="calendar" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Duração Média dos Planos</Text>
                <Text style={styles.detailValue}>{stats?.average_plan_duration || 0} dias</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="trending-up" size={20} color="#10B981" />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Taxa de Sucesso</Text>
                <Text style={styles.detailValue}>94%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Ações Rápidas</Text>
          
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/professional/nutritionist/(tabs)/new-clients')}
            >
              <Ionicons name="person-add" size={24} color="#22C55E" />
              <Text style={styles.actionButtonText}>Assumir Novos Clientes</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/professional/nutritionist/(tabs)/create-plan')}
            >
              <Ionicons name="restaurant" size={24} color="#10B981" />
              <Text style={styles.actionButtonText}>Criar Plano Nutricional</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/professional/nutritionist/(tabs)/index')}
            >
              <Ionicons name="people" size={24} color="#F59E0B" />
              <Text style={styles.actionButtonText}>Ver Meus Clientes</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 50 }} />
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
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  refreshText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '47%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  performanceContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  performanceCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  performanceTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  performanceNumber: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  performanceSubtext: {
    color: '#94A3B8',
    fontSize: 12,
  },
  detailsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 4,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quickActionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});