import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export default function ClientDashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    tokens_available: 50,
    tokens_used: 5,
    gyms_visited: 3
  });
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [currentWorkout, setCurrentWorkout] = useState<any>(null);
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
    const workoutTemplates = {
      cardio: {
        name: 'Treino Cardio Intenso',
        duration: '30-45 minutos',
        exercises: [
          { name: 'Aquecimento na esteira', sets: '1x', reps: '5 min', rest: '30s' },
          { name: 'Corrida intervalada', sets: '5x', reps: '2 min', rest: '1 min' },
          { name: 'Bike ergométrica', sets: '1x', reps: '10 min', rest: '2 min' },
          { name: 'Burpees', sets: '3x', reps: '10 rep', rest: '45s' },
          { name: 'Jumping jacks', sets: '3x', reps: '15 rep', rest: '30s' },
          { name: 'Mountain climber', sets: '3x', reps: '20 rep', rest: '45s' },
          { name: 'Alongamento', sets: '1x', reps: '5 min', rest: '-' }
        ]
      },
      musculacao: {
        name: 'Treino de Musculação',
        duration: '45-60 minutos',
        exercises: [
          { name: 'Aquecimento articular', sets: '1x', reps: '5 min', rest: '30s' },
          { name: 'Supino reto', sets: '3x', reps: '12 rep', rest: '90s' },
          { name: 'Agachamento livre', sets: '3x', reps: '15 rep', rest: '2 min' },
          { name: 'Deadlift', sets: '3x', reps: '10 rep', rest: '2 min' },
          { name: 'Rosca bíceps', sets: '3x', reps: '12 rep', rest: '60s' },
          { name: 'Tríceps pulley', sets: '3x', reps: '12 rep', rest: '60s' },
          { name: 'Desenvolvimento', sets: '3x', reps: '10 rep', rest: '90s' },
          { name: 'Prancha abdominal', sets: '3x', reps: '30s', rest: '45s' }
        ]
      },
      funcional: {
        name: 'Treino Funcional',
        duration: '35-50 minutos',
        exercises: [
          { name: 'Mobilidade articular', sets: '1x', reps: '5 min', rest: '30s' },
          { name: 'Agachamento com salto', sets: '3x', reps: '12 rep', rest: '60s' },
          { name: 'Prancha dinâmica', sets: '3x', reps: '30s', rest: '45s' },
          { name: 'Afundo alternado', sets: '3x', reps: '12 rep', rest: '60s' },
          { name: 'Flexão de braço', sets: '3x', reps: '10 rep', rest: '60s' },
          { name: 'Kettlebell swing', sets: '3x', reps: '15 rep', rest: '90s' },
          { name: 'Box jump', sets: '3x', reps: '8 rep', rest: '90s' },
          { name: 'Relaxamento', sets: '1x', reps: '5 min', rest: '-' }
        ]
      }
    };

    const workout = workoutTemplates[type as keyof typeof workoutTemplates];
    setCurrentWorkout(workout);
    setShowWorkoutModal(true);
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        // Se não tem token, usar dados demo
        setUser({ full_name: 'Cliente Demo' });
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      try {
        const response = await axios.get(`${API_URL}/api/users/profile`, { headers });
        setUser(response.data);

        const statsResponse = await axios.get(`${API_URL}/api/users/stats`, { headers });
        setStats(statsResponse.data);
      } catch (apiError) {
        // Se API falha, usar dados demo
        console.log('Usando dados demo');
        setUser({ full_name: 'Cliente Demo' });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setUser({ full_name: 'Cliente Demo' });
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
          <Text style={styles.headerTitle}>LuxePass Cliente</Text>
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
            <Text style={styles.actionButtonText}>Gerar Treino Personalizado</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.tokensButton]}
            onPress={() => router.push('/client/(tabs)/tokens')}
          >
            <Ionicons name="qr-code" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Gerar Tokens</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.gymsButton]}
            onPress={() => router.push('/client/(tabs)/gyms')}
          >
            <Ionicons name="location" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Academias Parceiras</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Workout Modal */}
      <Modal
        visible={showWorkoutModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWorkoutModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🏋️ {currentWorkout?.name}</Text>
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowWorkoutModal(false)}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutDuration}>⏱️ Duração: {currentWorkout?.duration}</Text>
            </View>

            {currentWorkout?.exercises.map((exercise: any, index: number) => (
              <View key={index} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseNumber}>{index + 1}</Text>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                </View>
                <View style={styles.exerciseDetails}>
                  <Text style={styles.exerciseDetail}>Séries: {exercise.sets}</Text>
                  <Text style={styles.exerciseDetail}>Repetições: {exercise.reps}</Text>
                  <Text style={styles.exerciseDetail}>Descanso: {exercise.rest}</Text>
                </View>
              </View>
            ))}

            <View style={styles.workoutTips}>
              <Text style={styles.tipsTitle}>💡 Dicas Importantes:</Text>
              <Text style={styles.tipsText}>
                • Mantenha sempre boa hidratação{'\n'}
                • Respeite os tempos de descanso{'\n'}
                • Ajuste a carga conforme sua capacidade{'\n'}
                • Pare se sentir dor ou desconforto{'\n'}
                • Consulte um profissional se necessário
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#0B0D17',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeModalButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  workoutInfo: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  workoutDuration: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  exerciseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseNumber: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: 'bold',
    width: 30,
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  exerciseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 30,
  },
  exerciseDetail: {
    color: '#94A3B8',
    fontSize: 12,
  },
  workoutTips: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 24,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  tipsTitle: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipsText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
  },
});