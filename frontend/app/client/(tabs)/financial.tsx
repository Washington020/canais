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
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
}

export default function Financial() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('premium');

  const plans: Plan[] = [
    {
      id: 'basic',
      name: 'Básico',
      price: 90.00,
      features: [
        '1 token de academia por dia',
        'Acesso a academias básicas',
        'App móvel',
        'Suporte básico'
      ]
    },
    {
      id: 'intermediate',
      name: 'Intermediário',
      price: 120.00,
      features: [
        '1 token de academia por dia',
        'Acesso a todas as academias',
        '1 consulta nutricional por mês',
        'App móvel com estatísticas',
        'Suporte prioritário'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 149.90,
      popular: true,
      features: [
        '2 tokens por dia (academia + nutricionista)',
        'Acesso a todas as academias',
        'Consultas nutricionais ilimitadas',
        'Personal trainer com IA',
        'App móvel completo',
        'Suporte 24/7',
        'Relatórios detalhados'
      ]
    }
  ];

  const paymentHistory = [
    {
      id: '1',
      date: '2025-01-20',
      amount: 149.90,
      plan: 'Premium',
      status: 'completed',
      method: 'Cartão **** 4532'
    },
    {
      id: '2',
      date: '2024-12-20',
      amount: 149.90,
      plan: 'Premium',
      status: 'completed',
      method: 'Cartão **** 4532'
    },
    {
      id: '3',
      date: '2024-11-20',
      amount: 149.90,
      plan: 'Premium',
      status: 'completed',
      method: 'Cartão **** 4532'
    },
    {
      id: '4',
      date: '2024-10-20',
      amount: 149.90,
      plan: 'Premium',
      status: 'completed',
      method: 'Cartão **** 4532'
    }
  ];

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
      case 'premium': return '#FFD700';
      case 'intermediate': return '#8B5CF6';
      default: return '#22C55E';
    }
  };

  const calculateSavings = () => {
    // Assume traditional gym costs around R$ 120/month + nutritionist R$ 200/month
    const traditionalCost = 320;
    const fitpassCost = 149.90;
    const monthlySavings = traditionalCost - fitpassCost;
    const totalSavings = monthlySavings * 8; // 8 months as client
    return totalSavings;
  };

  const changePlan = (newPlanId: string) => {
    Alert.alert(
      'Alterar Plano',
      `Deseja alterar para o plano ${plans.find(p => p.id === newPlanId)?.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            setCurrentPlan(newPlanId);
            setShowPlansModal(false);
            Alert.alert('Sucesso', 'Plano alterado com sucesso! A cobrança será ajustada no próximo ciclo.');
          }
        }
      ]
    );
  };

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
          <RefreshControl refreshing={refreshing} onRefresh={() => {}} />
        }
      >
        {/* Current Plan Overview */}
        <View style={styles.overviewContainer}>
          <Text style={styles.sectionTitle}>Sua Assinatura</Text>
          
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Plano Premium</Text>
                <Text style={styles.planPrice}>R$ 149,90/mês</Text>
              </View>
              <View style={[styles.planBadge, { backgroundColor: `${getPlanColor('premium')}20` }]}>
                <Text style={[styles.planBadgeText, { color: getPlanColor('premium') }]}>
                  ATIVO
                </Text>
              </View>
            </View>
            
            <View style={styles.planDetails}>
              <View style={styles.planDetail}>
                <Ionicons name="card" size={16} color="#8B5CF6" />
                <Text style={styles.planDetailText}>Status: Em dia</Text>
              </View>
              <View style={styles.planDetail}>
                <Ionicons name="calendar" size={16} color="#8B5CF6" />
                <Text style={styles.planDetailText}>Próximo vencimento: 25/02/2025</Text>
              </View>
              <View style={styles.planDetail}>
                <Ionicons name="time" size={16} color="#8B5CF6" />
                <Text style={styles.planDetailText}>Cliente há 8 meses</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.changePlanButton}
              onPress={() => setShowPlansModal(true)}
            >
              <Text style={styles.changePlanButtonText}>Alterar Plano</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.paymentContainer}>
          <Text style={styles.sectionTitle}>Forma de Pagamento</Text>
          
          <View style={styles.paymentCard}>
            <View style={styles.creditCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardType}>VISA</Text>
                <Ionicons name="card" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.cardNumber}>**** **** **** 4532</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardHolder}>João Silva</Text>
                <Text style={styles.cardExpiry}>12/27</Text>
              </View>
            </View>
            
            <View style={styles.paymentActions}>
              <TouchableOpacity style={styles.paymentActionButton}>
                <Ionicons name="card-outline" size={16} color="#8B5CF6" />
                <Text style={styles.paymentActionText}>Alterar Cartão</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.paymentActionButton}>
                <Ionicons name="document-text-outline" size={16} color="#8B5CF6" />
                <Text style={styles.paymentActionText}>Ver Histórico</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Savings */}
        <View style={styles.savingsContainer}>
          <Text style={styles.sectionTitle}>Sua Economia</Text>
          
          <View style={styles.savingsCard}>
            <View style={styles.savingsHeader}>
              <Ionicons name="trending-down" size={24} color="#22C55E" />
              <Text style={styles.savingsTitle}>Total Economizado</Text>
            </View>
            
            <Text style={styles.savingsAmount}>
              {formatCurrency(calculateSavings())}
            </Text>
            
            <Text style={styles.savingsDescription}>
              em 8 meses comparado com academia tradicional + nutricionista
            </Text>
            
            <View style={styles.savingsBreakdown}>
              <View style={styles.savingsItem}>
                <Text style={styles.savingsItemLabel}>Academia tradicional:</Text>
                <Text style={styles.savingsItemValue}>R$ 120/mês</Text>
              </View>
              <View style={styles.savingsItem}>
                <Text style={styles.savingsItemLabel}>Nutricionista:</Text>
                <Text style={styles.savingsItemValue}>R$ 200/mês</Text>
              </View>
              <View style={styles.savingsItem}>
                <Text style={styles.savingsItemLabel}>FitPass Premium:</Text>
                <Text style={[styles.savingsItemValue, { color: '#22C55E' }]}>R$ 149,90/mês</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payment History */}
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>Histórico de Pagamentos</Text>
          
          {paymentHistory.map((payment) => (
            <View key={payment.id} style={styles.historyItem}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyDate}>{formatDate(payment.date)}</Text>
                <Text style={styles.historyPlan}>Plano {payment.plan}</Text>
                <Text style={styles.historyMethod}>{payment.method}</Text>
              </View>
              
              <View style={styles.historyAmount}>
                <Text style={styles.historyAmountText}>{formatCurrency(payment.amount)}</Text>
                <View style={[
                  styles.historyStatus,
                  { backgroundColor: payment.status === 'completed' ? '#22C55E20' : '#EF444420' }
                ]}>
                  <Text style={[
                    styles.historyStatusText,
                    { color: payment.status === 'completed' ? '#22C55E' : '#EF4444' }
                  ]}>
                    {payment.status === 'completed' ? 'Pago' : 'Pendente'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Invoice Download */}
        <View style={styles.invoiceContainer}>
          <TouchableOpacity style={styles.invoiceButton}>
            <Ionicons name="download" size={20} color="#8B5CF6" />
            <Text style={styles.invoiceButtonText}>Baixar Comprovante</Text>
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
              {plans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.modalPlanCard,
                    plan.id === currentPlan && styles.modalPlanCardCurrent,
                    plan.popular && styles.modalPlanCardPopular
                  ]}
                  onPress={() => changePlan(plan.id)}
                  disabled={plan.id === currentPlan}
                >
                  {plan.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>MAIS POPULAR</Text>
                    </View>
                  )}
                  
                  <View style={styles.modalPlanHeader}>
                    <Text style={styles.modalPlanName}>{plan.name}</Text>
                    <Text style={styles.modalPlanPrice}>{formatCurrency(plan.price)}/mês</Text>
                  </View>
                  
                  <View style={styles.modalPlanFeatures}>
                    {plan.features.map((feature, index) => (
                      <View key={index} style={styles.modalPlanFeature}>
                        <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                        <Text style={styles.modalPlanFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                  
                  {plan.id === currentPlan && (
                    <View style={styles.currentPlanIndicator}>
                      <Text style={styles.currentPlanText}>Plano Atual</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Processando...</Text>
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
  paymentContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  paymentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
  },
  creditCard: {
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardType: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHolder: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  cardExpiry: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingVertical: 10,
    borderRadius: 8,
  },
  paymentActionText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  savingsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  savingsCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  savingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  savingsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  savingsAmount: {
    color: '#22C55E',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  savingsDescription: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 16,
  },
  savingsBreakdown: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 16,
  },
  savingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  savingsItemLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  savingsItemValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  historyContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
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
  invoiceContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  invoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  invoiceButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
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
    maxHeight: '80%',
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
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
});