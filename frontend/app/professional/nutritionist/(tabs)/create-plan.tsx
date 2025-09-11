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

interface Meal {
  name: string;
  foods: string[];
  time: string;
  calories: string;
  instructions?: string;
}

interface Supplement {
  name: string;
  dosage: string;
  time: string;
  instructions?: string;
}


export default function CreateNutritionPlan() {
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
  const [dailyCalories, setDailyCalories] = useState('1800');
  const [waterIntake, setWaterIntake] = useState('2.5');
  const [medicalObservations, setMedicalObservations] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [meals, setMeals] = useState<Meal[]>([
    {
      name: 'Café da Manhã',
      foods: ['2 ovos mexidos', '1 fatia de pão integral', '1 copo de leite desnatado', '1/2 abacate'],
      time: '07:00',
      calories: '450',
      instructions: 'Preparar ovos com pouco óleo. Torrar o pão.'
    },
    {
      name: 'Lanche da Manhã',
      foods: ['1 banana', '1 punhado de castanhas'],
      time: '10:00',
      calories: '200',
      instructions: 'Consumir 30min antes do treino se houver.'
    },
    {
      name: 'Almoço',
      foods: ['150g peito de frango grelhado', '1 xícara de arroz integral', '1/2 xícara de feijão', 'Salada verde à vontade'],
      time: '12:30',
      calories: '600',
      instructions: 'Temperar frango com ervas. Salada com azeite extravirgem.'
    },
    {
      name: 'Lanche da Tarde',
      foods: ['1 iogurte grego natural', '1 colher de sopa de granola', 'Frutas vermelhas'],
      time: '15:30',
      calories: '250',
      instructions: 'Misturar todos os ingredientes.'
    },
    {
      name: 'Jantar',
      foods: ['120g salmão grelhado', '1 batata doce média assada', 'Brócolis no vapor'],
      time: '19:00',
      calories: '500',
      instructions: 'Temperar salmão com limão e ervas.'
    }
  ]);

  const [supplements, setSupplements] = useState<Supplement[]>([
    {
      name: 'Whey Protein',
      dosage: '1 scoop (30g)',
      time: 'Pós-treino',
      instructions: 'Misturar com 200ml de água ou leite'
    },
    {
      name: 'Ômega 3',
      dosage: '1 cápsula',
      time: 'Com almoço',
      instructions: 'Consumir junto com refeição'
    },
    {
      name: 'Multivitamínico',
      dosage: '1 cápsula',
      time: 'Café da manhã',
      instructions: 'Tomar com o estômago cheio'
    },
    {
      name: 'Creatina',
      dosage: '3g',
      time: 'Pós-treino',
      instructions: 'Misturar com whey protein ou água'
    }
  ]);

  const [loading, setLoading] = useState(false);

  const handleCreatePlan = useCallback(async () => {
    if (!selectedClient?.name?.trim() || !planTitle.trim()) {
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
        client_name: selectedClient?.name?.trim() || "",
        plan_title: planTitle.trim(),
        plan_description: planDescription.trim(),
        duration_days: parseInt(duration),
        daily_calories: parseInt(dailyCalories),
        water_intake_liters: parseFloat(waterIntake),
        dietary_restrictions: dietaryRestrictions.trim(),
        medical_observations: medicalObservations.trim(),
        meals: meals,
        supplements: supplements,
        created_by: 'marina@luxepass.com',
        professional_type: 'nutritionist',
        instructions: 'Plano personalizado com foco em emagrecimento saudável e ganho de massa muscular. Seguir horários e quantidades recomendadas.',
        notes: 'Cliente VIP - acompanhamento quinzenal. Ajustes conforme evolução.'
      };

      // Para demonstração, vamos simular sucesso
      setTimeout(() => {
        Alert.alert(
          '✅ Plano Nutricional Criado!',
          `Plano "${planTitle}" foi criado com sucesso para ${clientName}.\n\n` +
          `• ${meals.length} refeições programadas\n` +
          `• ${supplements.length} suplementos incluídos\n` +
          `• Meta diária: ${dailyCalories} kcal\n` +
          `• Consumo de água: ${waterIntake}L/dia`,
          [
            {
              text: 'Criar Outro',
              onPress: () => {
                setClientName('');
                setPlanTitle('');
                setPlanDescription('');
                setDietaryRestrictions('');
                setMedicalObservations('');
              }
            },
            {
              text: 'Ver Clientes',
              onPress: () => router.push('/professional/nutritionist/(tabs)/index')
            }
          ]
        );
        setLoading(false);
      }, 2000);

    } catch (error: any) {
      console.error('Error creating nutrition plan:', error);
      Alert.alert('Erro', 'Não foi possível criar o plano. Tente novamente.');
      setLoading(false);
    }
  }, [clientName, planTitle, planDescription, duration, dailyCalories, waterIntake, dietaryRestrictions, medicalObservations, meals, supplements, router]);

  const addMeal = () => {
    setMeals([...meals, {
      name: '',
      foods: [''],
      time: '',
      calories: '',
      instructions: ''
    }]);
  };

  const updateMeal = (index: number, field: keyof Meal, value: any) => {
    const newMeals = [...meals];
    newMeals[index] = { ...newMeals[index], [field]: value };
    setMeals(newMeals);
  };

  const removeMeal = (index: number) => {
    setMeals(meals.filter((_, i) => i !== index));
  };

  const addSupplement = () => {
    setSupplements([...supplements, {
      name: '',
      dosage: '',
      time: '',
      instructions: ''
    }]);
  };

  const updateSupplement = (index: number, field: keyof Supplement, value: string) => {
    const newSupplements = [...supplements];
    newSupplements[index] = { ...newSupplements[index], [field]: value };
    setSupplements(newSupplements);
  };

  const removeSupplement = (index: number) => {
    setSupplements(supplements.filter((_, i) => i !== index));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header Info */}
          <View style={styles.headerCard}>
            <View style={styles.headerIcon}>
              <Ionicons name="restaurant" size={32} color="#22C55E" />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Criar Plano Nutricional</Text>
              <Text style={styles.headerSubtitle}>Dieta personalizada para cliente VIP</Text>
            </View>
          </View>

          {/* Client Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Informações do Cliente</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nome do Cliente</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Isabella Costa VIP"
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
                placeholder="Ex: Plano Emagrecimento + Massa Muscular"
                placeholderTextColor="#64748B"
                value={planTitle}
                onChangeText={setPlanTitle}
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

              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Calorias/dia</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1800"
                  placeholderTextColor="#64748B"
                  value={dailyCalories}
                  onChangeText={setDailyCalories}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Água (L/dia)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2.5"
                  placeholderTextColor="#64748B"
                  value={waterIntake}
                  onChangeText={setWaterIntake}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Meals Schedule */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🍽️ Cronograma de Refeições</Text>
              <TouchableOpacity style={styles.addMealButton} onPress={addMeal}>
                <Ionicons name="add-circle" size={24} color="#22C55E" />
                <Text style={styles.addMealText}>Nova Refeição</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.mealsInfo}>
              <Text style={styles.mealsInfoText}>
                💡 Dica: Clique em "Nova Refeição" para adicionar mais quadrinhos de dieta conforme necessário
              </Text>
            </View>
            
            {meals.map((meal, index) => (
              <View key={index} style={styles.mealContainer}>
                <View style={styles.mealHeader}>
                  <TextInput
                    style={styles.mealNameInput}
                    placeholder="Nome da refeição"
                    placeholderTextColor="#64748B"
                    value={meal.name}
                    onChangeText={(value) => updateMeal(index, 'name', value)}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeMeal(index)}
                  >
                    <Ionicons name="close" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.mealDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailInput}>
                      <Text style={styles.detailLabel}>Horário</Text>
                      <TextInput
                        style={styles.detailField}
                        placeholder="07:00"
                        placeholderTextColor="#64748B"
                        value={meal.time}
                        onChangeText={(value) => updateMeal(index, 'time', value)}
                      />
                    </View>

                    <View style={styles.detailInput}>
                      <Text style={styles.detailLabel}>Calorias</Text>
                      <TextInput
                        style={styles.detailField}
                        placeholder="450"
                        placeholderTextColor="#64748B"
                        value={meal.calories}
                        onChangeText={(value) => updateMeal(index, 'calories', value)}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Alimentos (um por linha)"
                  placeholderTextColor="#64748B"
                  value={meal.foods.join('\n')}
                  onChangeText={(value) => updateMeal(index, 'foods', value.split('\n'))}
                  multiline
                  numberOfLines={4}
                />

                <TextInput
                  style={styles.notesInput}
                  placeholder="Instruções de preparo (opcional)"
                  placeholderTextColor="#64748B"
                  value={meal.instructions}
                  onChangeText={(value) => updateMeal(index, 'instructions', value)}
                />
              </View>
            ))}
          </View>

          {/* Supplements */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💊 Suplementação</Text>
              <TouchableOpacity style={styles.addButton} onPress={addSupplement}>
                <Ionicons name="add" size={16} color="#22C55E" />
              </TouchableOpacity>
            </View>
            
            {supplements.map((supplement, index) => (
              <View key={index} style={styles.supplementContainer}>
                <View style={styles.supplementHeader}>
                  <TextInput
                    style={styles.supplementNameInput}
                    placeholder="Nome do suplemento"
                    placeholderTextColor="#64748B"
                    value={supplement.name}
                    onChangeText={(value) => updateSupplement(index, 'name', value)}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeSupplement(index)}
                  >
                    <Ionicons name="close" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.supplementDetails}>
                  <View style={styles.detailInput}>
                    <Text style={styles.detailLabel}>Dosagem</Text>
                    <TextInput
                      style={styles.detailField}
                      placeholder="1 scoop"
                      placeholderTextColor="#64748B"
                      value={supplement.dosage}
                      onChangeText={(value) => updateSupplement(index, 'dosage', value)}
                    />
                  </View>

                  <View style={styles.detailInput}>
                    <Text style={styles.detailLabel}>Horário</Text>
                    <TextInput
                      style={styles.detailField}
                      placeholder="Pós-treino"
                      placeholderTextColor="#64748B"
                      value={supplement.time}
                      onChangeText={(value) => updateSupplement(index, 'time', value)}
                    />
                  </View>
                </View>

                <TextInput
                  style={styles.notesInput}
                  placeholder="Instruções de uso (opcional)"
                  placeholderTextColor="#64748B"
                  value={supplement.instructions}
                  onChangeText={(value) => updateSupplement(index, 'instructions', value)}
                />
              </View>
            ))}
          </View>

          {/* Medical Observations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏥 Observações Médicas</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Restrições Alimentares</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ex: Diabetes, Hipertensão, Intolerância à lactose, Doença celíaca..."
                placeholderTextColor="#64748B"
                value={dietaryRestrictions}
                onChangeText={setDietaryRestrictions}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Observações Importantes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ex: Medicamentos que afetam apetite, cirurgias recentes, alergias alimentares..."
                placeholderTextColor="#64748B"
                value={medicalObservations}
                onChangeText={setMedicalObservations}
                multiline
                numberOfLines={3}
              />
            </View>
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
                <Text style={styles.createButtonText}>Criar Plano Nutricional</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  headerIcon: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
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
    color: '#22C55E',
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
  addButton: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
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
  mealContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealNameInput: {
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
  mealDetails: {
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
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  supplementContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  supplementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  supplementNameInput: {
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
  supplementDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: '#22C55E',
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
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  addMealText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  mealsInfo: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  mealsInfoText: {
    color: '#22C55E',
    fontSize: 13,
    lineHeight: 18,
  },
});