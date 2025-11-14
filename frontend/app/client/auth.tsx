import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = '/api';

interface PlanData {
  type: string;
  name: string;
  description: string;
  monthly_price: number;
  activation_fee: number;
  first_month_total: number;
  features: string[];
  marketing_benefits: string[];
  nutritionist_consultations: number;
  personal_consultations: number;
}

export default function ClientAuth() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(true);
  const [showPlans, setShowPlans] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Login form data
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        // Já logado, redirecionar para área do cliente
        router.replace('/client/(tabs)');
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
    }
  };

  const loadPlans = async () => {
    if (loadingPlans) return; // Evitar carregamento duplicado
    
    setLoadingPlans(true);
    try {
      console.log('🚀 Carregando planos...');
      const response = await axios.get(`${API_URL}/integration/plans`);
      console.log('✅ Planos carregados:', response.data);
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        setPlans(response.data);
      } else {
        console.warn('⚠️ Nenhum plano retornado do backend');
        Alert.alert('Aviso', 'Nenhum plano disponível no momento.');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar planos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os planos. Tente novamente.');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleLogin = async () => {
    if (!loginData.email || !loginData.password) {
      Alert.alert('Erro', 'Por favor, preencha email e senha.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: loginData.email,
        password: loginData.password
      });

      console.log('✅ Login bem-sucedido:', response.data);

      // Salvar token
      await AsyncStorage.setItem('token', response.data.access_token);
      await AsyncStorage.setItem('userType', 'client');

      // Redirecionar direto para área do cliente
      router.replace('/client/(tabs)');

    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      const errorMessage = error.response?.data?.detail || 'Erro ao fazer login. Verifique suas credenciais.';
      Alert.alert('Erro no Login', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan: PlanData) => {
    Alert.alert(
      `${plan.name}`,
      `💰 Primeiro mês: R$ ${plan.first_month_total.toFixed(2).replace('.', ',')}\n💳 Mensal: R$ ${plan.monthly_price.toFixed(2).replace('.', ',')}\n\n${plan.description}`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Contratar Agora',
          onPress: () => {
            // Redirecionar para cadastro com plano selecionado
            router.push(`/client/register?plan=${plan.type}`);
          }
        }
      ]
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'basico': return '#22C55E';
      case 'intermediario': return '#8B5CF6';
      case 'vip': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'basico': return 'fitness-outline';
      case 'intermediario': return 'nutrition-outline';
      case 'vip': return 'diamond-outline';
      default: return 'star-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.gradient}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>LuxePass</Text>
            <Text style={styles.tagline}>Sua liberdade fitness premium</Text>
          </View>

          {showLogin && (
            <>
              {/* Login Form */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginTitle}>Entre na sua conta</Text>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="mail" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Seu email"
                    placeholderTextColor="#64748B"
                    value={loginData.email}
                    onChangeText={(text) => setLoginData({...loginData, email: text})}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Sua senha"
                    placeholderTextColor="#64748B"
                    value={loginData.password}
                    onChangeText={(text) => setLoginData({...loginData, password: text})}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity 
                  style={styles.loginButton}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>Entrar</Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Ser Luxe Section */}
              <View style={styles.luxeSection}>
                <Text style={styles.luxeText}>Ainda não é LuxePass?</Text>
                <TouchableOpacity 
                  style={styles.luxeButton}
                  onPress={() => {
                    setShowPlans(true);
                    loadPlans();
                  }}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#A855F7']}
                    style={styles.luxeGradient}
                  >
                    <Ionicons name="diamond" size={24} color="#FFFFFF" />
                    <Text style={styles.luxeButtonText}>Ser Luxe</Text>
                    <Text style={styles.luxeSubtext}>Descubra nossos planos</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Plans Section */}
          {showPlans && (
            <View style={styles.plansContainer}>
              <View style={styles.plansHeader}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setShowPlans(false)}
                >
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.plansTitle}>Escolha seu Plano</Text>
              </View>

              {loadingPlans ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#8B5CF6" />
                  <Text style={styles.loadingText}>Carregando planos...</Text>
                </View>
              ) : (
                <>
                  {plans.map((plan, index) => {
                    const planColor = getPlanColor(plan.type);
                    const planIcon = getPlanIcon(plan.type);
                    const isPopular = plan.type === 'intermediario';

                    return (
                      <View key={plan.type} style={styles.planCard}>
                        {isPopular && (
                          <View style={styles.popularBadge}>
                            <Text style={styles.popularText}>MAIS VENDIDO</Text>
                          </View>
                        )}

                        <View style={styles.planHeader}>
                          <View style={[styles.planIcon, { backgroundColor: `${planColor}20` }]}>
                            <Ionicons name={planIcon as any} size={24} color={planColor} />
                          </View>
                          <View style={styles.planInfo}>
                            <Text style={styles.planName}>{plan.name}</Text>
                            <Text style={styles.planDescription}>{plan.description}</Text>
                          </View>
                        </View>

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
                        </View>

                        {/* Features */}
                        <View style={styles.featuresContainer}>
                          <Text style={styles.featuresTitle}>✨ Incluído:</Text>
                          {plan.features.slice(0, 3).map((feature, featureIndex) => (
                            <View key={featureIndex} style={styles.featureItem}>
                              <Ionicons name="checkmark-circle" size={16} color={planColor} />
                              <Text style={styles.featureText}>{feature}</Text>
                            </View>
                          ))}
                          {plan.features.length > 3 && (
                            <Text style={styles.moreFeatures}>
                              +{plan.features.length - 3} benefícios adicionais
                            </Text>
                          )}
                        </View>

                        <TouchableOpacity 
                          style={[styles.selectButton, { backgroundColor: planColor }]}
                          onPress={() => handlePlanSelect(plan)}
                        >
                          <Text style={styles.selectButtonText}>Escolher {plan.name}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2025 LuxePass. Sua liberdade fitness.</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  loginContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: '#FFFFFF',
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  luxeSection: {
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  luxeText: {
    color: '#94A3B8',
    fontSize: 16,
    marginBottom: 16,
  },
  luxeButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  luxeGradient: {
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
    minWidth: 200,
  },
  luxeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  luxeSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  plansContainer: {
    paddingHorizontal: 20,
  },
  plansHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  plansTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 16,
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  pricingContainer: {
    marginBottom: 16,
  },
  monthlyPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  activationFee: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  noActivationFee: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginRight: 8,
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#94A3B8',
    marginLeft: 8,
    flex: 1,
  },
  moreFeatures: {
    fontSize: 12,
    color: '#8B5CF6',
    fontStyle: 'italic',
    marginTop: 4,
  },
  selectButton: {
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#64748B',
  },
});