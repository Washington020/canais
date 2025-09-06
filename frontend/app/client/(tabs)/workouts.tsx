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

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Workout {
  id: string;
  name: string;
  difficulty: string;
  duration_minutes: number;
  exercises: any[];
  target_muscle_groups: string[];
  completed?: boolean;
  scheduled_date?: string;
}

export default function Workouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [userWorkouts, setUserWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      
      const [workoutsResponse, userWorkoutsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/workouts`, { headers }),
        axios.get(`${API_URL}/api/workouts/user`, { headers })
      ]);

      // If no workouts from API, create mock data
      if (workoutsResponse.data.length === 0) {
        const mockWorkouts = [
          {
            id: '1',
            name: 'Treino de Peito',
            difficulty: 'intermediate',
            duration_minutes: 45,
            exercises: [
              { name: 'Supino Reto', sets: 4, reps: 10 },
              { name: 'Supino Inclinado', sets: 3, reps: 12 },
              { name: 'Crucifixo', sets: 3, reps: 15 },
              { name: 'Flexão', sets: 3, reps: 15 }
            ],
            target_muscle_groups: ['Peito', 'Tríceps'],
            completed: true,
            scheduled_date: '2025-01-20'
          },
          {
            id: '2',
            name: 'Treino de Costas',
            difficulty: 'advanced',
            duration_minutes: 50,
            exercises: [
              { name: 'Puxada Frente', sets: 4, reps: 10 },
              { name: 'Remada Baixa', sets: 4, reps: 12 },
              { name: 'Barra Fixa', sets: 3, reps: 8 },
              { name: 'Remada Unilateral', sets: 3, reps: 12 }
            ],
            target_muscle_groups: ['Costas', 'Bíceps'],
            completed: false,
            scheduled_date: '2025-01-21'
          },
          {
            id: '3',
            name: 'Treino de Pernas',
            difficulty: 'intermediate',
            duration_minutes: 60,
            exercises: [
              { name: 'Agachamento', sets: 4, reps: 12 },
              { name: 'Leg Press', sets: 4, reps: 15 },
              { name: 'Extensão de Pernas', sets: 3, reps: 15 },
              { name: 'Mesa Flexora', sets: 3, reps: 12 }
            ],
            target_muscle_groups: ['Quadríceps', 'Glúteos', 'Panturrilha'],
            completed: true,
            scheduled_date: '2025-01-19'
          },
          {
            id: '4',
            name: 'Treino de Ombros',
            difficulty: 'beginner',
            duration_minutes: 40,
            exercises: [
              { name: 'Desenvolvimento', sets: 4, reps: 10 },
              { name: 'Elevação Lateral', sets: 3, reps: 12 },
              { name: 'Elevação Frontal', sets: 3, reps: 12 },
              { name: 'Encolhimento', sets: 3, reps: 15 }
            ],
            target_muscle_groups: ['Ombros', 'Trapézio'],
            completed: false,
            scheduled_date: '2025-01-22'
          }
        ];
        setWorkouts(mockWorkouts);
        setUserWorkouts(mockWorkouts);
      } else {
        setWorkouts(workoutsResponse.data);
        setUserWorkouts(userWorkoutsResponse.data);
      }
    } catch (error) {
      console.error('Error loading workouts:', error);
      Alert.alert('Erro', 'Erro ao carregar treinos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkouts();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#22C55E';
      case 'intermediate': return '#F59E0B';
      case 'advanced': return '#EF4444';
      default: return '#94A3B8';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'Iniciante';
      case 'intermediate': return 'Intermediário';
      case 'advanced': return 'Avançado';
      default: return 'Desconhecido';
    }
  };

  const markWorkoutAsCompleted = async (workoutId: string) => {
    try {
      // Update local state
      setUserWorkouts(prev => 
        prev.map(workout => 
          workout.id === workoutId 
            ? { ...workout, completed: true }
            : workout
        )
      );
      
      Alert.alert('Parabéns!', 'Treino marcado como concluído!');
    } catch (error) {
      console.error('Error completing workout:', error);
      Alert.alert('Erro', 'Erro ao marcar treino como concluído');
    }
  };

  const startWorkout = (workout: Workout) => {
    Alert.alert(
      'Iniciar Treino',
      `Você está pronto para iniciar o ${workout.name}?\nDuração estimada: ${workout.duration_minutes} min`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar',
          onPress: () => {
            Alert.alert('Treino Iniciado!', 'Bom treino! Lembre-se de manter a forma correta.');
          }
        }
      ]
    );
  };

  const filteredWorkouts = userWorkouts.filter(workout => {
    switch (filter) {
      case 'completed':
        return workout.completed;
      case 'pending':
        return !workout.completed;
      case 'favorites':
        // Mock favorites logic
        return ['1', '3'].includes(workout.id);
      default:
        return true;
    }
  });

  // Weekly schedule mock data
  const weeklySchedule = [
    { day: 'S', name: 'Peito', completed: true, isToday: false },
    { day: 'T', name: 'Costas', completed: true, isToday: false },
    { day: 'Q', name: 'Pernas', completed: true, isToday: false },
    { day: 'Q', name: 'Ombros', completed: false, isToday: true },
    { day: 'S', name: 'Braços', completed: false, isToday: false },
    { day: 'S', name: 'Cardio', completed: false, isToday: false },
    { day: 'D', name: 'Descanso', completed: false, isToday: false }
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando treinos...</Text>
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
        <Text style={styles.subtitle}>Seu plano de exercícios personalizado</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Weekly Schedule */}
        <View style={styles.scheduleContainer}>
          <Text style={styles.sectionTitle}>Cronograma Semanal</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.scheduleRow}>
              {weeklySchedule.map((day, index) => (
                <View key={index} style={[
                  styles.scheduleDay,
                  day.completed && styles.scheduleDayCompleted,
                  day.isToday && styles.scheduleDayToday
                ]}>
                  <Text style={[
                    styles.scheduleDayText,
                    day.completed && styles.scheduleDayTextCompleted,
                    day.isToday && styles.scheduleDayTextToday
                  ]}>
                    {day.day}
                  </Text>
                  <Text style={[
                    styles.scheduleWorkoutText,
                    day.completed && styles.scheduleWorkoutTextCompleted,
                    day.isToday && styles.scheduleWorkoutTextToday
                  ]}>
                    {day.name}
                  </Text>
                  {day.completed && (
                    <View style={styles.checkmarkContainer}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>5</Text>
            <Text style={styles.statLabel}>Treinos Ativos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>28</Text>
            <Text style={styles.statLabel}>Concluídos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>52</Text>
            <Text style={styles.statLabel}>Min Médio</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>92%</Text>
            <Text style={styles.statLabel}>Taxa Conclusão</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                Todos ({userWorkouts.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
              onPress={() => setFilter('pending')}
            >
              <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
                Pendentes ({userWorkouts.filter(w => !w.completed).length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
              onPress={() => setFilter('completed')}
            >
              <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
                Concluídos ({userWorkouts.filter(w => w.completed).length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'favorites' && styles.filterButtonActive]}
              onPress={() => setFilter('favorites')}
            >
              <Text style={[styles.filterText, filter === 'favorites' && styles.filterTextActive]}>
                Favoritos (2)
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Workouts List */}
        <View style={styles.workoutsContainer}>
          {filteredWorkouts.map((workout) => (
            <View key={workout.id} style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutName}>{workout.name}</Text>
                  <View style={styles.workoutMeta}>
                    <View style={[
                      styles.difficultyBadge,
                      { backgroundColor: `${getDifficultyColor(workout.difficulty)}20` }
                    ]}>
                      <Text style={[
                        styles.difficultyText,
                        { color: getDifficultyColor(workout.difficulty) }
                      ]}>
                        {getDifficultyText(workout.difficulty)}
                      </Text>
                    </View>
                    <Text style={styles.durationText}>{workout.duration_minutes} min</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.favoriteButton}>
                  <Ionicons 
                    name={['1', '3'].includes(workout.id) ? 'heart' : 'heart-outline'} 
                    size={20} 
                    color={['1', '3'].includes(workout.id) ? '#EF4444' : '#94A3B8'} 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.workoutDetails}>
                <Text style={styles.exercisesCount}>
                  {workout.exercises.length} exercícios
                </Text>
                <Text style={styles.targetMuscles}>
                  {workout.target_muscle_groups.join(', ')}
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[
                    styles.progressFill,
                    { 
                      width: workout.completed ? '100%' : '0%',
                      backgroundColor: workout.completed ? '#22C55E' : '#8B5CF6'
                    }
                  ]} />
                </View>
                <Text style={styles.progressText}>
                  {workout.completed ? 'Concluído' : 'Não iniciado'}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.workoutActions}>
                {!workout.completed ? (
                  <>
                    <TouchableOpacity 
                      style={styles.startButton}
                      onPress={() => startWorkout(workout)}
                    >
                      <Ionicons name="play" size={16} color="#FFFFFF" />
                      <Text style={styles.startButtonText}>Iniciar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.detailsButton}>
                      <Ionicons name="eye" size={16} color="#8B5CF6" />
                      <Text style={styles.detailsButtonText}>Detalhes</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.completedButton} disabled>
                    <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                    <Text style={styles.completedButtonText}>Concluído</Text>
                  </TouchableOpacity>
                )}
              </View>

              {workout.completed && (
                <View style={styles.completedInfo}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={styles.completedText}>
                    Treino concluído em {new Date(workout.scheduled_date || '').toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Create New Workout Button */}
        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Criar Novo Treino</Text>
        </TouchableOpacity>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.sectionTitle}>Dicas de Treino</Text>
          <View style={styles.tipsCard}>
            <View style={styles.tip}>
              <Ionicons name="water" size={20} color="#3B82F6" />
              <Text style={styles.tipText}>Mantenha-se hidratado durante o treino</Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="time" size={20} color="#8B5CF6" />
              <Text style={styles.tipText}>Respeite o tempo de descanso entre séries</Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="body" size={20} color="#22C55E" />
              <Text style={styles.tipText}>Foque na execução correta dos movimentos</Text>
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
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scheduleContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scheduleDay: {
    width: 70,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scheduleDayCompleted: {
    backgroundColor: '#22C55E',
  },
  scheduleDayToday: {
    backgroundColor: '#8B5CF6',
    borderWidth: 2,
    borderColor: '#A855F7',
  },
  scheduleDayText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scheduleDayTextCompleted: {
    color: '#FFFFFF',
  },
  scheduleDayTextToday: {
    color: '#FFFFFF',
  },
  scheduleWorkoutText: {
    color: '#94A3B8',
    fontSize: 10,
    textAlign: 'center',
  },
  scheduleWorkoutTextCompleted: {
    color: '#FFFFFF',
  },
  scheduleWorkoutTextToday: {
    color: '#FFFFFF',
  },
  checkmarkContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 10,
    textAlign: 'center',
  },
  filtersContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  filterText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  workoutsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  workoutCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600',
  },
  durationText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  favoriteButton: {
    padding: 4,
  },
  workoutDetails: {
    marginBottom: 12,
  },
  exercisesCount: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 4,
  },
  targetMuscles: {
    color: '#A1A1AA',
    fontSize: 12,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  workoutActions: {
    flexDirection: 'row',
    gap: 8,
  },
  startButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  detailsButtonText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  completedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingVertical: 10,
    borderRadius: 8,
  },
  completedButtonText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  completedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  completedText: {
    color: '#22C55E',
    fontSize: 12,
    marginLeft: 8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    marginHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tipsContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  tipsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipText: {
    color: '#94A3B8',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
});