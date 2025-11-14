import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://trainer-portal-11.preview.emergentagent.com';

interface PlanDetails {
  type: string;
  name: string;
  description: string;
  features: string[];
  monthly_price: number;
  activation_fee: number;
  first_month_total: number;
}

export default function RegisterScreen() {
  const { plan } = useLocalSearchParams();
  const router = useRouter();
  
  const [selectedPlan, setSelectedPlan] = useState<PlanDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Dados Pessoais, 2: Pagamento, 3: Confirmação
  
  // Form data
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: {
      street: '',
      number: '',
      city: 'São Paulo',
      state: 'SP',
      zip_code: ''
    }
  });
  
  const [paymentData, setPaymentData] = useState({
    payment_method: 'cartao_credito' as 'cartao_credito' | 'cartao_debito' | 'pix',
    card_number: '',
    card_name: '',
    card_expiry: '',
    card_cvv: ''
  });

  useEffect(() => {
    if (plan) {
      loadPlanDetails(plan as string);
    }
  }, [plan]);

  const loadPlanDetails = async (planType: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/integration/plans/${planType}`);
      setSelectedPlan(response.data);
    } catch (error) {
      console.error('Erro ao carregar plano:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do plano.');
      router.back();
    }
  };

  const validateStep1 = () => {
    if (!formData.full_name.trim()) {
      Alert.alert('Erro', 'Nome completo é obrigatório');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      Alert.alert('Erro', 'Email válido é obrigatório');
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert('Erro', 'Senha deve ter pelo menos 6 caracteres');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Erro', 'Senhas não coincidem');
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Erro', 'Telefone é obrigatório');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (paymentData.payment_method === 'pix') {
      return true; // PIX não precisa de dados do cartão
    }
    
    if (!paymentData.card_number.trim() || paymentData.card_number.replace(/\s/g, '').length < 16) {
      Alert.alert('Erro', 'Número do cartão inválido');
      return false;
    }
    if (!paymentData.card_name.trim()) {
      Alert.alert('Erro', 'Nome no cartão é obrigatório');
      return false;
    }
    if (!paymentData.card_expiry.trim() || !paymentData.card_expiry.includes('/')) {
      Alert.alert('Erro', 'Data de validade inválida (MM/AA)');
      return false;
    }
    if (!paymentData.card_cvv.trim() || paymentData.card_cvv.length < 3) {
      Alert.alert('Erro', 'CVV inválido');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return;
    
    setLoading(true);
    
    try {
      // 1. Primeiro, cadastrar o usuário
      const registrationData = {
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        plan_type: selectedPlan.type,
        address: formData.address
      };

      console.log('🚀 1. Cadastrando usuário:', registrationData);
      const userResponse = await axios.post(`${API_URL}/api/integration/user/register`, registrationData);
      console.log('✅ 1. Usuário cadastrado:', userResponse.data);
      
      // 2. Fazer login para obter token
      const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
        email: formData.email,
        password: formData.password
      });
      const token = loginResponse.data.access_token;
      console.log('✅ 2. Login realizado, token obtido');
      
      // 3. Processar pagamento
      const paymentRequestData = {
        plan_id: selectedPlan.type,
        payment_method: paymentData.payment_method,
        origin_url: 'http://localhost:3000'
      };
      
      if (paymentData.payment_method === 'credit_card') {
        paymentRequestData.card_data = {
          number: paymentData.card_number,
          holder_name: paymentData.card_name,
          exp_month: paymentData.card_expiry.split('/')[0],
          exp_year: paymentData.card_expiry.split('/')[1],
          cvv: paymentData.card_cvv
        };
      }
      
      console.log('🚀 3. Processando pagamento:', paymentRequestData);
      
      const paymentResponse = await axios.post(
        `${API_URL}/api/payments/pagarme/checkout/session`,
        paymentRequestData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ 3. Pagamento processado:', paymentResponse.data);
      
      const payment = paymentResponse.data;
      
      if (payment.payment_method === 'pix' && payment.qr_code) {
        // Mostrar QR Code do PIX
        showPixPayment(payment);
      } else if (payment.payment_method === 'boleto' && payment.boleto_url) {
        // Mostrar boleto
        showBoletoPayment(payment);
      } else if (payment.payment_method === 'credit_card' && payment.payment_url) {
        // Redirecionar para checkout do cartão
        showCardPayment(payment);
      } else {
        // Pagamento processado com sucesso
        Alert.alert(
          'Cadastro Realizado! 🎉',
          `Bem-vindo ao LuxePass!\n\nSeu ${selectedPlan.name} foi ativado.\n\nValor: ${formatPrice(selectedPlan.first_month_total)}`,
          [{ text: 'Acessar Conta', onPress: () => router.replace('/client/login') }]
        );
      }

    } catch (error: any) {
      console.error('❌ Erro no processo:', error);
      console.error('📄 Detalhes do erro:', error.response?.data);
      
      const errorMessage = error.response?.data?.detail || 'Erro ao processar cadastro. Tente novamente.';
      Alert.alert('Erro no Cadastro', errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const showPixPayment = (payment: any) => {
    Alert.alert(
      '🔄 PIX - Pagamento Pendente',
      `📱 Use o código PIX abaixo para finalizar seu pagamento:\n\n💰 Valor: ${formatPrice(payment.total_amount)}\n⏰ Vencimento: 30 minutos`,
      [
        {
          text: 'Copiar Código PIX',
          onPress: () => {
            // Implementar cópia do código PIX
            Alert.alert('✅ PIX Copiado!', 'Cole no seu app bancário para pagar.');
          }
        },
        {
          text: 'Ver QR Code',
          onPress: () => {
            // Mostrar modal com QR Code
            showQRCodeModal(payment.qr_code);
          }
        }
      ]
    );
  };
  
  const showBoletoPayment = (payment: any) => {
    Alert.alert(
      '🏦 Boleto Bancário',
      `💰 Valor: ${formatPrice(payment.total_amount)}\n⏰ Vencimento: 3 dias úteis`,
      [
        {
          text: 'Abrir Boleto',
          onPress: () => {
            // Abrir URL do boleto
            if (payment.boleto_url) {
              // Implementar abertura do boleto
            }
          }
        }
      ]
    );
  };
  
  const showCardPayment = (payment: any) => {
    Alert.alert(
      '💳 Processando Cartão...',
      `Redirecionando para finalizar pagamento seguro.\n\n💰 Valor: ${formatPrice(payment.total_amount)}`,
      [
        {
          text: 'Continuar',
          onPress: () => {
            // Redirecionar para checkout
            if (payment.payment_url) {
              // Implementar redirecionamento
            }
          }
        }
      ]
    );
  };
  
  const showQRCodeModal = (qrCode: string) => {
    // Implementar modal com QR Code
    Alert.alert('QR Code PIX', `QR Code: ${qrCode.substring(0, 50)}...`);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
    return formatted;
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  if (!selectedPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando plano...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image 
            source={{ uri: 'https://customer-assets.emergentagent.com/job_fitness-token-app/artifacts/8gnzidak_IMG_0187.png' }}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>
            {step === 1 ? 'Seus Dados' : step === 2 ? 'Pagamento' : 'Confirmação'}
          </Text>
        </View>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]} />
          <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]} />
        </View>
        <Text style={styles.progressText}>Etapa {step} de 2</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Selected Plan Summary */}
          <View style={styles.planSummary}>
            <Text style={styles.planSummaryTitle}>Plano Selecionado</Text>
            <View style={styles.planSummaryCard}>
              <Text style={styles.planName}>{selectedPlan.name}</Text>
              <Text style={styles.planPrice}>{formatPrice(selectedPlan.monthly_price)}/mês</Text>
              <Text style={styles.planTotal}>
                1º mês: {formatPrice(selectedPlan.first_month_total)}
              </Text>
            </View>
          </View>

          {/* Step 1: Personal Data */}
          {step === 1 && (
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>📝 Dados Pessoais</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome Completo *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.full_name}
                  onChangeText={(text) => setFormData({...formData, full_name: text})}
                  placeholder="Seu nome completo"
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text.toLowerCase()})}
                  placeholder="seu@email.com"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Telefone *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({...formData, phone: text})}
                  placeholder="(11) 99999-9999"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Senha *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(text) => setFormData({...formData, password: text})}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirmar Senha *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
                  placeholder="Digite a senha novamente"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                />
              </View>
            </View>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>💳 Dados de Pagamento</Text>
              
              {/* Payment Method Selection */}
              <View style={styles.paymentMethods}>
                <TouchableOpacity 
                  style={[
                    styles.paymentMethod,
                    paymentData.payment_method === 'cartao_credito' && styles.paymentMethodActive
                  ]}
                  onPress={() => setPaymentData({...paymentData, payment_method: 'cartao_credito'})}
                >
                  <Ionicons name="card" size={24} color="#8B5CF6" />
                  <Text style={styles.paymentMethodText}>Cartão de Crédito</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.paymentMethod,
                    paymentData.payment_method === 'pix' && styles.paymentMethodActive
                  ]}
                  onPress={() => setPaymentData({...paymentData, payment_method: 'pix'})}
                >
                  <Ionicons name="qr-code" size={24} color="#22C55E" />
                  <Text style={styles.paymentMethodText}>PIX</Text>
                </TouchableOpacity>
              </View>

              {/* Card Data (if not PIX) */}
              {paymentData.payment_method !== 'pix' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Número do Cartão *</Text>
                    <TextInput
                      style={styles.input}
                      value={paymentData.card_number}
                      onChangeText={(text) => setPaymentData({
                        ...paymentData, 
                        card_number: formatCardNumber(text)
                      })}
                      placeholder="1234 5678 9012 3456"
                      placeholderTextColor="#64748B"
                      keyboardType="numeric"
                      maxLength={19}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nome no Cartão *</Text>
                    <TextInput
                      style={styles.input}
                      value={paymentData.card_name}
                      onChangeText={(text) => setPaymentData({...paymentData, card_name: text.toUpperCase()})}
                      placeholder="NOME COMO NO CARTÃO"
                      placeholderTextColor="#64748B"
                      autoCapitalize="characters"
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.inputLabel}>Validade *</Text>
                      <TextInput
                        style={styles.input}
                        value={paymentData.card_expiry}
                        onChangeText={(text) => setPaymentData({
                          ...paymentData, 
                          card_expiry: formatExpiry(text)
                        })}
                        placeholder="MM/AA"
                        placeholderTextColor="#64748B"
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                      <Text style={styles.inputLabel}>CVV *</Text>
                      <TextInput
                        style={styles.input}
                        value={paymentData.card_cvv}
                        onChangeText={(text) => setPaymentData({
                          ...paymentData, 
                          card_cvv: text.replace(/\D/g, '')
                        })}
                        placeholder="123"
                        placeholderTextColor="#64748B"
                        keyboardType="numeric"
                        maxLength={4}
                        secureTextEntry
                      />
                    </View>
                  </View>
                </>
              )}

              {paymentData.payment_method === 'pix' && (
                <View style={styles.pixInfo}>
                  <Ionicons name="information-circle" size={24} color="#22C55E" />
                  <Text style={styles.pixInfoText}>
                    Após confirmar, você receberá o código PIX para pagamento
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Bottom Action */}
        <View style={styles.bottomContainer}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total do 1º mês:</Text>
            <Text style={styles.totalValue}>
              {formatPrice(selectedPlan.first_month_total)}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.continueButton, loading && styles.continueButtonDisabled]}
            onPress={handleNextStep}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.continueButtonText}>
                  {step === 1 ? 'Continuar' : 'Confirmar Cadastro'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    marginLeft: -40,
  },
  logoImage: {
    width: 32,
    height: 32,
    marginBottom: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    width: 100,
    gap: 8,
    marginBottom: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: '#8B5CF6',
  },
  progressText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  planSummary: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  planSummaryTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  planSummaryCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  planName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  planPrice: {
    color: '#8B5CF6',
    fontSize: 16,
    marginTop: 4,
  },
  planTotal: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputRow: {
    flexDirection: 'row',
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  paymentMethod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  paymentMethodActive: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  paymentMethodText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  pixInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  pixInfoText: {
    color: '#22C55E',
    fontSize: 14,
    flex: 1,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    color: '#94A3B8',
    fontSize: 16,
  },
  totalValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  continueButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});