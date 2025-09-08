import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://luxeforma-app.preview.emergentagent.com';

export default function ClientDashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    tokens_available: 0,
    tokens_used: 0,
    gyms_visited: 0
  });
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    try {
      Alert.alert(
        'Sair do App',
        'Deseja realmente sair?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sair',
            style: 'destructive',
            onPress: async () => {
              await AsyncStorage.clear();
              router.replace('/cliente');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  }, [router]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  const generateWorkout = useCallback(() => {
    Alert.alert(
      'Treino Personalizado',
      'Qual tipo de treino você prefere?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cardio', onPress: () => generateSpecificWorkout('cardio') },
        { text: 'Musculação', onPress: () => generateSpecificWorkout('musculacao') },
        { text: 'Funcional', onPress: () => generateSpecificWorkout('funcional') }
      ]
    );
  }, []);

  const generateSpecificWorkout = useCallback((type: string) => {
    const workouts = {
      cardio: [
        '🏃 Corrida na esteira: 20 minutos',
        '🚴 Bike ergométrica: 15 minutos',
        '🏋️ Burpees: 3 séries de 10',
        '🤸 Jumping jacks: 3 séries de 15'
      ],
      musculacao: [
        '💪 Supino reto: 3 séries de 12',
        '🦵 Agachamento: 3 séries de 15',
        '🏋️ Deadlift: 3 séries de 10',
        '💪 Rosca bíceps: 3 séries de 12'
      ],
      funcional: [
        '🤸 Prancha: 3 séries de 30s',
        '🦵 Afundo: 3 séries de 12 cada perna',
        '💪 Flexão: 3 séries de 10',
        '🏋️ Mountain climber: 3 séries de 20'
      ]
    };

    const selectedWorkout = workouts[type as keyof typeof workouts];
    Alert.alert(
      `Treino ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      selectedWorkout.join('\n'),
      [{ text: 'Entendi', style: 'default' }]
    );
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/client/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/users/profile`, { headers });
      setUser(response.data);

      const statsResponse = await axios.get(`${API_URL}/api/users/stats`, { headers });
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header with Navigation */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>LuxePass</Text>
        </View>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color="#FF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Olá, {user?.full_name || 'Cliente'}! 👋</Text>
          <Text style={styles.welcomeSubtitle}>Pronto para treinar hoje?</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="fitness" size={24} color="#8B5CF6" />
            <Text style={styles.statNumber}>{stats.tokens_available}</Text>
            <Text style={styles.statLabel}>Tokens Disponíveis</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
            <Text style={styles.statNumber}>{stats.tokens_used}</Text>
            <Text style={styles.statLabel}>Tokens Usados</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="location" size={24} color="#F59E0B" />
            <Text style={styles.statNumber}>{stats.gyms_visited}</Text>
            <Text style={styles.statLabel}>Academias Visitadas</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.workoutButton]}
            onPress={generateWorkout}
          >
            <Ionicons name="fitness" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Gerar Treino</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.tokensButton]}
            onPress={() => router.push('/client/(tabs)/tokens')}
          >
            <Ionicons name="qr-code" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Meus Tokens</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.gymsButton]}
            onPress={() => router.push('/client/(tabs)/gyms')}
          >
            <Ionicons name="location" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Academias</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutFullButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color="#FFFFFF" />
            <Text style={styles.logoutFullText}>Sair do App</Text>
          </TouchableOpacity>
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
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  welcomeSection: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  workoutButton: {
    backgroundColor: '#8B5CF6',
  },
  tokensButton: {
    backgroundColor: '#22C55E',
  },
  gymsButton: {
    backgroundColor: '#F59E0B',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutSection: {
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoutFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4444',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  logoutFullText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});