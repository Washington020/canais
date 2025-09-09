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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface SupplementLog {
  id: string;
  supplement_name: string;
  scheduled_time: string;
  status: 'pending' | 'taken' | 'missed';
  taken_at?: string;
}

interface SupplementPlan {
  id: string;
  supplements: any[];
  start_date: string;
  created_at: string;
}

interface AppointmentSlot {
  id: string;
  date: string;
  professional_type: string;
}

export default function Nutrition() {
  const [supplementPlan, setSupplementPlan] = useState<SupplementPlan | null>(null);
  const [todaySupplements, setTodaySupplements] = useState<SupplementLog[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userPlan, setUserPlan] = useState('basic');
  
  const router = useRouter();

  useEffect(() => {
    loadSupplementPlan();
    loadAvailableSlots();
  }, []);

  const loadSupplementPlan = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/client/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Get user profile to check plan
      const profileResponse = await axios.get(`${API_URL}/users/profile`, { headers });
      const currentPlan = profileResponse.data.plan || 'basic';
      setUserPlan(currentPlan);

      // Get supplement plan
      const response = await axios.get(`${API_URL}/supplements/user/plan`, { headers });
      
      if (response.data.plan) {
        setSupplementPlan(response.data.plan);
        setTodaySupplements(response.data.today_supplements || []);
      }
      
    } catch (error: any) {
      console.error('Error loading supplement plan:', error);
      if (error.response?.status === 401) {
        router.replace('/client/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAvailableSlots = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/appointments/available-slots?professional_type=nutritionist`, { headers });
      
      setAvailableSlots(response.data.slots || []);
    } catch (error: any) {
      console.error('Error loading slots:', error);
      // Don't show error for basic plan users
      if (error.response?.status !== 403) {
        console.error('Unexpected error:', error);
      }
    }
  };

  const markSupplementTaken = async (logId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`${API_URL}/supplements/log/${logId}/take`, {}, { headers });
      
      // Update local state
      setTodaySupplements(prev => 
        prev.map(supplement => 
          supplement.id === logId 
            ? { ...supplement, status: 'taken', taken_at: new Date().toISOString() }
            : supplement
        )
      );
      
      Alert.alert('✅ Suplemento Registrado', 'Suplemento marcado como tomado!');
    } catch (error: any) {
      console.error('Error marking supplement:', error);
      Alert.alert('Erro', 'Não foi possível registrar o suplemento');
    }
  };

  const scheduleAppointment = async (slotId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const slot = availableSlots.find(s => s.id === slotId);
      if (!slot) return;

      const appointmentData = {
        appointment_type: 'nutritionist',
        appointment_date: slot.date,
        notes: 'Consulta nutricional agendada via app'
      };

      await axios.post(`${API_URL}/appointments/request`, appointmentData, { headers });
      
      Alert.alert(
        '📅 Consulta Agendada!', 
        `Sua consulta com a nutricionista foi agendada para ${new Date(slot.date).toLocaleDateString('pt-BR')} às ${new Date(slot.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
      );
      
      // Reload slots
      loadAvailableSlots();
    } catch (error: any) {
      console.error('Error scheduling appointment:', error);
      if (error.response?.status === 400) {
        Alert.alert('Erro', error.response.data.detail);
      } else {
        Alert.alert('Erro', 'Não foi possível agendar a consulta');
      }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSupplementPlan();
    loadAvailableSlots();
  };

  const getSupplementsForToday = () => {
    const now = new Date();
    const today = now.toDateString();
    
    return todaySupplements.filter(supplement => {
      const supplementDate = new Date(supplement.scheduled_time).toDateString();
      return supplementDate === today;
    });
  };

  const getSupplementStatus = (supplement: SupplementLog) => {
    const now = new Date();
    const scheduledTime = new Date(supplement.scheduled_time);
    
    if (supplement.status === 'taken') {
      return { color: '#22C55E', text: 'Tomado', icon: 'checkmark-circle' };
    } else if (now > scheduledTime) {
      return { color: '#EF4444', text: 'Atrasado', icon: 'alert-circle' };
    } else {
      return { color: '#F59E0B', text: 'Pendente', icon: 'time' };
    }
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

  const todaySupplementsList = getSupplementsForToday();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Suplementação</Text>
        <Text style={styles.subtitle}>Acompanhe sua suplementação diária</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Supplements */}
        <View style={styles.todayContainer}>
          <Text style={styles.sectionTitle}>📋 Hoje - {new Date().toLocaleDateString('pt-BR')}</Text>
          
          {!supplementPlan ? (
            <View style={styles.noSupplementsCard}>
              <Ionicons name="restaurant-outline" size={48} color="#64748B" />
              <Text style={styles.noSupplementsTitle}>Nenhum Plano de Suplementação</Text>
              <Text style={styles.noSupplementsText}>
                Você ainda não possui um plano de suplementação ativo. Agende uma consulta com nossa nutricionista para criar seu plano personalizado.
              </Text>
              {userPlan === 'basic' && (
                <TouchableOpacity 
                  style={styles.upgradeButton}
                  onPress={() => router.push('/client/(tabs)/financial')}
                >
                  <Text style={styles.upgradeButtonText}>Upgrade para Premium/VIP</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : todaySupplementsList.length === 0 ? (
            <View style={styles.noSupplementsTodayCard}>
              <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
              <Text style={styles.noSupplementsTodayText}>Nenhum suplemento programado para hoje!</Text>
            </View>
          ) : (
            <View style={styles.supplementsList}>
              {todaySupplementsList.map((supplement) => {
                const status = getSupplementStatus(supplement);
                return (
                  <View key={supplement.id} style={styles.supplementCard}>
                    <View style={styles.supplementHeader}>
                      <View style={styles.supplementInfo}>
                        <Text style={styles.supplementName}>{supplement.supplement_name}</Text>
                        <Text style={styles.supplementTime}>
                          {new Date(supplement.scheduled_time).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                      
                      <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
                        <Ionicons name={status.icon as any} size={16} color={status.color} />
                        <Text style={[styles.statusText, { color: status.color }]}>
                          {status.text}
                        </Text>
                      </View>
                    </View>
                    
                    {supplement.status === 'pending' && (
                      <TouchableOpacity 
                        style={styles.takeSupplementButton}
                        onPress={() => markSupplementTaken(supplement.id)}
                      >
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        <Text style={styles.takeSupplementText}>Marcar como Tomado</Text>
                      </TouchableOpacity>
                    )}
                    
                    {supplement.taken_at && (
                      <Text style={styles.takenAtText}>
                        Tomado em: {new Date(supplement.taken_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Nutritionist Consultation */}
        <View style={styles.consultationContainer}>
          <Text style={styles.sectionTitle}>👩‍⚕️ Orientações da Nutricionista</Text>
          
          <View style={styles.consultationCard}>
            <View style={styles.nutritionistHeader}>
              <View style={styles.nutritionistAvatar}>
                <Text style={styles.nutritionistAvatarText}>DR</Text>
              </View>
              <View style={styles.nutritionistInfo}>
                <Text style={styles.nutritionistName}>Dra. Roberta Silva</Text>
                <Text style={styles.nutritionistTitle}>Nutricionista Esportiva - CRN 12345</Text>
              </View>
            </View>
            
            <View style={styles.consultationMessage}>
              <Text style={styles.messageText}>
                "Olá! Para ter um plano de suplementação personalizado, é importante agendar uma consulta. 
                Vamos avaliar suas necessidades individuais e criar um protocolo adequado para seus objetivos."
              </Text>
            </View>
            
            {userPlan === 'basic' ? (
              <View style={styles.upgradeSection}>
                <Text style={styles.upgradeText}>
                  Agendamentos disponíveis para planos Premium e VIP
                </Text>
                <TouchableOpacity 
                  style={styles.upgradeButton}
                  onPress={() => router.push('/client/(tabs)/financial')}
                >
                  <Ionicons name="arrow-up-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.upgradeButtonText}>Fazer Upgrade</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.appointmentSection}>
                <Text style={styles.appointmentTitle}>Horários Disponíveis</Text>
                
                {availableSlots.length === 0 ? (
                  <Text style={styles.noSlotsText}>
                    Nenhum horário disponível no momento. Tente novamente mais tarde.
                  </Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slotsScroll}>
                    {availableSlots.slice(0, 5).map((slot) => (
                      <TouchableOpacity 
                        key={slot.id}
                        style={styles.slotCard}
                        onPress={() => scheduleAppointment(slot.id)}
                      >
                        <Text style={styles.slotDate}>
                          {new Date(slot.date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short'
                          })}
                        </Text>
                        <Text style={styles.slotTime}>
                          {new Date(slot.date).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                
                <TouchableOpacity style={styles.messageNutritionistButton}>
                  <Ionicons name="chatbubble" size={16} color="#22C55E" />
                  <Text style={styles.messageNutritionistText}>Enviar Mensagem</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Supplement Plan Details */}
        {supplementPlan && (
          <View style={styles.planDetailsContainer}>
            <Text style={styles.sectionTitle}>📊 Detalhes do Plano</Text>
            
            <View style={styles.planDetailsCard}>
              <View style={styles.planInfo}>
                <Text style={styles.planStartDate}>
                  Iniciado em: {new Date(supplementPlan.start_date).toLocaleDateString('pt-BR')}
                </Text>
                <Text style={styles.planCreatedDate}>
                  Criado em: {new Date(supplementPlan.created_at).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              
              <View style={styles.supplementsOverview}>
                <Text style={styles.overviewTitle}>Suplementos no Plano:</Text>
                {supplementPlan.supplements.map((supplement, index) => (
                  <View key={index} style={styles.overviewItem}>
                    <Text style={styles.overviewSupplementName}>{supplement.name}</Text>
                    <Text style={styles.overviewSupplementDetails}>
                      {supplement.dosage} - {supplement.timings?.join(', ') || 'Conforme orientação'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.sectionTitle}>💡 Dicas de Suplementação</Text>
          <View style={styles.tipsCard}>
            <View style={styles.tip}>
              <Ionicons name="time" size={20} color="#8B5CF6" />
              <Text style={styles.tipText}>Mantenha horários regulares para máxima eficácia</Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="water" size={20} color="#3B82F6" />
              <Text style={styles.tipText}>Sempre tome com água, nunca com outros líquidos</Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="restaurant" size={20} color="#22C55E" />
              <Text style={styles.tipText}>Alguns suplementos são melhores com alimentos</Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="alarm" size={20} color="#F59E0B" />
              <Text style={styles.tipText}>Configure lembretes para não esquecer</Text>
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