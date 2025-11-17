import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';

const API_URL = Constants.expoConfig?.extra?.EXPO_BACKEND_URL || 'http://localhost:8001';

export default function PaymentScreen() {
  const router = useRouter();
  const { userData, contractId, planInfo } = useLocalSearchParams();

  const user = JSON.parse(userData as string);
  const plan = JSON.parse(planInfo as string);

  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<any>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Estados do cartão
  const [cardData, setCardData] = useState({
    number: '',
    holder_name: '',
    exp_month: '',
    exp_year: '',
    cvv: '',
  });

  // Verificar status do pagamento PIX a cada 5 segundos
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (pixData && pixData.order_id) {
      interval = setInterval(async () => {
        await checkPaymentStatus(pixData.order_id);
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pixData]);

  const handlePixPayment = async () => {
    setLoading(true);

    try {
      // Obter plano info
      const plansResponse = await axios.get(`${API_URL}/api/integration/plans`);
      const plans = plansResponse.data;
      const selectedPlan = plans.find((p: any) => p.type === user.plan_type);

      if (!selectedPlan) {
        Alert.alert('Erro', 'Plano não encontrado');
        return;
      }

      // Criar usuário primeiro (se não existir)
      let userId = user.user_id;

      if (!userId) {
        const registerResponse = await axios.post(`${API_URL}/api/auth/register`, {
          full_name: user.full_name,
          email: user.email,
          password: 'temppass123', // Senha temporária
          phone: user.phone,
          plan_type: user.plan_type,
        });

        userId = registerResponse.data.id;
      }

      // Criar pagamento PIX
      const paymentData = {
        user_id: userId,
        plan_type: user.plan_type,
        amount: selectedPlan.first_month_total,
        description: `${selectedPlan.name} - Taxa de Adesão + 1ª Mensalidade`,
      };

      const response = await axios.post(`${API_URL}/api/payments/pix/create`, paymentData);

      if (response.data.success) {
        setPixData(response.data);
        Alert.alert(
          'PIX Gerado!',
          'QR Code gerado com sucesso. Pague via PIX para ativar sua assinatura.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Erro', 'Erro ao gerar pagamento PIX');
      }
    } catch (error: any) {
      console.error('Erro ao criar pagamento PIX:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.detail || 'Erro ao processar pagamento. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (orderId: string) => {
    try {
      setCheckingPayment(true);
      const response = await axios.get(`${API_URL}/api/payments/status/${orderId}`);

      if (response.data.status === 'paid') {
        // Pagamento aprovado!
        Alert.alert(
          'Pagamento Aprovado! ✅',
          'Seu pagamento foi confirmado. Bem-vindo ao LuxePass!',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace({
                  pathname: '/payment-success',
                  params: { planName: plan.name },
                });
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleCardPayment = async () => {
    // Validação básica
    if (!cardData.number || cardData.number.replace(/\s/g, '').length < 13) {
      Alert.alert('Erro', 'Número do cartão inválido');
      return;
    }

    if (!cardData.holder_name) {
      Alert.alert('Erro', 'Nome do titular é obrigatório');
      return;
    }

    if (!cardData.exp_month || !cardData.exp_year) {
      Alert.alert('Erro', 'Data de validade inválida');
      return;
    }

    if (!cardData.cvv || cardData.cvv.length < 3) {
      Alert.alert('Erro', 'CVV inválido');
      return;
    }

    setLoading(true);

    try {
      // Em produção, tokenizar o cartão no frontend usando SDK do Pagar.me
      // Por enquanto, vamos simular um token
      const cardToken = 'tok_test_' + Date.now();

      // Obter plano info
      const plansResponse = await axios.get(`${API_URL}/api/integration/plans`);
      const plans = plansResponse.data;
      const selectedPlan = plans.find((p: any) => p.type === user.plan_type);

      // Criar usuário primeiro (se não existir)
      let userId = user.user_id;

      if (!userId) {
        const registerResponse = await axios.post(`${API_URL}/api/auth/register`, {
          full_name: user.full_name,
          email: user.email,
          password: 'temppass123',
          phone: user.phone,
          plan_type: user.plan_type,
        });

        userId = registerResponse.data.id;
      }

      // Criar pagamento com cartão
      const paymentData = {
        user_id: userId,
        plan_type: user.plan_type,
        card_token: cardToken,
        amount: selectedPlan.first_month_total,
        description: `${selectedPlan.name} - Taxa de Adesão + 1ª Mensalidade`,
      };

      const response = await axios.post(`${API_URL}/api/payments/card/create`, paymentData);

      if (response.data.success) {
        if (response.data.status === 'paid') {
          Alert.alert(
            'Pagamento Aprovado! ✅',
            'Seu pagamento foi aprovado. Bem-vindo ao LuxePass!',
            [
              {
                text: 'OK',
                onPress: () => {
                  router.replace({
                    pathname: '/payment-success',
                    params: { planName: plan.name },
                  });
                },
              },
            ]
          );
        } else {
          Alert.alert('Pagamento em Análise', 'Seu pagamento está sendo processado.');
        }
      } else {
        Alert.alert('Erro', 'Erro ao processar pagamento com cartão');
      }
    } catch (error: any) {
      console.error('Erro ao processar pagamento:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.detail || 'Erro ao processar pagamento. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = async () => {
    if (pixData && pixData.qr_code) {
      await Clipboard.setStringAsync(pixData.qr_code);
      Alert.alert('Copiado!', 'Código PIX copiado para a área de transferência');
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const limited = cleaned.substring(0, 16);
    const formatted = limited.match(/.{1,4}/g)?.join(' ') || limited;
    return formatted;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pagamento</Text>
        <Text style={styles.headerSubtitle}>{plan.name}</Text>
        <Text style={styles.headerAmount}>
          R$ {plan.monthly_price?.toFixed(2)}
        </Text>
      </View>

      {/* Tabs de seleção */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, paymentMethod === 'pix' && styles.tabActive]}
          onPress={() => setPaymentMethod('pix')}
        >
          <Text style={[styles.tabText, paymentMethod === 'pix' && styles.tabTextActive]}>
            📱 PIX
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, paymentMethod === 'card' && styles.tabActive]}
          onPress={() => setPaymentMethod('card')}
        >
          <Text style={[styles.tabText, paymentMethod === 'card' && styles.tabTextActive]}>
            💳 Cartão de Crédito
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo PIX */}
      {paymentMethod === 'pix' && (
        <View style={styles.content}>
          {!pixData ? (
            <>
              <Text style={styles.infoTitle}>Pagamento via PIX</Text>
              <Text style={styles.infoText}>
                • Pagamento instantâneo{'\n'}
                • Aprovação em segundos{'\n'}
                • Seguro e prático
              </Text>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handlePixPayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Gerar QR Code PIX</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.successTitle}>QR Code Gerado! ✅</Text>

              {pixData.qr_code_url && (
                <Image
                  source={{ uri: pixData.qr_code_url }}
                  style={styles.qrCode}
                  resizeMode="contain"
                />
              )}

              <Text style={styles.instructionText}>
                1. Abra o app do seu banco{'\n'}
                2. Escolha pagar via PIX{'\n'}
                3. Escaneie o QR Code acima ou cole o código abaixo
              </Text>

              <TouchableOpacity style={styles.copyButton} onPress={copyPixCode}>
                <Text style={styles.copyButtonText}>📋 Copiar Código PIX</Text>
              </TouchableOpacity>

              {checkingPayment && (
                <View style={styles.checkingBox}>
                  <ActivityIndicator color="#27AE60" />
                  <Text style={styles.checkingText}>
                    Aguardando confirmação do pagamento...
                  </Text>
                </View>
              )}

              <Text style={styles.expiryText}>
                Este QR Code expira em 24 horas
              </Text>
            </>
          )}
        </View>
      )}

      {/* Conteúdo Cartão */}
      {paymentMethod === 'card' && (
        <View style={styles.content}>
          <Text style={styles.infoTitle}>Pagamento com Cartão</Text>
          <Text style={styles.infoText}>
            • Cobrança automática mensal{'\n'}
            • Sem necessidade de gerar PIX todo mês{'\n'}
            • Seguro e criptografado
          </Text>

          <Text style={styles.label}>Número do Cartão *</Text>
          <TextInput
            style={styles.input}
            placeholder="0000 0000 0000 0000"
            value={cardData.number}
            onChangeText={(text) =>
              setCardData({ ...cardData, number: formatCardNumber(text) })
            }
            keyboardType="numeric"
            maxLength={19}
          />

          <Text style={styles.label}>Nome do Titular *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome como está no cartão"
            value={cardData.holder_name}
            onChangeText={(text) =>
              setCardData({ ...cardData, holder_name: text.toUpperCase() })
            }
            autoCapitalize="characters"
          />

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Validade *</Text>
              <View style={styles.expiryRow}>
                <TextInput
                  style={[styles.input, styles.expiryInput]}
                  placeholder="MM"
                  value={cardData.exp_month}
                  onChangeText={(text) =>
                    setCardData({ ...cardData, exp_month: text.substring(0, 2) })
                  }
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.slash}>/</Text>
                <TextInput
                  style={[styles.input, styles.expiryInput]}
                  placeholder="AA"
                  value={cardData.exp_year}
                  onChangeText={(text) =>
                    setCardData({ ...cardData, exp_year: text.substring(0, 2) })
                  }
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            </View>

            <View style={styles.halfInput}>
              <Text style={styles.label}>CVV *</Text>
              <TextInput
                style={styles.input}
                placeholder="123"
                value={cardData.cvv}
                onChangeText={(text) =>
                  setCardData({ ...cardData, cvv: text.substring(0, 4) })
                }
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />
            </View>
          </View>

          <View style={styles.recurringBox}>
            <Text style={styles.recurringText}>
              🔄 Ao pagar com cartão, você autoriza a cobrança automática mensal no valor de R${' '}
              {plan.monthly_price?.toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCardPayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Pagar com Cartão</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 24,
    backgroundColor: '#2C3E50',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ECF0F1',
    marginTop: 4,
  },
  headerAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#27AE60',
    marginTop: 8,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#BDC3C7',
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#27AE60',
  },
  tabText: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  tabTextActive: {
    color: '#27AE60',
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#34495E',
    lineHeight: 24,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#27AE60',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#95A5A6',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#27AE60',
    textAlign: 'center',
    marginBottom: 16,
  },
  qrCode: {
    width: 250,
    height: 250,
    alignSelf: 'center',
    marginVertical: 16,
  },
  instructionText: {
    fontSize: 15,
    color: '#34495E',
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  copyButton: {
    backgroundColor: '#3498DB',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  checkingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#E8F8F5',
    borderRadius: 8,
    marginVertical: 16,
  },
  checkingText: {
    fontSize: 14,
    color: '#27AE60',
    marginLeft: 12,
  },
  expiryText: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495E',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BDC3C7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2C3E50',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 1,
    marginRight: 8,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiryInput: {
    flex: 1,
  },
  slash: {
    fontSize: 20,
    color: '#2C3E50',
    marginHorizontal: 8,
  },
  recurringBox: {
    backgroundColor: '#FEF5E7',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
  },
  recurringText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
});
