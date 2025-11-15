import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface Client {
  id: string;
  client_name: string;
  client_email: string;
  client_id: string;
  has_workout: boolean;
}

interface Exercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
}

export default function CreateWorkoutPlan() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [title, setTitle] = useState('Treino Personalizado');
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState('intermediate');
  const [frequency, setFrequency] = useState('3x por semana');
  const [instructions, setInstructions] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('8');
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: 'Supino Reto', sets: '4', reps: '12', rest: '90s' },
    { name: 'Agachamento', sets: '4', reps: '15', rest: '120s' },
    { name: 'Remada', sets: '4', reps: '12', rest: '90s' },
    { name: 'Desenvolvimento', sets: '3', reps: '12', rest: '90s' },
    { name: 'Rosca Direta', sets: '3', reps: '15', rest: '60s' },
  ]);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) { router.replace('/professional/personal/login'); return; }
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/professionals/my-clients-for-workout`, { headers });
      setClients(response.data.clients || []);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
      if (error.response?.status === 401) router.replace('/professional/personal/login');
    } finally {
      setLoading(false);
    }
  };

  const updateExercise = (index: number, field: keyof Exercise, value: string) => {
    const newExercises = [...exercises];
    newExercises[index][field] = value;
    setExercises(newExercises);
  };

  const createWorkout = async () => {
    if (!selectedClient) { Alert.alert('Erro', 'Selecione um cliente'); return; }
    if (!goal) { Alert.alert('Erro', 'Defina o objetivo do treino'); return; }
    try {
      setCreating(true);
      const token = await AsyncStorage.getItem('professionalToken');
      const headers = { Authorization: `Bearer ${token}` };
      const workoutData = {
        client_id: selectedClient,
        title,
        goal,
        level,
        frequency,
        exercises: exercises.map(ex => ({ name: ex.name, sets: parseInt(ex.sets) || 0, reps: parseInt(ex.reps) || 0, rest: ex.rest })),
        instructions,
        duration_weeks: parseInt(durationWeeks) || 8,
      };
      await axios.post(`${API_URL}/professionals/create-workout`, workoutData, { headers });
      Alert.alert('✅ Sucesso!', 'Treino criado e liberado para o cliente!', [{ text: 'OK', onPress: () => { setSelectedClient(''); setGoal(''); setInstructions(''); loadClients(); }}]);
    } catch (error: any) {
      console.error('Erro:', error);
      Alert.alert('Erro', error.response?.data?.detail || 'Não foi possível criar o treino');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Carregando clientes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (clients.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={64} color="#64748B" />
          <Text style={styles.emptyTitle}>Nenhum cliente vinculado</Text>
          <Text style={styles.emptyText}>Aceite clientes na aba "Novos" antes de criar treinos.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecionar Cliente</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedClient} onValueChange={(value) => setSelectedClient(value)} style={styles.picker} dropdownIconColor="#F59E0B">
              <Picker.Item label="Escolha um cliente" value="" />
              {clients.map((client) => (<Picker.Item key={client.id} label={`${client.client_name} ${client.has_workout ? '(já tem treino)' : ''}`} value={client.client_id} />))}
            </Picker>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Básicas</Text>
          <Text style={styles.label}>Título do Treino</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex: Treino de Hipertrofia" placeholderTextColor="#64748B" />
          <Text style={styles.label}>Objetivo</Text>
          <TextInput style={[styles.input, styles.textArea]} value={goal} onChangeText={setGoal} placeholder="Ex: Ganhar massa muscular nos membros superiores" placeholderTextColor="#64748B" multiline numberOfLines={3} />
          <Text style={styles.label}>Nível</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={level} onValueChange={setLevel} style={styles.picker} dropdownIconColor="#F59E0B">
              <Picker.Item label="Iniciante" value="beginner" />
              <Picker.Item label="Intermediário" value="intermediate" />
              <Picker.Item label="Avançado" value="advanced" />
            </Picker>
          </View>
          <Text style={styles.label}>Frequência</Text>
          <TextInput style={styles.input} value={frequency} onChangeText={setFrequency} placeholder="Ex: 4x por semana" placeholderTextColor="#64748B" />
          <Text style={styles.label}>Duração (semanas)</Text>
          <TextInput style={styles.input} value={durationWeeks} onChangeText={setDurationWeeks} placeholder="8" placeholderTextColor="#64748B" keyboardType="numeric" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercícios</Text>
          {exercises.map((exercise, index) => (
            <View key={index} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Ionicons name="barbell" size={20} color="#F59E0B" />
                <Text style={styles.exerciseName}>Exercício {index + 1}</Text>
              </View>
              <Text style={styles.label}>Nome do Exercício</Text>
              <TextInput style={styles.input} value={exercise.name} onChangeText={(value) => updateExercise(index, 'name', value)} placeholder="Ex: Supino Reto" placeholderTextColor="#64748B" />
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Séries</Text>
                  <TextInput style={styles.input} value={exercise.sets} onChangeText={(value) => updateExercise(index, 'sets', value)} placeholder="4" placeholderTextColor="#64748B" keyboardType="numeric" />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Repetições</Text>
                  <TextInput style={styles.input} value={exercise.reps} onChangeText={(value) => updateExercise(index, 'reps', value)} placeholder="12" placeholderTextColor="#64748B" keyboardType="numeric" />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Descanso</Text>
                  <TextInput style={styles.input} value={exercise.rest} onChangeText={(value) => updateExercise(index, 'rest', value)} placeholder="90s" placeholderTextColor="#64748B" />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instruções Gerais</Text>
          <TextInput style={[styles.input, styles.textArea]} value={instructions} onChangeText={setInstructions} placeholder="Orientações: aquecer 10min antes, focar na execução correta, etc." placeholderTextColor="#64748B" multiline numberOfLines={4} />
        </View>

        <TouchableOpacity style={[styles.createButton, creating && styles.createButtonDisabled]} onPress={createWorkout} disabled={creating}>
          {creating ? (<ActivityIndicator size="small" color="#FFFFFF" />) : (<><Ionicons name="checkmark-circle" size={24} color="#FFFFFF" /><Text style={styles.createButtonText}>Criar e Liberar Treino para Cliente</Text></>)}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D17' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFFFFF', fontSize: 16, marginTop: 16 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginTop: 16, textAlign: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  scrollView: { flex: 1 },
  section: { paddingHorizontal: 24, paddingVertical: 16 },
  sectionTitle: { color: '#F59E0B', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  pickerContainer: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', borderRadius: 8, overflow: 'hidden' },
  picker: { color: '#FFFFFF', height: 50 },
  label: { color: '#94A3B8', fontSize: 14, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', borderRadius: 8, padding: 12, color: '#FFFFFF', fontSize: 14 },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  exerciseCard: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)', borderRadius: 12, padding: 16, marginBottom: 16 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  exerciseName: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F59E0B', paddingVertical: 16, borderRadius: 8, marginHorizontal: 24, marginTop: 8 },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});
