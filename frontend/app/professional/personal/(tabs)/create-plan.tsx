import React, { useState, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  notes?: string;
}

interface WorkoutDay {
  day: string;
  focus: string;
  exercises: Exercise[];
}

export default function CreateWorkoutPlan() {
  const [clientName, setClientName] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [difficulty, setDifficulty] = useState('intermediario');
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([
    {
      day: 'Segunda-feira',
      focus: 'Peito e Tríceps',
      exercises: [
        { name: 'Supino Reto', sets: '4', reps: '10-12', rest: '60s', notes: 'Controle na descida' },
        { name: 'Supino Inclinado', sets: '3', reps: '10-12', rest: '60s', notes: '' },
        { name: 'Crucifixo', sets: '3', reps: '12-15', rest: '45s', notes: '' },
        { name: 'Tríceps Testa', sets: '3', reps: '12-15', rest: '45s', notes: '' },
      ]
    }
  ]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreatePlan = useCallback(async () => {
    if (!clientName.trim() || !planTitle.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome do cliente e título do plano');
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
        client_name: clientName.trim(),
        plan_title: planTitle.trim(),
        plan_description: planDescription.trim(),
        duration_days: parseInt(duration),
        difficulty_level: difficulty,
        workout_schedule: workoutDays,
        created_by: 'current_personal_trainer',
        professional_type: 'personal'
      };

      const response = await axios.post(`${API_URL}/admin/workouts/plan`, planData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert(
        '✅ Plano Criado!',
        `Plano de treino "${planTitle}" foi criado com sucesso para ${clientName}.`,
        [
          {
            text: 'Criar Outro',
            onPress: () => {
              setClientName('');
              setPlanTitle('');
              setPlanDescription('');
              setDuration('30');
              setDifficulty('intermediario');
            }
          },
          {
            text: 'Ver Clientes',
            onPress: () => router.push('/professional/personal/(tabs)/index')
          }
        ]
      );
    } catch (error: any) {
      console.error('Error creating workout plan:', error);
      Alert.alert('Erro', 'Não foi possível criar o plano. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [clientName, planTitle, planDescription, duration, difficulty, workoutDays, router]);

  const addExercise = (dayIndex: number) => {
    const newWorkoutDays = [...workoutDays];
    newWorkoutDays[dayIndex].exercises.push({
      name: '',
      sets: '3',
      reps: '10-12',
      rest: '60s',
      notes: ''
    });
    setWorkoutDays(newWorkoutDays);
  };

  const updateExercise = (dayIndex: number, exerciseIndex: number, field: keyof Exercise, value: string) => {
    const newWorkoutDays = [...workoutDays];
    newWorkoutDays[dayIndex].exercises[exerciseIndex][field] = value;
    setWorkoutDays(newWorkoutDays);
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    const newWorkoutDays = [...workoutDays];
    newWorkoutDays[dayIndex].exercises.splice(exerciseIndex, 1);
    setWorkoutDays(newWorkoutDays);
  };

  const getDifficultyOptions = () => [
    { label: 'Iniciante', value: 'iniciante', color: '#22C55E' },
    { label: 'Intermediário', value: 'intermediario', color: '#F59E0B' },
    { label: 'Avançado', value: 'avancado', color: '#EF4444' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Criar Plano de Treino</Text>
            <Text style={styles.headerSubtitle}>Plano personalizado para seu cliente</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="add-circle" size={24} color="#F59E0B" />
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Client Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Informações do Cliente</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nome do Cliente</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Ana Silva Premium"
                placeholderTextColor="#64748B"
                value={clientName}
                onChangeText={setClientName}
              />
            </View>
          </View>

          {/* Plan Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Detalhes do Plano</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Título do Plano</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Plano Hipertrofia Iniciante"
                placeholderTextColor="#64748B"
                value={planTitle}
                onChangeText={setPlanTitle}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descrição dos objetivos e metodologia do plano..."
                placeholderTextColor="#64748B"
                value={planDescription}
                onChangeText={setPlanDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
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

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Dificuldade</Text>
                <View style={styles.difficultyContainer}>
                  {getDifficultyOptions().map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.difficultyOption,
                        difficulty === option.value && { backgroundColor: option.color }
                      ]}
                      onPress={() => setDifficulty(option.value)}
                    >
                      <Text style={[
                        styles.difficultyText,
                        difficulty === option.value && { color: '#FFFFFF' }
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Workout Schedule */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏋️ Cronograma de Treinos</Text>
            
            {workoutDays.map((day, dayIndex) => (
              <View key={dayIndex} style={styles.dayContainer}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayTitle}>{day.day}</Text>
                  <Text style={styles.dayFocus}>{day.focus}</Text>
                </View>

                {day.exercises.map((exercise, exerciseIndex) => (
                  <View key={exerciseIndex} style={styles.exerciseContainer}>
                    <View style={styles.exerciseHeader}>
                      <TextInput
                        style={styles.exerciseNameInput}
                        placeholder="Nome do exercício"
                        placeholderTextColor="#64748B"
                        value={exercise.name}
                        onChangeText={(value) => updateExercise(dayIndex, exerciseIndex, 'name', value)}
                      />
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeExercise(dayIndex, exerciseIndex)}
                      >
                        <Ionicons name="close" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.exerciseDetails}>
                      <View style={styles.detailInput}>
                        <Text style={styles.detailLabel}>Séries</Text>
                        <TextInput
                          style={styles.detailField}
                          placeholder="3"
                          placeholderTextColor="#64748B"
                          value={exercise.sets}
                          onChangeText={(value) => updateExercise(dayIndex, exerciseIndex, 'sets', value)}
                        />
                      </View>

                      <View style={styles.detailInput}>
                        <Text style={styles.detailLabel}>Reps</Text>
                        <TextInput
                          style={styles.detailField}
                          placeholder="10-12"
                          placeholderTextColor="#64748B"
                          value={exercise.reps}
                          onChangeText={(value) => updateExercise(dayIndex, exerciseIndex, 'reps', value)}
                        />
                      </View>

                      <View style={styles.detailInput}>
                        <Text style={styles.detailLabel}>Descanso</Text>
                        <TextInput
                          style={styles.detailField}
                          placeholder="60s"
                          placeholderTextColor="#64748B"
                          value={exercise.rest}
                          onChangeText={(value) => updateExercise(dayIndex, exerciseIndex, 'rest', value)}
                        />
                      </View>
                    </View>

                    <TextInput
                      style={styles.notesInput}
                      placeholder="Observações (opcional)"
                      placeholderTextColor="#64748B"
                      value={exercise.notes}
                      onChangeText={(value) => updateExercise(dayIndex, exerciseIndex, 'notes', value)}
                    />
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addExerciseButton}
                  onPress={() => addExercise(dayIndex)}
                >
                  <Ionicons name="add" size={16} color="#F59E0B" />
                  <Text style={styles.addExerciseText}>Adicionar Exercício</Text>
                </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
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
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headerSubtitle: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  headerIcon: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  difficultyOption: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  difficultyText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  dayContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dayHeader: {
    marginBottom: 16,
  },
  dayTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dayFocus: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  exerciseContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseNameInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 8,
  },
  removeButton: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  detailInput: {
    flex: 1,
  },
  detailLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailField: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: '#FFFFFF',
    fontSize: 12,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderStyle: 'dashed',
  },
  addExerciseText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#64748B',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});