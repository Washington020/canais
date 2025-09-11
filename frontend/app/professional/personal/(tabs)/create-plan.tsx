import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  weight: string;
  instructions: string;
}

interface WorkoutDay {
  name: string;
  focus: string;
  exercises: Exercise[];
}

export default function CreateWorkoutPlan() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Estados para cliente selecionado
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  
  // Estados do plano
  const [planTitle, setPlanTitle] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [workoutFrequency, setWorkoutFrequency] = useState('4');
  const [difficultyLevel, setDifficultyLevel] = useState('Intermediário');
  const [medicalObservations, setMedicalObservations] = useState('');
  const [physicalRestrictions, setPhysicalRestrictions] = useState('');
  
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([
    {
      name: 'Dia 1 - Peito e Tríceps',
      focus: 'Upper Body',
      exercises: [
        {
          name: 'Supino Reto',
          sets: '4',
          reps: '12',
          rest: '90s',
          weight: '80kg',
          instructions: 'Controle a descida, explosivo na subida'
        }
      ]
    }
  ]);
  
  const [loading, setLoading] = useState(false);
  
  // Carregar clientes atribuídos ao personal trainer
  useEffect(() => {
    loadMyClients();
    
    // Se chegou via parâmetro, pré-selecionar cliente
    if (params.clientId && params.clientName) {
      setSelectedClient({
        id: params.clientId,
        name: decodeURIComponent(params.clientName as string)
      });
      setPlanTitle(`Plano de Treino para ${decodeURIComponent(params.clientName as string)}`);
    }
  }, [params]);

  const loadMyClients = async () => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) {
        router.replace('/professional/personal/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/professionals/my-assigned-clients`, { headers });
      
      setAvailableClients(response.data.assigned_clients || []);
    } catch (error: any) {
      console.error('Error loading clients:', error);
      Alert.alert('Erro', 'Não foi possível carregar seus clientes');
    } finally {
      setLoadingClients(false);
    }
  };

  const addWorkoutDay = () => {
    const newDay: WorkoutDay = {
      name: `Dia ${workoutDays.length + 1}`,
      focus: 'Definir foco',
      exercises: [
        {
          name: 'Novo exercício',
          sets: '3',
          reps: '12',
          rest: '60s',
          weight: '',
          instructions: ''
        }
      ]
    };
    setWorkoutDays([...workoutDays, newDay]);
  };

  const removeWorkoutDay = (index: number) => {
    if (workoutDays.length > 1) {
      setWorkoutDays(workoutDays.filter((_, i) => i !== index));
    }
  };

  const updateWorkoutDay = (index: number, field: keyof WorkoutDay, value: string) => {
    const updatedDays = [...workoutDays];
    updatedDays[index] = { ...updatedDays[index], [field]: value };
    setWorkoutDays(updatedDays);
  };

  const addExercise = (dayIndex: number) => {
    const newExercise: Exercise = {
      name: 'Novo exercício',
      sets: '3',
      reps: '12',
      rest: '60s',
      weight: '',
      instructions: ''
    };
    const updatedDays = [...workoutDays];
    updatedDays[dayIndex].exercises.push(newExercise);
    setWorkoutDays(updatedDays);
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    const updatedDays = [...workoutDays];
    if (updatedDays[dayIndex].exercises.length > 1) {
      updatedDays[dayIndex].exercises.splice(exerciseIndex, 1);
      setWorkoutDays(updatedDays);
    }
  };

  const updateExercise = (dayIndex: number, exerciseIndex: number, field: keyof Exercise, value: string) => {
    const updatedDays = [...workoutDays];
    updatedDays[dayIndex].exercises[exerciseIndex] = {
      ...updatedDays[dayIndex].exercises[exerciseIndex],
      [field]: value
    };
    setWorkoutDays(updatedDays);
  };

  const handleCreatePlan = useCallback(async () => {
    if (!selectedClient?.id || !planTitle.trim()) {
      Alert.alert('Erro', 'Por favor, selecione um cliente e preencha o título do plano');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) {
        Alert.alert('Erro', 'Token não encontrado');
        return;
      }

      const planData = {
        client_id: selectedClient.id,
        client_name: selectedClient.full_name,
        plan_title: planTitle.trim(),
        plan_description: planDescription.trim(),
        duration_days: parseInt(duration),
        workout_frequency: parseInt(workoutFrequency),
        difficulty_level: difficultyLevel,
        physical_restrictions: physicalRestrictions.trim(),
        medical_observations: medicalObservations.trim(),
        workout_days: workoutDays,
        professional_type: 'personal',
        instructions: 'Plano personalizado criado pelo personal trainer. Seguir técnica correta e respeitar tempos de descanso.',
        notes: `Plano criado para cliente ${selectedClient.plan_type.toUpperCase()} - acompanhamento profissional.`
      };

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API_URL}/professionals/workouts/create`, planData, { headers });

      if (response.data.success) {
        Alert.alert(
          '✅ Plano de Treino Criado!',
          `Plano "${planTitle}" foi criado com sucesso para ${selectedClient.full_name}.\n\n` +
          `• ${workoutDays.length} dias de treino programados\n` +
          `• ${workoutDays.reduce((total, day) => total + day.exercises.length, 0)} exercícios incluídos\n` +
          `• Frequência semanal: ${workoutFrequency}x\n` +
          `• Nível: ${difficultyLevel}\n\n` +
          `🎯 O plano já aparece no app do cliente!`,
          [
            {
              text: 'Criar Outro',
              onPress: () => {
                setSelectedClient(null);
                setPlanTitle('');
                setPlanDescription('');
                setPhysicalRestrictions('');
                setMedicalObservations('');
                // Reset workout days to default
                setWorkoutDays([
                  {
                    name: 'Dia 1 - Peito e Tríceps',
                    focus: 'Upper Body',
                    exercises: [
                      {
                        name: 'Supino Reto',
                        sets: '4',
                        reps: '12',
                        rest: '90s',
                        weight: '80kg',
                        instructions: 'Controle a descida, explosivo na subida'
                      }
                    ]
                  }
                ]);
              }
            },
            {
              text: 'Ver Meus Clientes',
              onPress: () => router.push('/professional/personal/(tabs)/index')
            }
          ]
        );
      } else {
        Alert.alert('Erro', response.data.message || 'Não foi possível criar o plano');
      }
    } catch (error: any) {
      console.error('Error creating workout plan:', error);
      let errorMessage = 'Não foi possível criar o plano. Tente novamente.';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      Alert.alert('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedClient, planTitle, planDescription, duration, workoutFrequency, difficultyLevel, physicalRestrictions, medicalObservations, workoutDays, router]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header Card */}
          <View style={styles.headerCard}>
            <View style={styles.headerIcon}>
              <Ionicons name="fitness" size={32} color="#3B82F6" />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Criar Plano de Treino</Text>
              <Text style={styles.headerSubtitle}>Desenvolvimento personalizado para seu cliente</Text>
            </View>
          </View>

          {/* Client Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Selecionar Cliente</Text>
            
            {loadingClients ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.loadingText}>Carregando seus clientes...</Text>
              </View>
            ) : availableClients.length === 0 ? (
              <View style={styles.emptyClientsContainer}>
                <Ionicons name="fitness-outline" size={48} color="#64748B" />
                <Text style={styles.emptyClientsTitle}>Nenhum Cliente Atribuído</Text>
                <Text style={styles.emptyClientsText}>Vá para a aba "Novos" para assumir clientes primeiro</Text>
                <TouchableOpacity 
                  style={styles.goToClientsButton}
                  onPress={() => router.push('/professional/personal/(tabs)/new-clients')}
                >
                  <Text style={styles.goToClientsText}>Assumir Clientes</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.inputLabel}>Escolha o Cliente para Criar o Plano</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientsScroll}>
                  {availableClients.map((client) => (
                    <TouchableOpacity
                      key={client.id}
                      style={[
                        styles.clientCard,
                        selectedClient?.id === client.id && styles.selectedClientCard
                      ]}
                      onPress={() => {
                        setSelectedClient(client);
                        setPlanTitle(`Plano de Treino para ${client.full_name}`);
                      }}
                    >
                      <View style={[
                        styles.clientBadge,
                        { backgroundColor: client.plan_type === 'vip' ? '#FFD700' : '#8B5CF6' }
                      ]}>
                        <Text style={styles.clientBadgeText}>{client.plan_type.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.clientCardName}>{client.full_name}</Text>
                      <Text style={styles.clientCardEmail}>{client.email}</Text>
                      {selectedClient?.id === client.id && (
                        <View style={styles.selectedIndicator}>
                          <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {selectedClient && (
                  <View style={styles.selectedClientInfo}>
                    <Text style={styles.selectedClientTitle}>✅ Cliente Selecionado:</Text>
                    <Text style={styles.selectedClientName}>{selectedClient.full_name}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Plan Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Detalhes do Plano</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Título do Plano</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Plano de Hipertrofia Avançado"
                placeholderTextColor="#64748B"
                value={planTitle}
                onChangeText={setPlanTitle}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descreva os objetivos e metodologia do plano..."
                placeholderTextColor="#64748B"
                value={planDescription}
                onChangeText={setPlanDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, {flex: 1, marginRight: 8}]}>
                <Text style={styles.inputLabel}>Duração (dias)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="30"
                  placeholderTextColor="#64748B"
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputContainer, {flex: 1, marginLeft: 8}]}>
                <Text style={styles.inputLabel}>Frequência Semanal</Text>
                <TextInput
                  style={styles.input}
                  placeholder="4"
                  placeholderTextColor="#64748B"
                  value={workoutFrequency}
                  onChangeText={setWorkoutFrequency}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nível de Dificuldade</Text>
              <TextInput
                style={styles.input}
                placeholder="Iniciante, Intermediário ou Avançado"
                placeholderTextColor="#64748B"
                value={difficultyLevel}
                onChangeText={setDifficultyLevel}
              />
            </View>
          </View>

          {/* Medical Observations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏥 Observações Médicas</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Restrições Físicas</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ex: Problemas de joelho, lesões anteriores, limitações de movimento..."
                placeholderTextColor="#64748B"
                value={physicalRestrictions}
                onChangeText={setPhysicalRestrictions}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Observações Importantes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ex: Medicamentos, cirurgias recentes, condições médicas específicas..."
                placeholderTextColor="#64748B"
                value={medicalObservations}
                onChangeText={setMedicalObservations}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Workout Days */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💪 Cronograma de Treinos</Text>
              <TouchableOpacity style={styles.addWorkoutButton} onPress={addWorkoutDay}>
                <Ionicons name="add-circle" size={24} color="#3B82F6" />
                <Text style={styles.addWorkoutText}>Novo Dia</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.workoutsInfo}>
              <Text style={styles.workoutsInfoText}>
                💡 Dica: Clique em "Novo Dia" para adicionar mais dias de treino conforme necessário
              </Text>
            </View>

            {workoutDays.map((day, dayIndex) => (
              <View key={dayIndex} style={styles.workoutDayContainer}>
                <View style={styles.workoutDayHeader}>
                  <TextInput
                    style={styles.workoutDayNameInput}
                    placeholder={`Dia ${dayIndex + 1}`}
                    placeholderTextColor="#64748B"
                    value={day.name}
                    onChangeText={(text) => updateWorkoutDay(dayIndex, 'name', text)}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeWorkoutDay(dayIndex)}
                  >
                    <Ionicons name="trash" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.workoutDayDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailInput}>
                      <Text style={styles.detailLabel}>Foco do Treino</Text>
                      <TextInput
                        style={styles.detailField}
                        placeholder="Ex: Upper Body, Lower Body"
                        placeholderTextColor="#64748B"
                        value={day.focus}
                        onChangeText={(text) => updateWorkoutDay(dayIndex, 'focus', text)}
                      />
                    </View>
                  </View>
                </View>

                {/* Exercises */}
                <View style={styles.exercisesContainer}>
                  <View style={styles.exercisesHeader}>
                    <Text style={styles.exercisesTitle}>Exercícios</Text>
                    <TouchableOpacity
                      style={styles.addExerciseButton}
                      onPress={() => addExercise(dayIndex)}
                    >
                      <Ionicons name="add" size={16} color="#3B82F6" />
                    </TouchableOpacity>
                  </View>

                  {day.exercises.map((exercise, exerciseIndex) => (
                    <View key={exerciseIndex} style={styles.exerciseContainer}>
                      <View style={styles.exerciseHeader}>
                        <TextInput
                          style={styles.exerciseNameInput}
                          placeholder="Nome do exercício"
                          placeholderTextColor="#64748B"
                          value={exercise.name}
                          onChangeText={(text) => updateExercise(dayIndex, exerciseIndex, 'name', text)}
                        />
                        <TouchableOpacity
                          style={styles.removeExerciseButton}
                          onPress={() => removeExercise(dayIndex, exerciseIndex)}
                        >
                          <Ionicons name="close" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.exerciseDetails}>
                        <View style={styles.exerciseDetailRow}>
                          <View style={styles.exerciseDetailInput}>
                            <Text style={styles.detailLabel}>Séries</Text>
                            <TextInput
                              style={styles.detailField}
                              placeholder="3"
                              placeholderTextColor="#64748B"
                              value={exercise.sets}
                              onChangeText={(text) => updateExercise(dayIndex, exerciseIndex, 'sets', text)}
                            />
                          </View>
                          <View style={styles.exerciseDetailInput}>
                            <Text style={styles.detailLabel}>Repetições</Text>
                            <TextInput
                              style={styles.detailField}
                              placeholder="12"
                              placeholderTextColor="#64748B"
                              value={exercise.reps}
                              onChangeText={(text) => updateExercise(dayIndex, exerciseIndex, 'reps', text)}
                            />
                          </View>
                        </View>

                        <View style={styles.exerciseDetailRow}>
                          <View style={styles.exerciseDetailInput}>
                            <Text style={styles.detailLabel}>Descanso</Text>
                            <TextInput
                              style={styles.detailField}
                              placeholder="60s"
                              placeholderTextColor="#64748B"
                              value={exercise.rest}
                              onChangeText={(text) => updateExercise(dayIndex, exerciseIndex, 'rest', text)}
                            />
                          </View>
                          <View style={styles.exerciseDetailInput}>
                            <Text style={styles.detailLabel}>Peso</Text>
                            <TextInput
                              style={styles.detailField}
                              placeholder="80kg"
                              placeholderTextColor="#64748B"
                              value={exercise.weight}
                              onChangeText={(text) => updateExercise(dayIndex, exerciseIndex, 'weight', text)}
                            />
                          </View>
                        </View>

                        <View style={styles.inputContainer}>
                          <Text style={styles.detailLabel}>Instruções</Text>
                          <TextInput
                            style={styles.notesInput}
                            placeholder="Dicas de execução, cuidados especiais..."
                            placeholderTextColor="#64748B"
                            value={exercise.instructions}
                            onChangeText={(text) => updateExercise(dayIndex, exerciseIndex, 'instructions', text)}
                          />
                        </View>
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
              <Ionicons name="fitness" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.createButtonText}>Criar Plano de Treino</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
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
    paddingHorizontal: 24,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  headerIcon: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 30,
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
    color: '#3B82F6',
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
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    marginLeft: 8,
  },
  emptyClientsContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
  emptyClientsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyClientsText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  goToClientsButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  goToClientsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  clientsScroll: {
    marginVertical: 16,
  },
  clientCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 200,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  selectedClientCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3B82F6',
  },
  clientBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  clientBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  clientCardName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clientCardEmail: {
    color: '#64748B',
    fontSize: 12,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  selectedClientInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  selectedClientTitle: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedClientName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  addWorkoutText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  workoutsInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  workoutsInfoText: {
    color: '#3B82F6',
    fontSize: 13,
    lineHeight: 18,
  },
  workoutDayContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  workoutDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutDayNameInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  removeButton: {
    width: 28,
    height: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  workoutDayDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailInput: {
    flex: 1,
  },
  detailLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  detailField: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 10,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  exercisesContainer: {
    marginTop: 12,
  },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exercisesTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addExerciseButton: {
    width: 24,
    height: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  exerciseContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseNameInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    padding: 10,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  removeExerciseButton: {
    width: 24,
    height: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  exerciseDetails: {
    gap: 12,
  },
  exerciseDetailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exerciseDetailInput: {
    flex: 1,
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  createButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 24,
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
});