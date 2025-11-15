import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface Workout {
  id: string;
  title: string;
  professional_name: string;
  goal: string;
  level: string;
  frequency: string;
  exercises: Array<{ name: string; sets: number; reps: number; rest: string }>;
  instructions: string;
  duration_weeks: number;
}

interface WorkoutProgress {
  total_expected_sessions: number;
  completed_sessions: number;
  remaining_sessions: number;
  progress_percentage: number;
  sessions_per_week: number;
  duration_weeks: number;
}

export default function Workouts() {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [progress, setProgress] = useState<WorkoutProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => { loadWorkout(); }, []);

  const loadWorkout = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) { router.replace('/'); return; }
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/client/my-workout`, { headers });
      if (response.data.has_workout) {
        setWorkout(response.data.workout);
        loadProgress(response.data.workout.id);
      }
    } catch (error: any) {
      console.error('Erro ao carregar treino:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadProgress = async (workoutId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/client/workout-progress/${workoutId}`, { headers });
      setProgress(response.data);
    } catch (error: any) {
      console.error('Erro ao carregar progresso:', error);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadWorkout(); };

  const getLevelLabel = (level: string) => {
    const labels: any = { beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado' };
    return labels[level] || level;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Carregando treino...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={80} color="#64748B" />
          <Text style={styles.emptyTitle}>Nenhum Treino Disponível</Text>
          <Text style={styles.emptyText}>Seu personal trainer ainda não criou um treino para você. Após agendar e ser aceito, ele criará um treino personalizado!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <Ionicons name="barbell" size={32} color="#F59E0B" />
          <View style={styles.headerText}>
            <Text style={styles.title}>{workout.title}</Text>
            <Text style={styles.subtitle}>Por {workout.professional_name}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Objetivo</Text>
          <Text style={styles.cardText}>{workout.goal}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Informações</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="stats-chart" size={20} color="#F59E0B" />
              <Text style={styles.infoLabel}>Nível</Text>
              <Text style={styles.infoValue}>{getLevelLabel(workout.level)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={20} color="#F59E0B" />
              <Text style={styles.infoLabel}>Frequência</Text>
              <Text style={styles.infoValue}>{workout.frequency}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time" size={20} color="#F59E0B" />
              <Text style={styles.infoLabel}>Duração</Text>
              <Text style={styles.infoValue}>{workout.duration_weeks} semanas</Text>
            </View>
          </View>
        </View>

        {progress && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📈 Seu Progresso</Text>
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>
                {progress.completed_sessions} de {progress.total_expected_sessions} treinos concluídos
              </Text>
              <Text style={styles.progressPercentage}>{progress.progress_percentage}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${progress.progress_percentage}%` }]} />
            </View>
            <Text style={styles.progressRemaining}>
              Faltam {progress.remaining_sessions} treinos para completar o programa
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.startWorkoutButton}
          onPress={() => router.push(`/client/workout-session?workoutId=${workout.id}`)}
        >
          <Ionicons name="play-circle" size={28} color="#FFFFFF" />
          <Text style={styles.startWorkoutText}>Iniciar Treino</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💪 Exercícios</Text>
          {workout.exercises.map((exercise, index) => (
            <View key={index} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseNumber}>{index + 1}</Text>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
              </View>
              <View style={styles.exerciseDetails}>
                <View style={styles.exerciseDetail}>
                  <Ionicons name="repeat" size={16} color="#F59E0B" />
                  <Text style={styles.exerciseDetailText}>{exercise.sets} séries</Text>
                </View>
                <View style={styles.exerciseDetail}>
                  <Ionicons name="fitness" size={16} color="#F59E0B" />
                  <Text style={styles.exerciseDetailText}>{exercise.reps} reps</Text>
                </View>
                <View style={styles.exerciseDetail}>
                  <Ionicons name="timer" size={16} color="#F59E0B" />
                  <Text style={styles.exerciseDetailText}>{exercise.rest} descanso</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {workout.instructions && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📝 Instruções</Text>
            <Text style={styles.cardText}>{workout.instructions}</Text>
          </View>
        )}
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
  emptyTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginTop: 24, textAlign: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 16, lineHeight: 22 },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 24, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderBottomWidth: 1, borderBottomColor: 'rgba(245, 158, 11, 0.2)' },
  headerText: { marginLeft: 16, flex: 1 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#F59E0B', fontSize: 14, marginTop: 4 },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)', borderRadius: 12, padding: 20, margin: 16 },
  cardTitle: { color: '#F59E0B', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  cardText: { color: '#FFFFFF', fontSize: 15, lineHeight: 24 },
  infoRow: { flexDirection: 'row', gap: 12 },
  infoItem: { flex: 1, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 8, padding: 12, alignItems: 'center' },
  infoLabel: { color: '#94A3B8', fontSize: 11, marginTop: 4 },
  infoValue: { color: '#F59E0B', fontSize: 14, fontWeight: 'bold', marginTop: 4, textAlign: 'center' },
  exerciseCard: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, padding: 16, marginTop: 12 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  exerciseNumber: { backgroundColor: '#F59E0B', color: '#FFFFFF', width: 28, height: 28, borderRadius: 14, textAlign: 'center', lineHeight: 28, fontWeight: 'bold', fontSize: 14 },
  exerciseName: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 12, flex: 1 },
  exerciseDetails: { flexDirection: 'row', gap: 12 },
  exerciseDetail: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 6, padding: 8 },
  exerciseDetailText: { color: '#FFFFFF', fontSize: 12, marginLeft: 6 },
});
