import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
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
  sets: number;
  reps: number;
  rest: string;
}

export default function WorkoutSession() {
  const { workoutId } = useLocalSearchParams();
  const router = useRouter();
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string>('');
  const [phase, setPhase] = useState<'exercise' | 'rest'>('exercise');
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    loadWorkoutAndStart();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (phase === 'rest' && prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return phase === 'rest' ? prev - 1 : prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, phase]);

  const loadWorkoutAndStart = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) { router.replace('/'); return; }
      const headers = { Authorization: `Bearer ${token}` };
      
      const workoutResponse = await axios.get(`${API_URL}/client/my-workout`, { headers });
      if (workoutResponse.data.has_workout) {
        setExercises(workoutResponse.data.workout.exercises);
      }
      
      const sessionResponse = await axios.post(
        `${API_URL}/client/start-workout-session`,
        { workout_id: workoutId },
        { headers }
      );
      setSessionId(sessionResponse.data.session_id);
      setIsTimerRunning(true);
    } catch (error) {
      console.error('Erro ao iniciar treino:', error);
      Alert.alert('Erro', 'Não foi possível iniciar o treino');
      router.back();
    }
  };

  const completeExercise = () => {
    if (currentIndex < exercises.length - 1) {
      setPhase('rest');
      setTimer(180); // 3 minutos de descanso
      setIsTimerRunning(true);
    } else {
      finishWorkout();
    }
  };

  const skipRest = () => {
    setIsTimerRunning(false);
    moveToNextExercise();
  };

  const moveToNextExercise = () => {
    setCurrentIndex((prev) => prev + 1);
    setPhase('exercise');
    setTimer(0);
    setIsTimerRunning(true);
  };

  const finishWorkout = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/client/complete-workout-session/${sessionId}`, {}, { headers });
      
      Alert.alert(
        '🎉 Parabéns!',
        'Treino concluído com sucesso! Continue assim!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Erro ao finalizar treino:', error);
      Alert.alert('Erro', 'Não foi possível registrar o treino');
    }
  };

  const quitWorkout = () => {
    Alert.alert(
      'Sair do Treino',
      'Tem certeza que deseja sair? Seu progresso não será salvo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => router.back() }
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (exercises.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando treino...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentExercise = exercises[currentIndex];

  if (phase === 'rest') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity onPress={quitWorkout}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Descanso</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.restContainer}>
          <Ionicons name="pause-circle" size={80} color="#F59E0B" />
          <Text style={styles.restTitle}>Descanse um pouco!</Text>
          <Text style={styles.timerLarge}>{formatTime(timer)}</Text>
          
          {currentIndex < exercises.length - 1 && (
            <>
              <Text style={styles.nextExerciseLabel}>Próximo:</Text>
              <Text style={styles.nextExerciseName}>{exercises[currentIndex + 1].name}</Text>
            </>
          )}

          <View style={styles.restButtons}>
            <TouchableOpacity style={styles.skipButton} onPress={skipRest}>
              <Ionicons name="play-skip-forward" size={24} color="#FFFFFF" />
              <Text style={styles.skipButtonText}>Pular Descanso</Text>
            </TouchableOpacity>
            
            {timer === 0 && (
              <TouchableOpacity style={styles.nextButton} onPress={moveToNextExercise}>
                <Text style={styles.nextButtonText}>Iniciar Próximo</Text>
                <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={quitWorkout}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Treino em Andamento</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIndex + 1) / exercises.length) * 100}%` }]} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.exerciseCount}>
          Exercício {currentIndex + 1} de {exercises.length}
        </Text>
        
        <View style={styles.exerciseCard}>
          <Ionicons name="barbell" size={48} color="#F59E0B" />
          <Text style={styles.exerciseName}>{currentExercise.name}</Text>
        </View>

        <View style={styles.timerCard}>
          <Ionicons name="stopwatch" size={32} color="#F59E0B" />
          <Text style={styles.timerText}>{formatTime(timer)}</Text>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="repeat" size={24} color="#F59E0B" />
            <Text style={styles.detailLabel}>Séries</Text>
            <Text style={styles.detailValue}>{currentExercise.sets}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="fitness" size={24} color="#F59E0B" />
            <Text style={styles.detailLabel}>Repetições</Text>
            <Text style={styles.detailValue}>{currentExercise.reps}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="timer" size={24} color="#F59E0B" />
            <Text style={styles.detailLabel}>Descanso entre séries</Text>
            <Text style={styles.detailValue}>{currentExercise.rest}</Text>
          </View>
        </View>

        {exercises.length > currentIndex + 1 && (
          <View style={styles.upcomingCard}>
            <Text style={styles.upcomingTitle}>Próximos Exercícios:</Text>
            {exercises.slice(currentIndex + 1, currentIndex + 4).map((ex, idx) => (
              <Text key={idx} style={styles.upcomingItem}>
                {currentIndex + idx + 2}. {ex.name}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.completeButton} onPress={completeExercise}>
          <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
          <Text style={styles.completeButtonText}>
            {currentIndex < exercises.length - 1 ? 'Concluir Exercício' : 'Finalizar Treino'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D17' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFFFFF', fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(245, 158, 11, 0.2)' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  progressBar: { height: 8, backgroundColor: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#F59E0B' },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  exerciseCount: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  exerciseCard: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 2, borderColor: '#F59E0B', borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 24 },
  exerciseName: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginTop: 16, textAlign: 'center' },
  timerCard: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  timerText: { color: '#F59E0B', fontSize: 48, fontWeight: 'bold', marginLeft: 16 },
  detailsCard: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, padding: 20, marginBottom: 24 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  detailLabel: { color: '#94A3B8', fontSize: 14, marginLeft: 12, flex: 1 },
  detailValue: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  upcomingCard: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, padding: 20 },
  upcomingTitle: { color: '#F59E0B', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  upcomingItem: { color: '#94A3B8', fontSize: 14, marginBottom: 8 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(245, 158, 11, 0.2)' },
  completeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F59E0B', paddingVertical: 18, borderRadius: 12 },
  completeButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginLeft: 12 },
  restContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  restTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginTop: 24, marginBottom: 40 },
  timerLarge: { color: '#F59E0B', fontSize: 72, fontWeight: 'bold', marginBottom: 40 },
  nextExerciseLabel: { color: '#94A3B8', fontSize: 16, marginBottom: 8 },
  nextExerciseName: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  restButtons: { width: '100%', gap: 12 },
  skipButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', paddingVertical: 16, borderRadius: 12 },
  skipButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  nextButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F59E0B', paddingVertical: 18, borderRadius: 12 },
  nextButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginRight: 8 },
});
