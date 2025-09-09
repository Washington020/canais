import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface WorkoutPlan {
  id: string;
  workout_name: string;
  exercises: any[];
  start_date: string;
  end_date?: string;
  created_at: string;
}

interface AppointmentSlot {
  id: string;
  date: string;
  professional_type: string;
}

export default function Workouts() {
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userPlan, setUserPlan] = useState('basic');
  
  const router = useRouter();

  useEffect(() => {
    loadWorkoutPlan();
    loadAvailableSlots();
  }, []);

  const loadWorkoutPlan = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/client/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Get user profile to check plan
      const profileResponse = await axios.get(`${API_URL}/users/profile`, { headers });
      const currentPlan = profileResponse.data.plan || 'basic';
      setUserPlan(currentPlan);

      // Get workout plan
      const response = await axios.get(`${API_URL}/workouts/user/plan`, { headers });
      
      if (response.data.plan) {
        setWorkoutPlan(response.data.plan);
      } else if (response.data.upgrade_required) {
        // User has basic plan, no access to workouts
        setWorkoutPlan(null);
      }
      
    } catch (error: any) {
      console.error('Error loading workout plan:', error);
      if (error.response?.status === 401) {
        router.replace('/client/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAvailableSlots = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/appointments/available-slots?professional_type=personal`, { headers });
      
      setAvailableSlots(response.data.slots || []);
    } catch (error: any) {
      console.error('Error loading slots:', error);
      // Don't show error for basic plan users
      if (error.response?.status !== 403) {
        console.error('Unexpected error:', error);
      }
    }
  };

  const schedulePersonalTraining = async (slotId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const slot = availableSlots.find(s => s.id === slotId);
      if (!slot) return;

      const appointmentData = {
        appointment_type: 'personal',
        appointment_date: slot.date,
        notes: 'Consulta com personal trainer agendada via app'
      };

      await axios.post(`${API_URL}/appointments/request`, appointmentData, { headers });
      
      Alert.alert(
        '💪 Personal Training Agendado!', 
        `Sua sessão com o personal trainer foi agendada para ${new Date(slot.date).toLocaleDateString('pt-BR')} às ${new Date(slot.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
      );
      
      // Reload slots
      loadAvailableSlots();
    } catch (error: any) {
      console.error('Error scheduling appointment:', error);
      if (error.response?.status === 400) {
        Alert.alert('Erro', error.response.data.detail);
      } else {
        Alert.alert('Erro', 'Não foi possível agendar a sessão');
      }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkoutPlan();
    loadAvailableSlots();
  };

  const startWorkout = () => {
    if (!workoutPlan) return;
    
    Alert.alert(
      '🏋️ Iniciar Treino',
      `Você está pronto para iniciar "${workoutPlan.workout_name}"?\n\n${workoutPlan.exercises.length} exercícios programados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar',
          onPress: () => {
            Alert.alert('💪 Treino Iniciado!', 'Bom treino! Mantenha o foco e a forma correta.');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando plano de treino...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Treinos</Text>
        <Text style={styles.subtitle}>Seu plano de treino personalizado</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Current Workout Plan */}
        <View style={styles.workoutPlanContainer}>
          <Text style={styles.sectionTitle}>🏋️ Plano de Treino Atual</Text>
          
          {!workoutPlan && userPlan === 'basic' ? (
            <View style={styles.upgradeCard}>
              <Ionicons name="fitness-outline" size={48} color="#64748B" />
              <Text style={styles.upgradeTitle}>Treinos Personalizados</Text>
              <Text style={styles.upgradeText}>
                Treinos personalizados estão disponíveis apenas para usuários Premium e VIP. 
                Faça upgrade para ter acesso a planos criados pelo nosso personal trainer.
              </Text>
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={() => router.push('/client/(tabs)/financial')}
              >
                <Ionicons name="arrow-up-circle" size={16} color="#FFFFFF" />
                <Text style={styles.upgradeButtonText}>Upgrade para Premium/VIP</Text>
              </TouchableOpacity>
            </View>
          ) : !workoutPlan ? (
            <View style={styles.noWorkoutCard}>
              <Ionicons name="barbell-outline" size={48} color="#64748B" />
              <Text style={styles.noWorkoutTitle}>Nenhum Treino Ativo</Text>
              <Text style={styles.noWorkoutText}>
                Você ainda não possui um plano de treino personalizado. Agende uma sessão com nosso personal trainer.
              </Text>
            </View>
          ) : (
            <View style={styles.workoutPlanCard}>
              <View style={styles.workoutPlanHeader}>
                <View style={styles.workoutPlanInfo}>
                  <Text style={styles.workoutPlanName}>{workoutPlan.workout_name}</Text>
                  <Text style={styles.workoutPlanMeta}>
                    {workoutPlan.exercises.length} exercícios • Criado em {new Date(workoutPlan.created_at).toLocaleDateString('pt-BR')}
                  </Text>
                  {workoutPlan.end_date && (
                    <Text style={styles.workoutPlanDuration}>
                      Válido até: {new Date(workoutPlan.end_date).toLocaleDateString('pt-BR')}
                    </Text>
                  )}
                </View>
                <TouchableOpacity style={styles.favoriteButton}>
                  <Ionicons name="heart" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {/* Exercises List */}
              <View style={styles.exercisesList}>
                <Text style={styles.exercisesTitle}>Exercícios:</Text>
                {workoutPlan.exercises.slice(0, 5).map((exercise, index) => (
                  <View key={index} style={styles.exerciseItem}>
                    <Text style={styles.exerciseName}>
                      {index + 1}. {exercise.name || `Exercício ${index + 1}`}
                    </Text>
                    <Text style={styles.exerciseDetails}>
                      {exercise.sets || 3} séries x {exercise.reps || 10} repetições
                      {exercise.weight && ` • ${exercise.weight}kg`}
                    </Text>
                  </View>
                ))}
                {workoutPlan.exercises.length > 5 && (
                  <Text style={styles.moreExercises}>
                    +{workoutPlan.exercises.length - 5} exercícios adicionais
                  </Text>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.workoutActions}>
                <TouchableOpacity 
                  style={styles.startWorkoutButton}
                  onPress={startWorkout}
                >
                  <Ionicons name="play" size={16} color="#FFFFFF" />
                  <Text style={styles.startWorkoutText}>Iniciar Treino</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.detailsButton}>
                  <Ionicons name="eye" size={16} color="#8B5CF6" />
                  <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Personal Trainer Section */}
        <View style={styles.personalTrainerContainer}>
          <Text style={styles.sectionTitle}>👨‍💼 Personal Trainer</Text>
          
          <View style={styles.personalTrainerCard}>
            <View style={styles.trainerHeader}>
              <View style={styles.trainerAvatar}>
                <Text style={styles.trainerAvatarText}>PT</Text>
              </View>
              <View style={styles.trainerInfo}>
                <Text style={styles.trainerName}>Prof. Carlos Silva</Text>
                <Text style={styles.trainerTitle}>Personal Trainer - CREF 12345-G/SP</Text>
              </View>
            </View>
            
            <View style={styles.trainerMessage}>
              <Text style={styles.messageText}>
                "Para ter um treino personalizado e eficiente, é importante avaliar suas condições físicas e objetivos. 
                Agende uma sessão para criarmos seu plano ideal!"
              </Text>
            </View>
            
            {userPlan === 'basic' ? (
              <View style={styles.upgradeSection}>
                <Text style={styles.upgradeText}>
                  Personal training disponível para planos Premium e VIP
                </Text>
                <TouchableOpacity 
                  style={styles.upgradeButton}
                  onPress={() => router.push('/client/(tabs)/financial')}
                >
                  <Ionicons name="arrow-up-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.upgradeButtonText}>Fazer Upgrade</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.appointmentSection}>
                <Text style={styles.appointmentTitle}>Agendar Sessão</Text>
                
                {availableSlots.length === 0 ? (
                  <Text style={styles.noSlotsText}>
                    Nenhum horário disponível no momento. Tente novamente mais tarde.
                  </Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slotsScroll}>
                    {availableSlots.slice(0, 5).map((slot) => (
                      <TouchableOpacity 
                        key={slot.id}
                        style={styles.slotCard}
                        onPress={() => schedulePersonalTraining(slot.id)}
                      >
                        <Text style={styles.slotDate}>
                          {new Date(slot.date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short'
                          })}
                        </Text>
                        <Text style={styles.slotTime}>
                          {new Date(slot.date).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                
                <TouchableOpacity style={styles.messageTrainerButton}>
                  <Ionicons name="chatbubble" size={16} color="#8B5CF6" />
                  <Text style={styles.messageTrainerText}>Enviar Mensagem</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Workout Stats */}
        {workoutPlan && (
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>📊 Estatísticas</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{workoutPlan.exercises.length}</Text>
                <Text style={styles.statLabel}>Exercícios</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Concluídos</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>~45</Text>
                <Text style={styles.statLabel}>Min Médio</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>0%</Text>
                <Text style={styles.statLabel}>Progresso</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.sectionTitle}>💡 Dicas de Treino</Text>
          <View style={styles.tipsCard}>
            <View style={styles.tip}>
              <Ionicons name="water" size={20} color="#3B82F6" />
              <Text style={styles.tipText}>Mantenha-se hidratado durante todo o treino</Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="time" size={20} color="#8B5CF6" />
              <Text style={styles.tipText}>Respeite o intervalo entre séries (30-90s)</Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="body" size={20} color="#22C55E" />
              <Text style={styles.tipText}>Foque na execução correta dos movimentos</Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="calendar" size={20} color="#F59E0B" />
              <Text style={styles.tipText}>Mantenha consistência na frequência semanal</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#E2E8F0',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  scrollView: {
    flex: 1,
  },
  workoutPlanContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  upgradeCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  upgradeText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  upgradeButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  noWorkoutCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  noWorkoutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noWorkoutText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  workoutPlanCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  workoutPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  workoutPlanInfo: {
    flex: 1,
  },
  workoutPlanName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  workoutPlanMeta: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  workoutPlanDuration: {
    fontSize: 12,
    color: '#F59E0B',
  },
  favoriteButton: {
    padding: 8,
  },
  exercisesList: {
    marginBottom: 20,
  },
  exercisesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  exerciseItem: {
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E2E8F0',
    marginBottom: 2,
  },
  exerciseDetails: {
    fontSize: 12,
    color: '#94A3B8',
  },
  moreExercises: {
    fontSize: 12,
    color: '#8B5CF6',
    fontStyle: 'italic',
    marginTop: 4,
  },
  workoutActions: {
    flexDirection: 'row',
    gap: 12,
  },
  startWorkoutButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startWorkoutText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailsButtonText: {
    color: '#8B5CF6',
    fontWeight: '600',
    fontSize: 14,
  },
  personalTrainerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  personalTrainerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  trainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trainerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trainerAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  trainerTitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  trainerMessage: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  upgradeSection: {
    alignItems: 'center',
  },
  appointmentSection: {
    gap: 16,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noSlotsText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    padding: 20,
  },
  slotsScroll: {
    marginBottom: 16,
  },
  slotCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  slotDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  slotTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messageTrainerButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  messageTrainerText: {
    color: '#8B5CF6',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  tipsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tipsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 16,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
  },
});