import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface User {
  id: string;
  full_name: string;
  email: string;
  plan_type: string;
  status: string;
}

interface Appointment {
  id: string;
  user_name: string;
  user_email: string;
  user_plan: string;
  appointment_date: string;
  status: string;
  notes: string;
}

export default function PersonalTrainerPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateWorkoutModal, setShowCreateWorkoutModal] = useState(false);
  const [showCreateSlotModal, setShowCreateSlotModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Load users with Premium/VIP plans
      const usersResponse = await axios.get(`${API_URL}/admin/users`, { headers });
      const premiumUsers = usersResponse.data.users.filter(
        (user: User) => user.plan_type !== 'basic' && user.status === 'active'
      );
      setUsers(premiumUsers);

      // Load personal trainer appointments
      const appointmentsResponse = await axios.get(`${API_URL}/admin/appointments`, { headers });
      const personalAppointments = appointmentsResponse.data.appointments.filter(
        (apt: Appointment) => apt.appointment_type === 'personal'
      );
      setAppointments(personalAppointments);

    } catch (error: any) {
      console.error('Error loading data:', error);
      if (error.response?.status === 401) {
        router.replace('/admin/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const createWorkoutPlan = async (userId: string, workoutName: string, exercises: any[]) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const planData = {
        user_id: userId,
        workout_name: workoutName,
        exercises: exercises,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
      };

      await axios.post(`${API_URL}/admin/workouts/plan`, planData, { headers });
      
      Alert.alert('✅ Sucesso', 'Plano de treino criado com sucesso!');
      setShowCreateWorkoutModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error creating workout plan:', error);
      Alert.alert('Erro', 'Não foi possível criar o plano de treino');
    }
  };

  const createAppointmentSlot = async (date: string, time: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const slotDateTime = new Date(`${date}T${time}:00.000Z`);
      
      const slotData = {
        professional_type: 'personal',
        date: slotDateTime.toISOString(),
      };

      await axios.post(`${API_URL}/admin/appointment-slots`, slotData, { headers });
      
      Alert.alert('✅ Sucesso', 'Horário disponibilizado com sucesso!');
      setShowCreateSlotModal(false);
    } catch (error: any) {
      console.error('Error creating slot:', error);
      Alert.alert('Erro', 'Não foi possível criar o horário');
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      await axios.put(`${API_URL}/admin/appointments/${appointmentId}/status?status=${status}`, {}, { headers });
      
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId ? { ...apt, status } : apt
        )
      );

      Alert.alert('✅ Sucesso', 'Status da sessão atualizado!');
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando dados...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerTitle}>
          <Text style={styles.title}>💪 Painel Personal Trainer</Text>
          <Text style={styles.subtitle}>Gestão de treinos e sessões</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowCreateSlotModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.length}</Text>
            <Text style={styles.statLabel}>Alunos Ativos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{appointments.length}</Text>
            <Text style={styles.statLabel}>Sessões</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {appointments.filter(a => a.status === 'scheduled').length}
            </Text>
            <Text style={styles.statLabel}>Agendadas</Text>
          </View>
        </View>

        {/* Training Sessions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏋️ Sessões de Treino</Text>
            <TouchableOpacity 
              style={styles.addSlotButton}
              onPress={() => setShowCreateSlotModal(true)}
            >
              <Text style={styles.addSlotText}>+ Horário</Text>
            </TouchableOpacity>
          </View>

          {appointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>Nenhuma sessão agendada</Text>
            </View>
          ) : (
            appointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentUserName}>{appointment.user_name}</Text>
                    <Text style={styles.appointmentUserEmail}>{appointment.user_email}</Text>
                    <Text style={styles.appointmentPlan}>
                      Plano: {appointment.user_plan === 'premium' ? 'Premium' : 'VIP'}
                    </Text>
                  </View>
                  <View style={[
                    styles.appointmentStatus,
                    { backgroundColor: appointment.status === 'scheduled' ? '#8B5CF6' : '#22C55E' }
                  ]}>
                    <Text style={styles.appointmentStatusText}>
                      {appointment.status === 'scheduled' ? 'Agendada' : 'Concluída'}
                    </Text>
                  </View>
                </View>

                <View style={styles.appointmentDetails}>
                  <Text style={styles.appointmentDate}>
                    🗓️ {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(appointment.appointment_date).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                  {appointment.notes && (
                    <Text style={styles.appointmentNotes}>📝 {appointment.notes}</Text>
                  )}
                </View>

                <View style={styles.appointmentActions}>
                  {appointment.status === 'scheduled' && (
                    <TouchableOpacity 
                      style={styles.completeButton}
                      onPress={() => updateAppointmentStatus(appointment.id, 'completed')}
                    >
                      <Text style={styles.completeButtonText}>Marcar como Concluída</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.createWorkoutButton}
                    onPress={() => {
                      const user = users.find(u => u.full_name === appointment.user_name);
                      if (user) {
                        setSelectedUser(user);
                        setShowCreateWorkoutModal(true);
                      }
                    }}
                  >
                    <Ionicons name="add-circle" size={16} color="#8B5CF6" />
                    <Text style={styles.createWorkoutButtonText}>Criar Treino</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Active Students */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Alunos Ativos (Premium/VIP)</Text>
          
          {users.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.full_name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={[
                  styles.userPlan,
                  { backgroundColor: user.plan_type === 'premium' ? '#8B5CF6' : '#FFD700' }
                ]}>
                  <Text style={styles.userPlanText}>
                    {user.plan_type === 'premium' ? 'Premium' : 'VIP'}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.createWorkoutButton}
                onPress={() => {
                  setSelectedUser(user);
                  setShowCreateWorkoutModal(true);
                }}
              >
                <Ionicons name="barbell" size={16} color="#8B5CF6" />
                <Text style={styles.createWorkoutButtonText}>Novo Treino</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Create Workout Plan Modal */}
      <Modal
        visible={showCreateWorkoutModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateWorkoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Criar Plano de Treino
              </Text>
              <TouchableOpacity 
                onPress={() => setShowCreateWorkoutModal(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedUser && (
                <View style={styles.selectedUserInfo}>
                  <Text style={styles.selectedUserName}>{selectedUser.full_name}</Text>
                  <Text style={styles.selectedUserEmail}>{selectedUser.email}</Text>
                </View>
              )}

              <Text style={styles.formLabel}>Treino Padrão - Push/Pull/Legs:</Text>
              
              <View style={styles.workoutSection}>
                <Text style={styles.workoutSectionTitle}>💪 PUSH (Peito, Ombros, Tríceps)</Text>
                <View style={styles.exerciseItem}>
                  <Text style={styles.exerciseName}>• Supino Reto</Text>
                  <Text style={styles.exerciseDetails}>4 séries x 8-10 reps</Text>
                </View>
                <View style={styles.exerciseItem}>
                  <Text style={styles.exerciseName}>• Desenvolvimento Militar</Text>
                  <Text style={styles.exerciseDetails}>3 séries x 10-12 reps</Text>
                </View>
                <View style={styles.exerciseItem}>
                  <Text style={styles.exerciseName}>• Tríceps Pulley</Text>
                  <Text style={styles.exerciseDetails}>3 séries x 12-15 reps</Text>
                </View>
              </View>

              <View style={styles.workoutSection}>
                <Text style={styles.workoutSectionTitle}>🏃 PULL (Costas, Bíceps)</Text>
                <View style={styles.exerciseItem}>
                  <Text style={styles.exerciseName}>• Puxada Frente</Text>
                  <Text style={styles.exerciseDetails}>4 séries x 8-10 reps</Text>
                </View>
                <View style={styles.exerciseItem}>
                  <Text style={styles.exerciseName}>• Remada Baixa</Text>
                  <Text style={styles.exerciseDetails}>3 séries x 10-12 reps</Text>
                </View>
                <View style={styles.exerciseItem}>
                  <Text style={styles.exerciseName}>• Rosca Direta</Text>
                  <Text style={styles.exerciseDetails}>3 séries x 12-15 reps</Text>
                </View>
              </View>

              <View style={styles.workoutSection}>
                <Text style={styles.workoutSectionTitle}>🦵 LEGS (Pernas, Glúteos)</Text>
                <View style={styles.exerciseItem}>
                  <Text style={styles.exerciseName}>• Agachamento</Text>
                  <Text style={styles.exerciseDetails}>4 séries x 10-12 reps</Text>
                </View>
                <View style={styles.exerciseItem}>
                  <Text style={styles.exerciseName}>• Leg Press</Text>
                  <Text style={styles.exerciseDetails}>3 séries x 12-15 reps</Text>
                </View>
                <View style={styles.exerciseItem}>
                  <Text style={styles.exerciseName}>• Stiff</Text>
                  <Text style={styles.exerciseDetails}>3 séries x 10-12 reps</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => {
                  if (selectedUser) {
                    const exercises = [
                      { name: 'Supino Reto', sets: 4, reps: 10, muscle_group: 'chest' },
                      { name: 'Desenvolvimento Militar', sets: 3, reps: 12, muscle_group: 'shoulders' },
                      { name: 'Tríceps Pulley', sets: 3, reps: 15, muscle_group: 'triceps' },
                      { name: 'Puxada Frente', sets: 4, reps: 10, muscle_group: 'back' },
                      { name: 'Remada Baixa', sets: 3, reps: 12, muscle_group: 'back' },
                      { name: 'Rosca Direta', sets: 3, reps: 15, muscle_group: 'biceps' },
                      { name: 'Agachamento', sets: 4, reps: 12, muscle_group: 'legs' },
                      { name: 'Leg Press', sets: 3, reps: 15, muscle_group: 'legs' },
                      { name: 'Stiff', sets: 3, reps: 12, muscle_group: 'hamstrings' }
                    ];
                    createWorkoutPlan(selectedUser.id, 'Treino Push/Pull/Legs', exercises);
                  }
                }}
              >
                <Text style={styles.createButtonText}>Criar Plano de Treino</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Appointment Slot Modal */}
      <CreateSlotModal
        visible={showCreateSlotModal}
        onClose={() => setShowCreateSlotModal(false)}
        onSubmit={createAppointmentSlot}
      />
    </SafeAreaView>
  );
}

