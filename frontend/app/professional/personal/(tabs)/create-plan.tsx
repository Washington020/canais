import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface AssignedClient {
  id: string;
  full_name: string;
  email: string;
  plan_type: string;
  assigned_at: string;
  active_plans: number;
}

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  instructions?: string;
}

interface WorkoutDay {
  name: string;
  focus: string;
  exercises: Exercise[];
  duration: string;
  instructions?: string;
}

export default function CreateWorkoutPlan() {
  const [loading, setLoading] = useState(false);
  const [assignedClients, setAssignedClients] = useState<AssignedClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<AssignedClient | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  
  // Plan data
  const [planTitle, setPlanTitle] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [weeklyFrequency, setWeeklyFrequency] = useState('5');
  const [difficulty, setDifficulty] = useState('Intermediário');
  
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([
    {
      name: 'Segunda-feira',
      focus: 'Peito e Tríceps',
      duration: '60',
      exercises: [
        {
          name: 'Supino Reto',
          sets: '4',
          reps: '8-12',
          rest: '60s',
          instructions: 'Manter controle na descida'
        },
        {
          name: 'Supino Inclinado',
          sets: '3',
          reps: '10-15',
          rest: '45s',
          instructions: 'Foco na parte superior do peito'
        },
        {
          name: 'Crucifixo',
          sets: '3',
          reps: '12-15',
          rest: '45s',
          instructions: 'Movimento controlado'
        },
        {
          name: 'Tríceps Pulley',
          sets: '4',
          reps: '10-15',
          rest: '45s',
          instructions: 'Cotovelos fixos'
        }
      ],
      instructions: 'Aquecimento: 10 min esteira'
    },
    {
      name: 'Terça-feira',
      focus: 'Costas e Bíceps',
      duration: '60',
      exercises: [
        {
          name: 'Puxada Frontal',
          sets: '4',
          reps: '8-12',
          rest: '60s',
          instructions: 'Puxar até o peito'
        },
        {
          name: 'Remada Baixa',
          sets: '4',
          reps: '10-12',
          rest: '60s',
          instructions: 'Apertar as escápulas'
        },
        {
          name: 'Rosca Direta',
          sets: '3',
          reps: '10-15',
          rest: '45s',
          instructions: 'Movimento controlado'
        },
        {
          name: 'Rosca Martelo',
          sets: '3',
          reps: '12-15',
          rest: '45s',
          instructions: 'Pegada neutra'
        }
      ],
      instructions: 'Aquecimento: 10 min bicicleta'
    },
    {
      name: 'Quarta-feira',
      focus: 'Pernas',
      duration: '60',
      exercises: [
        {
          name: 'Agachamento',
          sets: '4',
          reps: '8-15',
          rest: '90s',
          instructions: 'Descer até 90 graus'
        },
        {
          name: 'Leg Press',
          sets: '4',
          reps: '12-20',
          rest: '60s',
          instructions: 'Amplitude completa'
        },
        {
          name: 'Extensora',
          sets: '3',
          reps: '12-15',
          rest: '45s',
          instructions: 'Contração no topo'
        },
        {
          name: 'Flexora',
          sets: '3',
          reps: '12-15',
          rest: '45s',
          instructions: 'Movimento controlado'
        }
      ],
      instructions: 'Aquecimento: 15 min + alongamento'
    }
  ]);

  const router = useRouter();

  useEffect(() => {
    loadAssignedClients();
  }, []);

  const loadAssignedClients = async () => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) {
        router.replace('/professional/personal/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/professionals/my-assigned-clients`, { headers });
      
      setAssignedClients(response.data.assigned_clients || []);
    } catch (error: any) {
      console.error('Error loading assigned clients:', error);
      if (error.response?.status === 401) {
        router.replace('/professional/personal/login');
      }
      setAssignedClients([]);
    }
  };

  const updateWorkoutDay = (dayIndex: number, field: string, value: string) => {
    const updatedDays = [...workoutDays];
    (updatedDays[dayIndex] as any)[field] = value;
    setWorkoutDays(updatedDays);
  };

  const updateExercise = (dayIndex: number, exerciseIndex: number, field: string, value: string) => {
    const updatedDays = [...workoutDays];
    (updatedDays[dayIndex].exercises[exerciseIndex] as any)[field] = value;
    setWorkoutDays(updatedDays);
  };

  const handleCreatePlan = async () => {
    if (!selectedClient) {
      Alert.alert('Erro', 'Selecione um cliente para criar o plano de treino');
      return;
    }

    if (!planTitle.trim()) {
      Alert.alert('Erro', 'Digite um título para o plano');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      const headers = { Authorization: `Bearer ${token}` };

      const planData = {
        client_id: selectedClient.id,
        title: planTitle,
        description: planDescription,
        duration_days: parseInt(duration),
        weekly_frequency: parseInt(weeklyFrequency),
        difficulty: difficulty,
        workout_days: workoutDays,
        professional_type: 'personal'
      };

      await axios.post(`${API_URL}/professionals/create-plan`, planData, { headers });

      Alert.alert(
        'Sucesso!',
        `Plano de treino criado para ${selectedClient.full_name}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setSelectedClient(null);
              setPlanTitle('');
              setPlanDescription('');
              router.back();
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error creating plan:', error);
      Alert.alert('Erro', error.response?.data?.detail || 'Não foi possível criar o plano');
    } finally {
      setLoading(false);
    }
  };

  const selectClient = (client: AssignedClient) => {
    setSelectedClient(client);
    setPlanTitle(`Plano de Treino - ${client.full_name}`);
    setShowClientModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerCard}>
            <View style={styles.headerIcon}>
              <Ionicons name="fitness" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Criar Plano de Treino</Text>
              <Text style={styles.headerSubtitle}>
                {selectedClient ? `Para: ${selectedClient.full_name}` : 'Selecione um cliente'}
              </Text>
            </View>
          </View>

          {/* Client Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="person" size={18} color="#F59E0B" /> Cliente
            </Text>
            
            <TouchableOpacity
              style={[styles.clientSelector, !selectedClient && styles.clientSelectorEmpty]}
              onPress={() => setShowClientModal(true)}
            >
              {selectedClient ? (
                <View style={styles.selectedClientInfo}>
                  <View style={styles.clientDetails}>
                    <Text style={styles.clientName}>{selectedClient.full_name}</Text>
                    <Text style={styles.clientEmail}>{selectedClient.email}</Text>
                    <Text style={styles.clientPlan}>Plano: {selectedClient.plan_type.toUpperCase()}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={24} color="#F59E0B" />
                </View>
              ) : (
                <View style={styles.emptyClientSelector}>
                  <Ionicons name="person-add" size={24} color="#64748B" />
                  <Text style={styles.emptyClientText}>Selecionar Cliente</Text>
                  <Ionicons name="chevron-forward" size={20} color="#64748B" />
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.clientCount}>
              {assignedClients.length} {assignedClients.length === 1 ? 'cliente atribuído' : 'clientes atribuídos'}
            </Text>
          </View>

          {/* Plan Details - Only show if client is selected */}
          {selectedClient && (
            <>
              {/* Plan Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="document-text" size={18} color="#F59E0B" /> Informações do Plano
                </Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Título do Plano</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ex: Plano para Hipertrofia"
                    placeholderTextColor="#64748B"
                    value={planTitle}
                    onChangeText={setPlanTitle}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Descrição</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Descreva os objetivos e características do treino..."
                    placeholderTextColor="#64748B"
                    value={planDescription}
                    onChangeText={setPlanDescription}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.row}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Duração (dias)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="30"
                      placeholderTextColor="#64748B"
                      value={duration}
                      onChangeText={setDuration}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Freq/semana</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="5"
                      placeholderTextColor="#64748B"
                      value={weeklyFrequency}
                      onChangeText={setWeeklyFrequency}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Dificuldade</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Intermediário"
                      placeholderTextColor="#64748B"
                      value={difficulty}
                      onChangeText={setDifficulty}
                    />
                  </View>
                </View>
              </View>

              {/* Workout Days Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="calendar" size={18} color="#F59E0B" /> Treinos da Semana ({workoutDays.length})
                </Text>

                {workoutDays.map((day, dayIndex) => (
                  <View key={dayIndex} style={styles.workoutCard}>
                    <View style={styles.workoutHeader}>
                      <Text style={styles.workoutTitle}>{day.name}</Text>
                      <TouchableOpacity style={styles.editButton}>
                        <Text style={styles.editButtonText}>Editar</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.row}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Foco</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Peito e Tríceps"
                          placeholderTextColor="#64748B"
                          value={day.focus}
                          onChangeText={(value) => updateWorkoutDay(dayIndex, 'focus', value)}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Duração (min)</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="60"
                          placeholderTextColor="#64748B"
                          value={day.duration}
                          onChangeText={(value) => updateWorkoutDay(dayIndex, 'duration', value)}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Instruções Gerais</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Aquecimento, observações..."
                        placeholderTextColor="#64748B"
                        value={day.instructions}
                        onChangeText={(value) => updateWorkoutDay(dayIndex, 'instructions', value)}
                      />
                    </View>

                    {/* Exercises */}
                    <View style={styles.exercisesSection}>
                      <Text style={styles.exercisesTitle}>
                        Exercícios ({day.exercises.length})
                      </Text>
                      
                      {day.exercises.map((exercise, exerciseIndex) => (
                        <View key={exerciseIndex} style={styles.exerciseCard}>
                          <View style={styles.exerciseHeader}>
                            <Text style={styles.exerciseTitle}>{exercise.name}</Text>
                          </View>

                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Nome do Exercício</Text>
                            <TextInput
                              style={styles.textInput}
                              placeholder="Supino Reto"
                              placeholderTextColor="#64748B"
                              value={exercise.name}
                              onChangeText={(value) => updateExercise(dayIndex, exerciseIndex, 'name', value)}
                            />
                          </View>

                          <View style={styles.row}>
                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>Séries</Text>
                              <TextInput
                                style={styles.textInput}
                                placeholder="4"
                                placeholderTextColor="#64748B"
                                value={exercise.sets}
                                onChangeText={(value) => updateExercise(dayIndex, exerciseIndex, 'sets', value)}
                              />
                            </View>

                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>Repetições</Text>
                              <TextInput
                                style={styles.textInput}
                                placeholder="8-12"
                                placeholderTextColor="#64748B"
                                value={exercise.reps}
                                onChangeText={(value) => updateExercise(dayIndex, exerciseIndex, 'reps', value)}
                              />
                            </View>

                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>Descanso</Text>
                              <TextInput
                                style={styles.textInput}
                                placeholder="60s"
                                placeholderTextColor="#64748B"
                                value={exercise.rest}
                                onChangeText={(value) => updateExercise(dayIndex, exerciseIndex, 'rest', value)}
                              />
                            </View>
                          </View>

                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Instruções</Text>
                            <TextInput
                              style={styles.textInput}
                              placeholder="Técnica, observações..."
                              placeholderTextColor="#64748B"
                              value={exercise.instructions}
                              onChangeText={(value) => updateExercise(dayIndex, exerciseIndex, 'instructions', value)}
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              {/* Create Button */}
              <TouchableOpacity
                style={[styles.createButton, loading && styles.createButtonDisabled]}
                onPress={handleCreatePlan}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.createButtonText}>Criar Plano de Treino</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Client Selection Modal */}
        <Modal
          visible={showClientModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowClientModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecionar Cliente</Text>
                <TouchableOpacity onPress={() => setShowClientModal(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {assignedClients.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={48} color="#64748B" />
                    <Text style={styles.emptyText}>Nenhum cliente atribuído</Text>
                    <Text style={styles.emptySubtext}>
                      Vá para a aba "Novos" para assumir clientes
                    </Text>
                  </View>
                ) : (
                  assignedClients.map((client) => (
                    <TouchableOpacity
                      key={client.id}
                      style={styles.clientCard}
                      onPress={() => selectClient(client)}
                    >
                      <View style={styles.clientCardContent}>
                        <View style={styles.clientCardInfo}>
                          <Text style={styles.clientCardName}>{client.full_name}</Text>
                          <Text style={styles.clientCardEmail}>{client.email}</Text>
                          <Text style={styles.clientCardPlan}>
                            Plano: {client.plan_type.toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.clientCardMeta}>
                          <Text style={styles.activeWorkoutPlansText}>
                            {client.active_plans} planos ativos
                          </Text>
                          <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D17',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#F59E0B',
    borderRadius: 25,
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
    color: '#94A3B8',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientSelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  clientSelectorEmpty: {
    borderColor: 'rgba(100, 116, 139, 0.3)',
    borderStyle: 'dashed',
  },
  selectedClientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  clientEmail: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 2,
  },
  clientPlan: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyClientSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  emptyClientText: {
    color: '#94A3B8',
    fontSize: 16,
    marginHorizontal: 12,
  },
  clientCount: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  workoutCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  editButtonText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  exercisesSection: {
    marginTop: 16,
  },
  exercisesTitle: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  exerciseCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  exerciseHeader: {
    marginBottom: 8,
  },
  exerciseTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#64748B',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#0B0D17',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    fontWeight: 'bold',
  },
  modalScroll: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  clientCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  clientCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  clientCardInfo: {
    flex: 1,
  },
  clientCardName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clientCardEmail: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 4,
  },
  clientCardPlan: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  clientCardMeta: {
    alignItems: 'flex-end',
  },
  activeWorkoutPlansText: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 4,
  },
});