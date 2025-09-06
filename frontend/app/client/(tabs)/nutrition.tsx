import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl,
  ActivityIndicator,
  Alert,
  ProgressBarAndroid,
  ProgressViewIOS,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

const ProgressBar = Platform.OS === 'ios' ? ProgressViewIOS : ProgressBarAndroid;

interface NutritionPlan {
  id: string;
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fats: number;
  meals: any[];
  supplements: any[];
}

export default function Nutrition() {
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [consumedCalories, setConsumedCalories] = useState(1847);
  const [waterIntake, setWaterIntake] = useState(2.1);

  useEffect(() => {
    loadNutritionPlan();
  }, []);

  const loadNutritionPlan = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/nutrition/plan`, { headers });
      
      if (response.data.message) {
        // Create mock nutrition plan
        const mockPlan = {
          id: '1',
          daily_calories: 2150,
          daily_protein: 160,
          daily_carbs: 215,
          daily_fats: 72,
          meals: [
            {
              name: 'Café da manhã',
              calories: 485,
              completed: true,
              time: '07:00',
              foods: ['Aveia com frutas', 'Iogurte grego', 'Castanhas']
            },
            {
              name: 'Almoço',
              calories: 672,
              completed: true,
              time: '12:30',
              foods: ['Peito de frango grelhado', 'Arroz integral', 'Brócolis', 'Salada']
            },
            {
              name: 'Lanche da tarde',
              calories: 287,
              completed: true,
              time: '15:30',
              foods: ['Shake de proteína', 'Banana', 'Amendoim']
            },
            {
              name: 'Jantar',
              calories: 403,
              completed: false,
              time: '19:00',
              foods: ['Salmão grelhado', 'Batata doce', 'Aspargos']
            }
          ],
          supplements: [
            { name: 'Whey Protein', dosage: '30g', time: 'Pós-treino', completed: true },
            { name: 'Vitamina D3', dosage: '2000 UI', time: 'Manhã', completed: true },
            { name: 'Ferro + Vitamina C', dosage: '1 cápsula', time: 'Almoço', completed: false },
            { name: 'Ômega 3', dosage: '1000mg', time: 'Jantar', completed: false }
          ]
        };
        setNutritionPlan(mockPlan);
      } else {
        setNutritionPlan(response.data);
      }
    } catch (error) {
      console.error('Error loading nutrition plan:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNutritionPlan();
  };

  const markMealAsCompleted = (mealIndex: number) => {
    if (!nutritionPlan) return;
    
    const updatedMeals = [...nutritionPlan.meals];
    updatedMeals[mealIndex].completed = true;
    
    setNutritionPlan({
      ...nutritionPlan,
      meals: updatedMeals
    });
    
    const newConsumedCalories = consumedCalories + updatedMeals[mealIndex].calories;
    setConsumedCalories(newConsumedCalories);
    
    Alert.alert('Refeição Registrada!', 'Refeição marcada como concluída.');
  };

  const addWater = () => {
    setWaterIntake(prev => Math.min(prev + 0.25, 4.0));
  };

  const getCaloriesProgress = () => {
    if (!nutritionPlan) return 0;
    return (consumedCalories / nutritionPlan.daily_calories) * 100;
  };

  const getProteinProgress = () => {
    if (!nutritionPlan) return 0;
    const consumedProtein = 142; // Mock data
    return (consumedProtein / nutritionPlan.daily_protein) * 100;
  };

  const getCarbsProgress = () => {
    if (!nutritionPlan) return 0;
    const consumedCarbs = 198; // Mock data
    return (consumedCarbs / nutritionPlan.daily_carbs) * 100;
  };

  const getFatsProgress = () => {
    if (!nutritionPlan) return 0;
    const consumedFats = 67; // Mock data
    return (consumedFats / nutritionPlan.daily_fats) * 100;
  };

  const getWaterProgress = () => {
    return (waterIntake / 3.0) * 100;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando plano nutricional...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nutrição</Text>
        <Text style={styles.subtitle}>Acompanhe sua alimentação</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Daily Overview */}
        <View style={styles.overviewContainer}>
          <Text style={styles.sectionTitle}>Resumo Diário</Text>
          
          <View style={styles.caloriesCard}>
            <View style={styles.caloriesHeader}>
              <Text style={styles.caloriesTitle}>Calorias</Text>
              <Text style={styles.caloriesNumbers}>
                {consumedCalories} / {nutritionPlan?.daily_calories} kcal
              </Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { 
                    width: `${Math.min(getCaloriesProgress(), 100)}%`,
                    backgroundColor: getCaloriesProgress() > 100 ? '#EF4444' : '#8B5CF6'
                  }
                ]} />
              </View>
              <Text style={styles.progressText}>
                {Math.round(getCaloriesProgress())}% da meta
              </Text>
            </View>
          </View>

          {/* Macronutrients */}
          <View style={styles.macrosContainer}>
            <View style={styles.macroCard}>
              <Text style={styles.macroName}>Proteínas</Text>
              <Text style={styles.macroValue}>142g / {nutritionPlan?.daily_protein}g</Text>
              <View style={styles.macroProgress}>
                <View style={[
                  styles.macroProgressFill,
                  { 
                    width: `${Math.min(getProteinProgress(), 100)}%`,
                    backgroundColor: '#22C55E'
                  }
                ]} />
              </View>
              <Text style={styles.macroPercent}>{Math.round(getProteinProgress())}%</Text>
            </View>

            <View style={styles.macroCard}>
              <Text style={styles.macroName}>Carboidratos</Text>
              <Text style={styles.macroValue}>198g / {nutritionPlan?.daily_carbs}g</Text>
              <View style={styles.macroProgress}>
                <View style={[
                  styles.macroProgressFill,
                  { 
                    width: `${Math.min(getCarbsProgress(), 100)}%`,
                    backgroundColor: '#F59E0B'
                  }
                ]} />
              </View>
              <Text style={styles.macroPercent}>{Math.round(getCarbsProgress())}%</Text>
            </View>

            <View style={styles.macroCard}>
              <Text style={styles.macroName}>Gorduras</Text>
              <Text style={styles.macroValue}>67g / {nutritionPlan?.daily_fats}g</Text>
              <View style={styles.macroProgress}>
                <View style={[
                  styles.macroProgressFill,
                  { 
                    width: `${Math.min(getFatsProgress(), 100)}%`,
                    backgroundColor: '#EF4444'
                  }
                ]} />
              </View>
              <Text style={styles.macroPercent}>{Math.round(getFatsProgress())}%</Text>
            </View>
          </View>

          {/* Water Intake */}
          <View style={styles.waterCard}>
            <View style={styles.waterHeader}>
              <Ionicons name="water" size={24} color="#3B82F6" />
              <Text style={styles.waterTitle}>Hidratação</Text>
              <TouchableOpacity style={styles.addWaterButton} onPress={addWater}>
                <Ionicons name="add" size={20} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            <Text style={styles.waterAmount}>{waterIntake.toFixed(1)}L / 3.0L</Text>
            <View style={styles.waterProgress}>
              <View style={[
                styles.waterProgressFill,
                { 
                  width: `${Math.min(getWaterProgress(), 100)}%`,
                  backgroundColor: '#3B82F6'
                }
              ]} />
            </View>
          </View>
        </View>

        {/* Meal Plan */}
        <View style={styles.mealsContainer}>
          <Text style={styles.sectionTitle}>Plano Alimentar</Text>
          
          {nutritionPlan?.meals.map((meal, index) => (
            <View key={index} style={[
              styles.mealCard,
              meal.completed && styles.mealCardCompleted
            ]}>
              <View style={styles.mealHeader}>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.mealTime}>{meal.time}</Text>
                </View>
                <View style={styles.mealCalories}>
                  <Text style={styles.mealCaloriesText}>{meal.calories} kcal</Text>
                </View>
              </View>
              
              <View style={styles.mealFoods}>
                {meal.foods.map((food: string, foodIndex: number) => (
                  <Text key={foodIndex} style={styles.foodItem}>• {food}</Text>
                ))}
              </View>
              
              <View style={styles.mealActions}>
                {meal.completed ? (
                  <View style={styles.completedMeal}>
                    <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                    <Text style={styles.completedMealText}>Concluída</Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.completeMealButton}
                    onPress={() => markMealAsCompleted(index)}
                  >
                    <Text style={styles.completeMealButtonText}>Marcar como Concluída</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Nutritionist Section */}
        <View style={styles.nutritionistContainer}>
          <Text style={styles.sectionTitle}>Orientações da Nutricionista</Text>
          
          <View style={styles.nutritionistCard}>
            <View style={styles.nutritionistHeader}>
              <View style={styles.nutritionistAvatar}>
                <Text style={styles.nutritionistAvatarText}>AC</Text>
              </View>
              <View style={styles.nutritionistInfo}>
                <Text style={styles.nutritionistName}>Dra. Ana Carolina</Text>
                <Text style={styles.nutritionistTitle}>Nutricionista Esportiva</Text>
              </View>
            </View>
            
            <View style={styles.nutritionistMessage}>
              <Text style={styles.messageText}>
                "Parabéns pelo progresso! Continue mantendo a consistência nas refeições. 
                Lembre-se de beber água ao longo do dia e não pular o café da manhã."
              </Text>
            </View>
            
            <View style={styles.nutritionistActions}>
              <TouchableOpacity style={styles.scheduleButton}>
                <Ionicons name="calendar" size={16} color="#8B5CF6" />
                <Text style={styles.scheduleButtonText}>Próxima Consulta: 25/01</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.messageButton}>
                <Ionicons name="chatbubble" size={16} color="#22C55E" />
                <Text style={styles.messageButtonText}>Enviar Mensagem</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Supplements */}
        <View style={styles.supplementsContainer}>
          <Text style={styles.sectionTitle}>Suplementação</Text>
          
          {nutritionPlan?.supplements.map((supplement, index) => (
            <View key={index} style={styles.supplementCard}>
              <View style={styles.supplementInfo}>
                <Text style={styles.supplementName}>{supplement.name}</Text>
                <Text style={styles.supplementDosage}>{supplement.dosage} - {supplement.time}</Text>
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.supplementCheck,
                  supplement.completed && styles.supplementCheckCompleted
                ]}
              >
                {supplement.completed && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.sectionTitle}>Dicas Nutricionais</Text>
          <View style={styles.tipsCard}>
            <View style={styles.tip}>
              <Ionicons name="time" size={20} color="#8B5CF6" />
              <Text style={styles.tipText}>Faça refeições a cada 3-4 horas</Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="restaurant" size={20} color="#22C55E" />
              <Text style={styles.tipText}>Inclua proteína em todas as refeições</Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="leaf" size={20} color="#F59E0B" />
              <Text style={styles.tipText}>Consuma pelo menos 5 porções de frutas/vegetais</Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="water" size={20} color="#3B82F6" />
              <Text style={styles.tipText}>Beba água antes, durante e após exercícios</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  overviewContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  caloriesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  caloriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  caloriesTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  caloriesNumbers: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  macroCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
  },
  macroName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  macroValue: {
    color: '#94A3B8',
    fontSize: 10,
    marginBottom: 8,
  },
  macroProgress: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 4,
  },
  macroProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  macroPercent: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  waterCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  waterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  waterTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  addWaterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterAmount: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  waterProgress: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
  },
  waterProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  mealsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  mealCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  mealCardCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mealTime: {
    color: '#94A3B8',
    fontSize: 12,
  },
  mealCalories: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mealCaloriesText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
  },
  mealFoods: {
    marginBottom: 16,
  },
  foodItem: {
    color: '#A1A1AA',
    fontSize: 12,
    marginBottom: 2,
  },
  mealActions: {
    alignItems: 'center',
  },
  completedMeal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedMealText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  completeMealButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeMealButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  nutritionistContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  nutritionistCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  nutritionistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nutritionistAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nutritionistAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nutritionistInfo: {
    flex: 1,
  },
  nutritionistName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  nutritionistTitle: {
    color: '#94A3B8',
    fontSize: 12,
  },
  nutritionistMessage: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  messageText: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  nutritionistActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scheduleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingVertical: 8,
    borderRadius: 8,
  },
  scheduleButtonText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingVertical: 8,
    borderRadius: 8,
  },
  messageButtonText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  supplementsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  supplementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  supplementInfo: {
    flex: 1,
  },
  supplementName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  supplementDosage: {
    color: '#94A3B8',
    fontSize: 12,
  },
  supplementCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supplementCheckCompleted: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  tipsContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  tipsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipText: {
    color: '#94A3B8',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
});