// Separate component for Create Slot Modal
function CreateSlotModal({ visible, onClose, onSubmit }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (date: string, time: string) => void;
}) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleSubmit = () => {
    if (!date || !time) {
      Alert.alert('Erro', 'Preencha data e horário');
      return;
    }
    onSubmit(date, time);
    setDate('');
    setTime('');
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Disponibilizar Horário</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.formLabel}>Data (YYYY-MM-DD):</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="2025-01-25"
              placeholderTextColor="#64748B"
            />

            <Text style={styles.formLabel}>Horário (HH:MM):</Text>
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="14:00"
              placeholderTextColor="#64748B"
            />

            <TouchableOpacity style={styles.createButton} onPress={handleSubmit}>
              <Text style={styles.createButtonText}>Disponibilizar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: '#8B5CF6',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  addSlotButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addSlotText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
    marginTop: 16,
  },
  appointmentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentUserName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  appointmentUserEmail: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 4,
  },
  appointmentPlan: {
    color: '#A1A1AA',
    fontSize: 12,
  },
  appointmentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  appointmentStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentDetails: {
    marginBottom: 16,
  },
  appointmentDate: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 4,
  },
  appointmentNotes: {
    color: '#A1A1AA',
    fontSize: 12,
    fontStyle: 'italic',
  },
  appointmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  createWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  createWorkoutButtonText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 8,
  },
  userPlan: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  userPlanText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  selectedUserInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  selectedUserName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedUserEmail: {
    color: '#94A3B8',
    fontSize: 14,
  },
  formLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  workoutSection: {
    marginBottom: 20,
  },
  workoutSectionTitle: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  exerciseItem: {
    marginBottom: 8,
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  exerciseDetails: {
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});