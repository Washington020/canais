import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  plan_type: string;
  subscription_end?: string;
}

interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  description: string;
}

interface WorkoutPlan {
  id: string;
  title: string;
  professional_name: string;
  duration_days: number;
  difficulty: string;
  workout_days: any[];
  created_at: string;
}

export default function Workouts() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/client/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Load user profile
      const profileResponse = await axios.get(`${API_URL}/users/profile`, { headers });
      const userProfile = profileResponse.data;
      setUser(userProfile);

      // Load payment plans
      const plansResponse = await axios.get(`${API_URL}/payments/plans`, { headers });
      setPlans(plansResponse.data || []);

      // If not basic user, load workout plans
      if (userProfile.plan_type !== 'basic') {
        try {
          const workoutsResponse = await axios.get(`${API_URL}/users/workout-plans`, { headers });
          setWorkoutPlans(workoutsResponse.data.workout_plans || []);
        } catch (error) {
          console.error('Error loading workout plans:', error);
          setWorkoutPlans([]);
        }
      }

    } catch (error: any) {
      console.error('Error loading user data:', error);
      if (error.response?.status === 401) {
        router.replace('/client/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: PaymentPlan) => {
    try {
      if (!user) return;

      Alert.alert(
        'Confirmar Upgrade',
        `Deseja fazer upgrade para o ${plan.name}?\n\nValor: R$ ${plan.price.toFixed(2).replace('.', ',')}\n\n⚠️ O pagamento será cobrado imediatamente, mas o plano entrará em vigor apenas no próximo mês.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            onPress: async () => {
              try {
                const token = await AsyncStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };

                const upgradeData = {
                  new_plan: plan.id,
                  current_plan: user.plan_type,
                  effective_date: 'next_month'
                };

                await axios.post(`${API_URL}/users/request-upgrade`, upgradeData, { headers });

                Alert.alert(
                  'Solicitação Enviada!',
                  `Sua solicitação de upgrade para ${plan.name} foi enviada para aprovação.\n\nO pagamento será processado e o plano entrará em vigor no próximo mês.\n\nVocê receberá uma confirmação em breve.`,
                  [{ text: 'OK', onPress: () => setShowUpgradeModal(false) }]
                );
              } catch (error: any) {
                console.error('Error requesting upgrade:', error);
                Alert.alert('Erro', 'Não foi possível processar a solicitação de upgrade');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleUpgrade:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toFixed(2).replace('.', ',');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Basic user - show upgrade options
  if (user?.plan_type === 'basic') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="fitness" size={28} color="#F59E0B" />
            <Text style={styles.title}>Treino Personalizado</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current Plan Info */}
          <View style={styles.currentPlanCard}>
            <View style={styles.planHeader}>
              <Ionicons name="person-circle" size={32} color="#64748B" />
              <View style={styles.planInfo}>
                <Text style={styles.currentPlanTitle}>Plano Atual: Básico</Text>
                <Text style={styles.currentPlanSubtitle}>Acesso limitado às funcionalidades</Text>
              </View>
            </View>
          </View>

          {/* Upgrade Banner */}
          <View style={styles.upgradeBanner}>
            <View style={styles.upgradeIconContainer}>
              <Ionicons name="fitness" size={40} color="#F59E0B" />
            </View>
            <View style={styles.upgradeContent}>
              <Text style={styles.upgradeTitle}>Treinos Personalizados</Text>
              <Text style={styles.upgradeDescription}>
                Tenha acesso a treinos criados especialmente para você por personal trainers qualificados.
              </Text>
              
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={styles.benefitText}>Treinos personalizados</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={styles.benefitText}>Acompanhamento profissional</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={styles.benefitText}>Ajuste de exercícios</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={styles.benefitText}>Progressão monitorada</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={() => setShowUpgradeModal(true)}
              >
                <Ionicons name="arrow-up-circle" size={20} color="#FFFFFF" />
                <Text style={styles.upgradeButtonText}>Fazer Upgrade</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Feature Preview */}
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>O que você terá acesso:</Text>
            
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Ionicons name="barbell" size={24} color="#F59E0B" />
                <Text style={styles.previewCardTitle}>Planos Intermediário</Text>
              </View>
              <Text style={styles.previewPrice}>R$ 49,90/mês</Text>
              <View style={styles.previewFeatures}>
                <Text style={styles.previewFeature}>• 1 consulta mensal com Personal Trainer</Text>
                <Text style={styles.previewFeature}>• Treinos personalizados</Text>
                <Text style={styles.previewFeature}>• Agendamento de sessões</Text>
                <Text style={styles.previewFeature}>• 30 tokens mensais</Text>
              </View>
            </View>

            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Ionicons name="trophy" size={24} color="#8B5CF6" />
                <Text style={styles.previewCardTitle}>Plano VIP</Text>
              </View>
              <Text style={styles.previewPrice}>R$ 99,90/mês</Text>
              <View style={styles.previewFeatures}>
                <Text style={styles.previewFeature}>• 2 consultas mensais com Personal Trainer</Text>
                <Text style={styles.previewFeature}>• Treinos avançados personalizados</Text>
                <Text style={styles.previewFeature}>• Agendamento prioritário</Text>
                <Text style={styles.previewFeature}>• Tokens ilimitados</Text>
                <Text style={styles.previewFeature}>• Suporte 24/7</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Upgrade Modal */}
        <Modal
          visible={showUpgradeModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowUpgradeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Escolha seu Plano</Text>
                <TouchableOpacity onPress={() => setShowUpgradeModal(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {plans.filter(plan => plan.id !== 'basic').map((plan) => (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planCard,
                      plan.id === 'vip' && styles.planCardVip
                    ]}
                    onPress={() => handleUpgrade(plan)}
                  >
                    <View style={styles.planCardHeader}>
                      <Text style={styles.planCardTitle}>{plan.name}</Text>
                      <Text style={styles.planCardPrice}>
                        R$ {formatCurrency(plan.price)}/mês
                      </Text>
                    </View>
                    
                    <Text style={styles.planCardDescription}>{plan.description}</Text>
                    
                    <View style={styles.planFeatures}>
                      {plan.features.map((feature, index) => (
                        <View key={index} style={styles.planFeature}>
                          <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                          <Text style={styles.planFeatureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.planCardFooter}>
                      <Text style={styles.planCardNote}>
                        💡 Vigência a partir do próximo mês
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Non-basic users - show workout plans
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="fitness" size={28} color="#F59E0B" />
          <Text style={styles.title}>Meus Treinos</Text>
        </View>
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>
            {user?.plan_type?.toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {workoutPlans.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color="#64748B" />
            <Text style={styles.emptyTitle}>Nenhum treino disponível</Text>
            <Text style={styles.emptyDescription}>
              Seus treinos personalizados aparecerão aqui quando criados pelo seu personal trainer.
            </Text>
          </View>
        ) : (
          workoutPlans.map((workout) => (
            <View key={workout.id} style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutTitle}>{workout.title}</Text>
                  <Text style={styles.workoutTrainer}>
                    Personal: {workout.professional_name}
                  </Text>
                </View>
                <View style={styles.workoutMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar" size={16} color="#F59E0B" />
                    <Text style={styles.metaText}>{workout.duration_days} dias</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="fitness" size={16} color="#F59E0B" />
                    <Text style={styles.metaText}>{workout.difficulty}</Text>
                  </View>
                </View>
              </View>
              
              <Text style={styles.workoutDays}>
                {workout.workout_days.length} dias de treino programados
              </Text>
              
              <TouchableOpacity style={styles.viewWorkoutButton}>
                <Ionicons name="play-circle" size={18} color="#F59E0B" />
                <Text style={styles.viewWorkoutText}>Ver Treino</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  planBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  currentPlanCard: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planInfo: {
    marginLeft: 12,
  },
  currentPlanTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  currentPlanSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 2,
  },
  upgradeBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  upgradeIconContainer: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  upgradeContent: {
    alignItems: 'center',
  },
  upgradeTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  upgradeDescription: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  benefitsList: {
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  previewSection: {
    marginBottom: 32,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  previewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewCardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  previewPrice: {
    color: '#22C55E',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  previewFeatures: {
    marginTop: 8,
  },
  previewFeature: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#0B0D17',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalScroll: {
    padding: 20,
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  planCardVip: {
    borderColor: 'rgba(139, 92, 246, 0.3)',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planCardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  planCardPrice: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: 'bold',
  },
  planCardDescription: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 16,
  },
  planFeatures: {
    marginBottom: 16,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planFeatureText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
  },
  planCardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  planCardNote: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptyDescription: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  workoutCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  workoutTrainer: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4,
  },
  workoutMeta: {
    alignItems: 'flex-end',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    color: '#F59E0B',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  workoutDays: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 16,
  },
  viewWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  viewWorkoutText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});