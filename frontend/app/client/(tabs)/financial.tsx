import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_days: number;
  features: string[];
  token_limit: number;
  description: string;
}

interface Transaction {
  id: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  payment_status: string;
  payment_method: string;
  created_at: string;
  session_id: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  subscription_end?: string;
}

export default function Financial() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  
  const router = useRouter();
  const params = useLocalSearchParams();

  // Helper function to ensure we always have a valid array
  const ensureArray = (data: any): any[] => {
    return Array.isArray(data) ? data : [];
  };

  // Helper function to safely find a plan
  const findPlan = (planId: string | undefined) => {
    if (!planId) return null;
    return ensureArray(plans).find(p => p.id === planId);
  };

  // Check for payment return (from Stripe)
  useEffect(() => {
    if (params.session_id) {
      checkPaymentStatus(params.session_id as string);
    }
  }, [params.session_id]);

  const loadData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/client/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Load payment plans
      const plansResponse = await axios.get(`${API_URL}/payments/plans`, { headers });
      const plansData = plansResponse.data;
      setPlans(Array.isArray(plansData) ? plansData : []);

      // Load user transactions
      const transactionsResponse = await axios.get(`${API_URL}/payments/user/transactions`, { headers });
      const transactionsData = transactionsResponse.data;
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);

      // Load user profile
      const profileResponse = await axios.get(`${API_URL}/users/profile`, { headers });
      setUserProfile(profileResponse.data);

    } catch (error: any) {
      console.error('Erro ao carregar dados financeiros:', error);
      if (error.response?.status === 401) {
        router.replace('/client/login');
      }
      // Set fallback values to prevent crashes
      setPlans([]);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  const subscribeToPlan = useCallback(async (planId: string, paymentMethod: string = 'stripe') => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Get origin URL for success/cancel redirects
      const originUrl = Platform.OS === 'web' 
        ? window.location.origin 
        : 'https://luxepass-app.com'; // fallback for mobile

      const checkoutData = {
        plan_id: planId,
        origin_url: originUrl,
        payment_method: paymentMethod
      };

      let response;
      
      if (paymentMethod === 'stripe') {
        // Use Stripe for international payments
        response = await axios.post(
          `${API_URL}/payments/checkout/session`,
          checkoutData,
          { headers }
        );
        
        const { url, plan_name } = response.data;

        Alert.alert(
          'Confirmar Assinatura',
          `Você será redirecionado para completar o pagamento do ${plan_name} via cartão de crédito.`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Continuar',
              onPress: () => {
                if (Platform.OS === 'web') {
                  window.location.href = url;
                } else {
                  Linking.openURL(url);
                }
                setShowPlansModal(false);
              }
            }
          ]
        );
      } else {
        // Use Pagar.me for Brazilian payments (PIX, Boleto)
        response = await axios.post(
          `${API_URL}/payments/pagarme/checkout/session`,
          checkoutData,
          { headers }
        );
        
        const { order_id, plan_name, payment_method: method } = response.data;
        
        // Show success message and handle different payment methods
        let message = '';
        if (method === 'pix') {
          message = `Pagamento PIX criado para ${plan_name}. Use o código QR ou chave PIX para finalizar o pagamento.`;
        } else if (method === 'boleto') {
          message = `Boleto gerado para ${plan_name}. Você pode pagar em qualquer banco ou lotérica.`;
        }

        Alert.alert(
          '🇧🇷 Pagamento Brasileiro',
          message,
          [
            { text: 'OK', onPress: () => {
              setShowPlansModal(false);
              // Start polling for payment status
              checkPaymentStatus(order_id, true); // true for Pagar.me
            }}
          ]
        );
      }

    } catch (error: any) {
      console.error('Erro ao criar sessão de checkout:', error);
      Alert.alert(
        'Erro no Pagamento',
        error.response?.data?.detail || 'Não foi possível processar o pagamento. Tente novamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPaymentStatus = useCallback(async (sessionId: string, isPagarme: boolean = false) => {
    if (checkingPayment) return;
    
    setCheckingPayment(true);
    let attempts = 0;
    const maxAttempts = 10;
    const pollInterval = 3000; // 3 seconds for better UX

    const pollStatus = async () => {
      if (attempts >= maxAttempts) {
        setCheckingPayment(false);
        Alert.alert(
          'Verificação de Pagamento',
          'Não foi possível verificar o status do pagamento. Por favor, verifique seu histórico de transações.',
          [{ text: 'OK', onPress: () => loadData() }]
        );
        return;
      }

      try {
        const token = await AsyncStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        let response;
        if (isPagarme) {
          response = await axios.get(`${API_URL}/payments/pagarme/order/${sessionId}`, { headers });
        } else {
          response = await axios.get(`${API_URL}/payments/checkout/status/${sessionId}`, { headers });
        }
        
        const data = response.data;

        let paymentCompleted = false;
        if (isPagarme) {
          paymentCompleted = data.payment_completed === true;
        } else {
          paymentCompleted = data.payment_status === 'paid';
        }

        if (paymentCompleted) {
          setCheckingPayment(false);
          const paymentMethod = isPagarme ? 
            (data.payment_method === 'pix' ? 'PIX' : 
             data.payment_method === 'boleto' ? 'Boleto' : 'Pagar.me') : 
            'Cartão de Crédito';
            
          Alert.alert(
            '🎉 Pagamento Confirmado!',
            `Sua assinatura do ${data.plan_name} foi ativada com sucesso via ${paymentMethod}!`,
            [{ text: 'Excelente!', onPress: () => loadData() }]
          );
          return;
        } else if (data.status === 'expired' || data.status === 'canceled') {
          setCheckingPayment(false);
          Alert.alert(
            'Pagamento Expirado',
            'O pagamento expirou ou foi cancelado. Tente novamente.',
            [{ text: 'OK', onPress: () => loadData() }]
          );
          return;
        }

        // Continue polling if still pending
        attempts++;
        setTimeout(pollStatus, pollInterval);
      } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error);
        attempts++;
        setTimeout(pollStatus, pollInterval);
      }
    };

    pollStatus();
  }, [checkingPayment, loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'vip': return '#FFD700';
      case 'premium': return '#8B5CF6';
      default: return '#22C55E';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#22C55E';
      case 'pending': return '#F59E0B';
      case 'failed': return '#EF4444';
      default: return '#94A3B8';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'failed': return 'Falhou';
      default: return 'Desconhecido';
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando dados financeiros...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Financeiro</Text>
        <Text style={styles.subtitle}>Gerencie sua assinatura e pagamentos</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Current Plan Overview */}
        <View style={styles.overviewContainer}>
          <Text style={styles.sectionTitle}>Sua Assinatura</Text>
          
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>
                  Plano {userProfile?.plan === 'vip' ? 'VIP' : 
                         userProfile?.plan === 'premium' ? 'Premium' : 'Básico'}
                </Text>
                <Text style={styles.planPrice}>
                  {findPlan(userProfile?.plan)?.price ? 
                    formatCurrency(findPlan(userProfile?.plan)!.price) :
                    'R$ 0,00'
                  }/mês
                </Text>
              </View>
              <View style={[styles.planBadge, { 
                backgroundColor: `${getPlanColor(userProfile?.plan || 'basic')}20` 
              }]}>
                <Text style={[styles.planBadgeText, { 
                  color: getPlanColor(userProfile?.plan || 'basic') 
                }]}>
                  {userProfile?.status === 'active' ? 'ATIVO' : 'INATIVO'}
                </Text>
              </View>
            </View>
            
            <View style={styles.planDetails}>
              <View style={styles.planDetail}>
                <Ionicons name="card" size={16} color="#8B5CF6" />
                <Text style={styles.planDetailText}>
                  Status: {userProfile?.status === 'active' ? 'Em dia' : 'Pendente'}
                </Text>
              </View>
              {userProfile?.subscription_end && (
                <View style={styles.planDetail}>
                  <Ionicons name="calendar" size={16} color="#8B5CF6" />
                  <Text style={styles.planDetailText}>
                    Próximo vencimento: {formatDate(userProfile.subscription_end)}
                  </Text>
                </View>
              )}
              <View style={styles.planDetail}>
                <Ionicons name="person" size={16} color="#8B5CF6" />
                <Text style={styles.planDetailText}>
                  {userProfile?.name || 'Usuário LuxePass'}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.changePlanButton}
              onPress={() => setShowPlansModal(true)}
            >
              <Text style={styles.changePlanButtonText}>
                {userProfile?.plan ? 'Alterar Plano' : 'Escolher Plano'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Status */}
        {checkingPayment && (
          <View style={styles.paymentStatusContainer}>
            <View style={styles.paymentStatusCard}>
              <ActivityIndicator size="small" color="#8B5CF6" />
              <Text style={styles.paymentStatusText}>
                Verificando status do pagamento...
              </Text>
            </View>
          </View>
        )}

        {/* Payment History */}
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>Histórico de Pagamentos</Text>
          
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>Nenhuma transação encontrada</Text>
              <Text style={styles.emptySubtext}>
                Suas transações aparecerão aqui após a primeira compra
              </Text>
            </View>
          ) : (
            transactions.map((transaction) => (
              <View key={transaction.id} style={styles.historyItem}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyDate}>
                    {formatDate(transaction.created_at)}
                  </Text>
                  <Text style={styles.historyPlan}>
                    {transaction.plan_name}
                  </Text>
                  <Text style={styles.historyMethod}>
                    {transaction.payment_method === 'stripe' ? 'Cartão de Crédito' : 'PIX'}
                  </Text>
                </View>
                
                <View style={styles.historyAmount}>
                  <Text style={styles.historyAmountText}>
                    {formatCurrency(transaction.amount)}
                  </Text>
                  <View style={[
                    styles.historyStatus,
                    { backgroundColor: `${getStatusColor(transaction.payment_status)}20` }
                  ]}>
                    <Text style={[
                      styles.historyStatusText,
                      { color: getStatusColor(transaction.payment_status) }
                    ]}>
                      {getStatusText(transaction.payment_status)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowPlansModal(true)}
          >
            <Ionicons name="card" size={20} color="#8B5CF6" />
            <Text style={styles.actionButtonText}>Ver Planos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => loadData()}
          >
            <Ionicons name="refresh" size={20} color="#22C55E" />
            <Text style={styles.actionButtonText}>Atualizar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Plans Modal */}
      <Modal
        visible={showPlansModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPlansModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Escolher Plano</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowPlansModal(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              {(plans || []).map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.modalPlanCard,
                    plan.id === userProfile?.plan && styles.modalPlanCardCurrent,
                    plan.id === 'premium' && styles.modalPlanCardPopular
                  ]}
                  onPress={() => {
                    if (plan.id !== userProfile?.plan) {
                      subscribeToPlan(plan.id);
                    }
                  }}
                >
                  {plan.id === 'premium' && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>RECOMENDADO</Text>
                    </View>
                  )}
                  
                  <View style={styles.modalPlanHeader}>
                    <Text style={styles.modalPlanName}>{plan.name}</Text>
                    <Text style={styles.modalPlanPrice}>
                      {formatCurrency(plan.price)}/mês
                    </Text>
                    <Text style={styles.modalPlanDescription}>
                      {plan.description}
                    </Text>
                  </View>
                  
                  <View style={styles.modalPlanFeatures}>
                    {plan.features.map((feature, index) => (
                      <View key={index} style={styles.modalPlanFeature}>
                        <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                        <Text style={styles.modalPlanFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                  
                  {plan.id === userProfile?.plan ? (
                    <View style={styles.currentPlanIndicator}>
                      <Text style={styles.currentPlanText}>Plano Atual</Text>
                    </View>
                  ) : (
                    <View style={styles.paymentMethodsContainer}>
                      <Text style={styles.paymentMethodsTitle}>Escolha sua forma de pagamento:</Text>
                      
                      {/* Stripe Payment */}
                      <TouchableOpacity 
                        style={styles.paymentMethodButton}
                        onPress={() => subscribeToPlan(plan.id, 'stripe')}
                      >
                        <View style={styles.paymentMethodContent}>
                          <Ionicons name="card" size={20} color="#4285F4" />
                          <View style={styles.paymentMethodText}>
                            <Text style={styles.paymentMethodName}>Cartão de Crédito</Text>
                            <Text style={styles.paymentMethodDesc}>Visa, Mastercard, American Express</Text>
                          </View>
                          <Text style={styles.paymentMethodPrice}>
                            {formatCurrency(plan.price)}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* PIX Payment */}
                      <TouchableOpacity 
                        style={styles.paymentMethodButton}
                        onPress={() => subscribeToPlan(plan.id, 'pix')}
                      >
                        <View style={styles.paymentMethodContent}>
                          <View style={styles.pixIcon}>
                            <Text style={styles.pixText}>PIX</Text>
                          </View>
                          <View style={styles.paymentMethodText}>
                            <Text style={styles.paymentMethodName}>PIX</Text>
                            <Text style={styles.paymentMethodDesc}>Pagamento instantâneo via PIX</Text>
                          </View>
                          <Text style={styles.paymentMethodPrice}>
                            {formatCurrency(plan.price)}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Boleto Payment */}
                      <TouchableOpacity 
                        style={styles.paymentMethodButton}
                        onPress={() => subscribeToPlan(plan.id, 'boleto')}
                      >
                        <View style={styles.paymentMethodContent}>
                          <Ionicons name="receipt" size={20} color="#FF6B35" />
                          <View style={styles.paymentMethodText}>
                            <Text style={styles.paymentMethodName}>Boleto Bancário</Text>
                            <Text style={styles.paymentMethodDesc}>Vencimento em 3 dias úteis</Text>
                          </View>
                          <Text style={styles.paymentMethodPrice}>
                            {formatCurrency(plan.price)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Processando pagamento...</Text>
        </View>
      )}
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
    textAlign: 'center',
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
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  planPrice: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  planDetails: {
    marginBottom: 20,
  },
  planDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planDetailText: {
    color: '#94A3B8',
    fontSize: 14,
    marginLeft: 8,
  },
  changePlanButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  changePlanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentStatusContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  paymentStatusCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  paymentStatusText: {
    color: '#8B5CF6',
    fontSize: 14,
    marginLeft: 12,
  },
  historyContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyPlan: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 2,
  },
  historyMethod: {
    color: '#A1A1AA',
    fontSize: 10,
  },
  historyAmount: {
    alignItems: 'flex-end',
  },
  historyAmountText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  actionButtonText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 500,
    paddingHorizontal: 24,
  },
  modalPlanCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginVertical: 8,
    position: 'relative',
  },
  modalPlanCardCurrent: {
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  modalPlanCardPopular: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popularBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalPlanHeader: {
    marginBottom: 16,
  },
  modalPlanName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalPlanPrice: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalPlanDescription: {
    color: '#94A3B8',
    fontSize: 12,
  },
  modalPlanFeatures: {
    marginBottom: 16,
  },
  modalPlanFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalPlanFeatureText: {
    color: '#94A3B8',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  currentPlanIndicator: {
    backgroundColor: '#22C55E',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentPlanText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selectPlanButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectPlanText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentMethodsContainer: {
    marginTop: 8,
  },
  paymentMethodsTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  paymentMethodButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  paymentMethodText: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  paymentMethodDesc: {
    color: '#94A3B8',
    fontSize: 12,
  },
  paymentMethodPrice: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  pixIcon: {
    backgroundColor: '#32BCAD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  pixText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});