import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://apptbook-2.preview.emergentagent.com';

interface PlanDetails {
  type: string;
  name: string;
  description: string;
  features: string[];
  monthly_price: number;
  activation_fee: number;
  first_month_total: number;
  fidelity_months: number;
  marketing_benefits: string[];
  nutritionist_consultations?: number;
  personal_consultations?: number;
}

export default function PlansScreen() {
  const [plans, setPlans] = useState<PlanDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      console.log('🚀 Carregando planos da URL:', `${API_URL}/integration/plans`);
      const response = await axios.get(`${API_URL}/integration/plans`);
      console.log('✅ Planos recebidos:', response.data);
      console.log('📊 Total de planos:', response.data.length);
      
      // Verificar se cada plano tem as propriedades necessárias
      response.data.forEach((plan: any, index: number) => {
        console.log(`🔍 Plano ${index}:`, {
          type: plan.type,
          name: plan.name,
          monthly_price: plan.monthly_price,
          hasMarketingBenefits: !!plan.marketing_benefits
        });
      });
      
      setPlans(response.data);
      console.log('✅ Estado dos planos atualizado');
    } catch (error) {
      console.error('❌ Erro ao carregar planos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os planos. Tente novamente.');
    } finally {
      console.log('🏁 Loading definido como false');
      setLoading(false);
    }
  };

  const handleSelectPlan = (planType: string) => {
    setSelectedPlan(planType);
    // Navegar para tela de cadastro com plano selecionado
    router.push({
      pathname: '/client/register',
      params: { plan: planType }
    });
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'basico': return 'fitness-outline';
      case 'intermediario': return 'nutrition-outline';
      case 'vip': return 'diamond-outline';
      case 'avancado': return 'trophy-outline';
      default: return 'star-outline';
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'basico': return '#22C55E';
      case 'intermediario': return '#8B5CF6';
      case 'vip': return '#F59E0B';
      case 'avancado': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando planos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (plans.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Image 
              source={{ uri: 'https://customer-assets.emergentagent.com/job_fitness-token-app/artifacts/8gnzidak_IMG_0187.png' }}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>Escolha seu Plano</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="warning" size={64} color="#F59E0B" />
          <Text style={styles.loadingText}>Erro ao carregar planos</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadPlans}
          >
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image 
            source={{ uri: 'https://customer-assets.emergentagent.com/job_fitness-token-app/artifacts/8gnzidak_IMG_0187.png' }}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Escolha seu Plano</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>🚀 Transforme sua Rotina Fitness!</Text>
          <Text style={styles.heroSubtitle}>
            Acesso a dezenas de academias, nutricionistas e personal trainers. 
            Tudo em um só app, com a flexibilidade que você merece!
          </Text>
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {plans.map((plan, index) => {
            console.log('🔄 Renderizando plano:', plan.type, index);
            const planColor = getPlanColor(plan.type);
            const isPopular = plan.type === 'intermediario';
            
            return (
              <View key={plan.type} style={styles.planWrapper}>
                {isPopular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>🔥 MAIS POPULAR</Text>
                  </View>
                )}
                
                <View style={[
                  styles.planCard,
                  { borderColor: planColor },
                  isPopular && styles.popularCard
                ]}>
                  {/* Plan Header */}
                  <View style={[styles.planHeader, { backgroundColor: planColor }]}>
                    <View style={styles.planIconContainer}>
                      <Ionicons 
                        name={getPlanIcon(plan.type) as any} 
                        size={32} 
                        color="#FFFFFF" 
                      />
                    </View>
                    <Text style={styles.planName}>{plan.name}</Text>
                    
                    {/* Pricing */}
                    <View style={styles.pricingContainer}>
                      <Text style={styles.monthlyPrice}>
                        {formatPrice(plan.monthly_price)}/mês
                      </Text>
                      
                      {plan.activation_fee > 0 ? (
                        <Text style={styles.activationFee}>
                          Taxa de adesão: {formatPrice(plan.activation_fee)}
                        </Text>
                      ) : (
                        <Text style={styles.noActivationFee}>
                          🎁 SEM TAXA DE ADESÃO!
                        </Text>
                      )}
                      
                      <View style={styles.totalContainer}>
                        <Text style={styles.totalLabel}>1º mês total:</Text>
                        <Text style={styles.totalPrice}>
                          {formatPrice(plan.first_month_total)}
                        </Text>
                      </View>
                      
                      {/* Fidelity Badge */}
                      <View style={styles.fidelityBadge}>
                        <Ionicons name="time" size={14} color="#F59E0B" />
                        <Text style={styles.fidelityText}>
                          Fidelidade: {plan.fidelity_months} meses
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Plan Description */}
                  <View style={styles.planBody}>
                    <Text style={styles.planDescription}>
                      {plan.description}
                    </Text>

                    {/* Marketing Benefits */}
                    {plan.marketing_benefits && plan.marketing_benefits.length > 0 && (
                      <View style={styles.marketingContainer}>
                        <Text style={styles.marketingTitle}>🚀 Por que escolher este plano:</Text>
                        {plan.marketing_benefits.map((benefit, benefitIndex) => (
                          <View key={benefitIndex} style={styles.marketingItem}>
                            <Text style={styles.marketingText}>{benefit}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Features */}
                    <View style={styles.featuresContainer}>
                      <Text style={styles.featuresTitle}>✨ O que está incluído:</Text>
                      {plan.features.map((feature, featureIndex) => (
                        <View key={featureIndex} style={styles.featureItem}>
                          <Ionicons name="checkmark-circle" size={16} color={planColor} />
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Professional Consultations Info */}
                    {(plan.nutritionist_consultations > 0 || plan.personal_consultations > 0) && (
                      <View style={styles.consultationsContainer}>
                        <Text style={styles.consultationsTitle}>👩‍⚕️ Consultas Mensais Incluídas:</Text>
                        {plan.nutritionist_consultations > 0 && (
                          <View style={styles.consultationItem}>
                            <Ionicons name="nutrition" size={16} color="#22C55E" />
                            <Text style={styles.consultationText}>
                              {plan.nutritionist_consultations}x Nutricionista especializada
                            </Text>
                          </View>
                        )}
                        {plan.personal_consultations > 0 && (
                          <View style={styles.consultationItem}>
                            <Ionicons name="fitness" size={16} color="#8B5CF6" />
                            <Text style={styles.consultationText}>
                              {plan.personal_consultations}x Personal Trainer qualificado
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Action Button */}
                    <TouchableOpacity 
                      style={[styles.selectButton, { backgroundColor: planColor }]}
                      onPress={() => handleSelectPlan(plan.type)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.selectButtonText}>
                        Escolher {plan.name}
                      </Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Footer Info */}
        <View style={styles.footerInfo}>
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={24} color="#22C55E" />
            <Text style={styles.infoTitle}>Garantia Total</Text>
            <Text style={styles.infoDesc}>7 dias para cancelar sem custos</Text>
          </View>
          
          <View style={styles.infoCard}>
            <Ionicons name="card" size={24} color="#8B5CF6" />
            <Text style={styles.infoTitle}>Pagamento Seguro</Text>
            <Text style={styles.infoDesc}>Cartão ou PIX, totalmente protegido</Text>
          </View>
          
          <View style={styles.infoCard}>
            <Ionicons name="headset" size={24} color="#F59E0B" />
            <Text style={styles.infoTitle}>Suporte 24/7</Text>
            <Text style={styles.infoDesc}>Atendimento sempre disponível</Text>
          </View>
        </View>

        {/* Already a Client Section */}
        <View style={styles.existingClientSection}>
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>
          
          <View style={styles.loginPrompt}>
            <Ionicons name="person-circle" size={48} color="#8B5CF6" />
            <Text style={styles.loginPromptTitle}>Já é cliente LuxePass?</Text>
            <Text style={styles.loginPromptSubtitle}>
              Acesse sua conta e continue aproveitando todos os benefícios
            </Text>
            
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={() => router.push('/client/login')}
              activeOpacity={0.8}
            >
              <Ionicons name="log-in" size={20} color="#FFFFFF" />
              <Text style={styles.loginButtonText}>Fazer Login</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginLeft: -40, // Compensar o botão back
  },
  logoImage: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroSubtitle: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  plansContainer: {
    paddingHorizontal: 24,
  },
  planWrapper: {
    marginBottom: 24,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 0,
    right: 0,
    zIndex: 1,
    alignItems: 'center',
  },
  popularText: {
    backgroundColor: '#F59E0B',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
  },
  popularCard: {
    transform: [{ scale: 1.02 }],
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  planHeader: {
    padding: 24,
    alignItems: 'center',
  },
  planIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  pricingContainer: {
    alignItems: 'center',
  },
  monthlyPrice: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  activationFee: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  totalLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginRight: 8,
  },
  totalPrice: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  planBody: {
    padding: 24,
  },
  planDescription: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featuresTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureText: {
    color: '#E2E8F0',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footerInfo: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  infoDesc: {
    color: '#94A3B8',
    fontSize: 14,
    flex: 2,
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  existingClientSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: '#94A3B8',
    fontSize: 14,
    marginHorizontal: 16,
    fontWeight: '500',
  },
  loginPrompt: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  loginPromptTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  loginPromptSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noActivationFee: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  fidelityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'center',
  },
  fidelityText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  marketingContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  marketingTitle: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  marketingItem: {
    marginBottom: 8,
  },
  marketingText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
  },
  consultationsContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  consultationsTitle: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  consultationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  consultationText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
});