import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
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
  has_diet: boolean;
}

interface Meal {
  name: string;
  time: string;
  foods: string;
  calories: string;
}

export default function CreateDietPlan() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string>('');
  
  // Diet form fields
  const [title, setTitle] = useState('Plano Alimentar Personalizado');
  const [goal, setGoal] = useState('');
  const [totalCalories, setTotalCalories] = useState('2000');
  const [protein, setProtein] = useState('150');
  const [carbs, setCarbs] = useState('200');
  const [fats, setFats] = useState('70');
  const [instructions, setInstructions] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  
  const [meals, setMeals] = useState<Meal[]>([
    { name: 'Café da Manhã', time: '07:00', foods: '', calories: '' },
    { name: 'Lanche da Manhã', time: '10:00', foods: '', calories: '' },
    { name: 'Almoço', time: '12:30', foods: '', calories: '' },
    { name: 'Lanche da Tarde', time: '16:00', foods: '', calories: '' },
    { name: 'Jantar', time: '19:30', foods: '', calories: '' },
  ]);
  
  const [creating, setCreating] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) {
        router.replace('/professional/nutritionist/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/professionals/my-clients-for-diet`, { headers });
      
      setClients(response.data.clients || []);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
      if (error.response?.status === 401) {
        router.replace('/professional/nutritionist/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateMeal = (index: number, field: keyof Meal, value: string) => {
    const newMeals = [...meals];
    newMeals[index][field] = value;
    setMeals(newMeals);
  };

  const createDiet = async () => {
    if (!selectedClient) {
      Alert.alert('Erro', 'Selecione um cliente para criar a dieta');
      return;
    }

    if (!goal) {
      Alert.alert('Erro', 'Defina o objetivo da dieta');
      return;
    }

    try {
      setCreating(true);
      const token = await AsyncStorage.getItem('professionalToken');
      const headers = { Authorization: `Bearer ${token}` };
      
      const dietData = {
        client_id: selectedClient,
        title,
        goal,
        total_calories: parseInt(totalCalories) || 0,
        macros: {
          protein: parseInt(protein) || 0,
          carbs: parseInt(carbs) || 0,
          fats: parseInt(fats) || 0,
        },
        meals: meals.map(meal => ({
          name: meal.name,
          time: meal.time,
          foods: meal.foods,
          calories: parseInt(meal.calories) || 0,
        })),
        instructions,
        duration_days: parseInt(durationDays) || 30,
      };

      await axios.post(`${API_URL}/professionals/create-diet`, dietData, { headers });
      
      Alert.alert(
        '✅ Sucesso!', 
        'Dieta criada e liberada para o cliente! Ele já pode visualizar no app.',
        [{ text: 'OK', onPress: () => { setSelectedClient(''); setGoal(''); setInstructions(''); setMeals([{ name: 'Café da Manhã', time: '07:00', foods: '', calories: '' }, { name: 'Lanche da Manhã', time: '10:00', foods: '', calories: '' }, { name: 'Almoço', time: '12:30', foods: '', calories: '' }, { name: 'Lanche da Tarde', time: '16:00', foods: '', calories: '' }, { name: 'Jantar', time: '19:30', foods: '', calories: '' }]); loadClients(); }}]
      );
    } catch (error: any) {
      console.error('Erro ao criar dieta:', error);
      Alert.alert('Erro', error.response?.data?.detail || 'Não foi possível criar a dieta');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Carregando clientes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (clients.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#64748B" />
          <Text style={styles.emptyTitle}>Nenhum cliente vinculado</Text>
          <Text style={styles.emptyText}>Você precisa aceitar clientes na aba "Novos" antes de criar dietas para eles.</Text>
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
            <Picker selectedValue={selectedClient} onValueChange={(value) => setSelectedClient(value)} style={styles.picker} dropdownIconColor="#22C55E">
              <Picker.Item label="Escolha um cliente" value="" />
              {clients.map((client) => (<Picker.Item key={client.id} label={`${client.client_name} ${client.has_diet ? '(já tem dieta)' : ''}`} value={client.client_id} />))}
            </Picker>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Básicas</Text>
          <Text style={styles.label}>Título do Plano</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ex: Plano de Emagrecimento" placeholderTextColor="#64748B" />
          <Text style={styles.label}>Objetivo</Text>
          <TextInput style={[styles.input, styles.textArea]} value={goal} onChangeText={setGoal} placeholder="Ex: Perder 5kg em 2 meses com alimentação balanceada" placeholderTextColor="#64748B" multiline numberOfLines={3} />
          <Text style={styles.label}>Duração (dias)</Text>
          <TextInput style={styles.input} value={durationDays} onChangeText={setDurationDays} placeholder="30" placeholderTextColor="#64748B" keyboardType="numeric" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Macronutrientes Diários</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Calorias</Text>
              <TextInput style={styles.input} value={totalCalories} onChangeText={setTotalCalories} placeholder="2000" placeholderTextColor="#64748B" keyboardType="numeric" />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Proteínas (g)</Text>
              <TextInput style={styles.input} value={protein} onChangeText={setProtein} placeholder="150" placeholderTextColor="#64748B" keyboardType="numeric" />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Carboidratos (g)</Text>
              <TextInput style={styles.input} value={carbs} onChangeText={setCarbs} placeholder="200" placeholderTextColor="#64748B" keyboardType="numeric" />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Gorduras (g)</Text>
              <TextInput style={styles.input} value={fats} onChangeText={setFats} placeholder="70" placeholderTextColor="#64748B" keyboardType="numeric" />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Refeições</Text>
          {meals.map((meal, index) => (
            <View key={index} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <Ionicons name="restaurant" size={20} color="#22C55E" />
                <Text style={styles.mealName}>{meal.name}</Text>
              </View>
              <Text style={styles.label}>Horário</Text>
              <TextInput style={styles.input} value={meal.time} onChangeText={(value) => updateMeal(index, 'time', value)} placeholder="07:00" placeholderTextColor="#64748B" />
              <Text style={styles.label}>Alimentos</Text>
              <TextInput style={[styles.input, styles.textArea]} value={meal.foods} onChangeText={(value) => updateMeal(index, 'foods', value)} placeholder="Ex: 2 ovos mexidos, 1 fatia de pão integral, 1 banana" placeholderTextColor="#64748B" multiline numberOfLines={3} />
              <Text style={styles.label}>Calorias</Text>
              <TextInput style={styles.input} value={meal.calories} onChangeText={(value) => updateMeal(index, 'calories', value)} placeholder="400" placeholderTextColor="#64748B" keyboardType="numeric" />
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instruções Gerais</Text>
          <TextInput style={[styles.input, styles.textArea]} value={instructions} onChangeText={setInstructions} placeholder="Orientações adicionais: beber 2L de água por dia, evitar frituras, etc." placeholderTextColor="#64748B" multiline numberOfLines={4} />
        </View>

        <TouchableOpacity style={[styles.createButton, creating && styles.createButtonDisabled]} onPress={createDiet} disabled={creating}>
          {creating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Criar e Liberar Dieta para Cliente</Text>
            </>
          )}
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
  sectionTitle: { color: '#22C55E', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  pickerContainer: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)', borderRadius: 8, overflow: 'hidden' },
  picker: { color: '#FFFFFF', height: 50 },
  label: { color: '#94A3B8', fontSize: 14, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)', borderRadius: 8, padding: 12, color: '#FFFFFF', fontSize: 14 },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  mealCard: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)', borderRadius: 12, padding: 16, marginBottom: 16 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mealName: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#22C55E', paddingVertical: 16, borderRadius: 8, marginHorizontal: 24, marginTop: 8 },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});
