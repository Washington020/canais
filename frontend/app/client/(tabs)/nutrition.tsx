import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface Diet {
  id: string;
  title: string;
  professional_name: string;
  goal: string;
  total_calories: number;
  macros: { protein: number; carbs: number; fats: number };
  meals: Array<{ name: string; time: string; foods: string; calories: number }>;
  instructions: string;
  duration_days: number;
}

export default function Nutrition() {
  const [diet, setDiet] = useState<Diet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => { loadDiet(); }, []);

  const loadDiet = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) { router.replace('/'); return; }
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/client/my-diet`, { headers });
      if (response.data.has_diet) setDiet(response.data.diet);
    } catch (error: any) {
      console.error('Erro ao carregar dieta:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadDiet(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Carregando dieta...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!diet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={80} color="#64748B" />
          <Text style={styles.emptyTitle}>Nenhuma Dieta Disponível</Text>
          <Text style={styles.emptyText}>Seu nutricionista ainda não criou um plano alimentar para você. Após agendar e ser aceito, ele criará uma dieta personalizada!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <Ionicons name="restaurant" size={32} color="#22C55E" />
          <View style={styles.headerText}>
            <Text style={styles.title}>{diet.title}</Text>
            <Text style={styles.subtitle}>Por {diet.professional_name}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Objetivo</Text>
          <Text style={styles.cardText}>{diet.goal}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Macronutrientes Diários</Text>
          <View style={styles.macrosGrid}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{diet.total_calories}</Text>
              <Text style={styles.macroLabel}>Calorias</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{diet.macros.protein}g</Text>
              <Text style={styles.macroLabel}>Proteínas</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{diet.macros.carbs}g</Text>
              <Text style={styles.macroLabel}>Carboidratos</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{diet.macros.fats}g</Text>
              <Text style={styles.macroLabel}>Gorduras</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🍽️ Plano Alimentar</Text>
          {diet.meals.map((meal, index) => (
            <View key={index} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <Ionicons name="time" size={18} color="#22C55E" />
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealTime}>{meal.time}</Text>
              </View>
              <Text style={styles.mealFoods}>{meal.foods}</Text>
              <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
            </View>
          ))}
        </View>

        {diet.instructions && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📝 Instruções Gerais</Text>
            <Text style={styles.cardText}>{diet.instructions}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>⏱️ Duração</Text>
          <Text style={styles.cardText}>{diet.duration_days} dias</Text>
        </View>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 24, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderBottomWidth: 1, borderBottomColor: 'rgba(34, 197, 94, 0.2)' },
  headerText: { marginLeft: 16, flex: 1 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#22C55E', fontSize: 14, marginTop: 4 },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)', borderRadius: 12, padding: 20, margin: 16 },
  cardTitle: { color: '#22C55E', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  cardText: { color: '#FFFFFF', fontSize: 15, lineHeight: 24 },
  macrosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  macroItem: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 8, padding: 16, alignItems: 'center' },
  macroValue: { color: '#22C55E', fontSize: 28, fontWeight: 'bold' },
  macroLabel: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  mealCard: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, padding: 16, marginTop: 12 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mealName: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8, flex: 1 },
  mealTime: { color: '#22C55E', fontSize: 14, fontWeight: '600' },
  mealFoods: { color: '#94A3B8', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  mealCalories: { color: '#22C55E', fontSize: 12, fontWeight: 'bold' },
});
