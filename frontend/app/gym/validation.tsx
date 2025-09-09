import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = '/api';

export default function TokenValidation() {
  const [tokenCode, setTokenCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [gymInfo, setGymInfo] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Sair do Sistema',
      'Deseja realmente sair do sistema da academia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              // Limpar todos os dados da academia
              await AsyncStorage.removeItem('gymToken');
              await AsyncStorage.removeItem('gymInfo');
              
              Alert.alert(
                'Logout Realizado ✅',
                'Você foi desconectado do sistema com sucesso.',
                [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/academia')
                  }
                ]
              );
            } catch (error) {
              console.error('Erro ao fazer logout:', error);
              router.replace('/academia');
            }
          }
        }
      ]
    );
  }, [router]);

  const validateToken = useCallback(async () => {
    if (!tokenCode.trim()) {
      Alert.alert(
        'Campo Obrigatório ⚠️',
        'Por favor, digite o código do token para validar.'
      );
      return;
    }

    setLoading(true);
    try {
      const gymToken = await AsyncStorage.getItem('gymToken');
      if (!gymToken) {
        Alert.alert(
          'Sessão Expirada ❌',
          'Você não está autenticado. Faça login novamente.',
          [{ text: 'OK', onPress: () => router.replace('/gym/login') }]
        );
        return;
      }

      const gymData = await AsyncStorage.getItem('gymInfo');
      const gym = gymData ? JSON.parse(gymData) : null;

      if (!gym?.id) {
        Alert.alert(
          'Erro de Configuração ❌',
          'Informações da academia não encontradas. Faça login novamente.',
          [{ text: 'OK', onPress: () => router.replace('/gym/login') }]
        );
        return;
      }

      console.log('🔍 Validando token:', tokenCode);
      console.log('🏋️ Academia ID:', gym.id);

      const headers = { 
        'Authorization': `Bearer ${gymToken}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axios.post(
        `${API_URL}/tokens/validate/${tokenCode}?gym_id=${gym.id}`,
        {},
        { headers, timeout: 15000 }
      );

      console.log('✅ Token validado com sucesso:', response.data);

      const userData = response.data.user || response.data;
      const clientName = userData.full_name || userData.name || 'Cliente';

      Alert.alert(
        '✅ TOKEN VALIDADO COM SUCESSO!',
        `🎯 Cliente: ${clientName}\n🏋️ Academia: ${gym.name}\n⏰ Check-in realizado com sucesso!\n\n✅ Token utilizado e registrado no sistema.`,
        [{ 
          text: 'Validar Outro Token', 
          onPress: () => setTokenCode('') 
        }]
      );

    } catch (error: any) {
      console.error('❌ Erro na validação do token:', error);
      
      let title = 'Erro na Validação ❌';
      let message = 'Não foi possível validar o token.';

      if (error.response?.status === 401) {
        title = 'Sessão Expirada ❌';
        message = 'Sua sessão expirou. Faça login novamente.';
        setTimeout(() => router.replace('/gym/login'), 2000);
      } else if (error.response?.status === 404) {
        title = 'Token Não Encontrado ❌';
        message = 'O código do token digitado não existe no sistema ou já foi utilizado.';
      } else if (error.response?.status === 400) {
        const detail = error.response.data?.detail || '';
        if (detail.includes('expirado')) {
          title = 'Token Expirado ❌';
          message = 'Este token já expirou. O cliente precisa gerar um novo token.';
        } else if (detail.includes('já foi utilizado')) {
          title = 'Token Já Utilizado ❌';
          message = 'Este token já foi usado anteriormente. Cada token só pode ser usado uma vez.';
        } else {
          title = 'Token Inválido ❌';
          message = detail || 'O token não é válido para uso.';
        }
      } else if (error.code === 'ECONNABORTED') {
        title = 'Timeout ❌';
        message = 'A validação demorou muito. Verifique sua conexão e tente novamente.';
      } else if (error.response?.status >= 500) {
        title = 'Erro do Servidor ❌';
        message = 'Erro interno do servidor. Tente novamente em alguns minutos.';
      } else {
        message = error.response?.data?.detail || error.message || 'Erro desconhecido na validação.';
      }

      Alert.alert(title, message);
    } finally {
      setLoading(false);
    }
  }, [tokenCode, router]);

  const checkAuthentication = useCallback(async () => {
    try {
      const gymToken = await AsyncStorage.getItem('gymToken');
      const gymData = await AsyncStorage.getItem('gymInfo');
      
      if (!gymToken) {
        console.log('❌ Academia não autenticada, redirecionando para login');
        router.replace('/gym/login');
        return;
      }

      if (gymData) {
        const gym = JSON.parse(gymData);
        setGymInfo(gym);
        console.log('✅ Academia autenticada:', gym.name);
      }
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      router.replace('/gym/login');
    }
  }, [router]);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Verificando autenticação...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#0B0D17', '#1E1A3C', '#2A1B4A']}
        style={styles.backgroundGradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.3)', 'rgba(139, 92, 246, 0.1)']}
              style={styles.backButtonGradient}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Validação de Tokens</Text>
            <Text style={styles.headerSubtitle}>{gymInfo?.name || 'Academia'}</Text>
          </View>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LinearGradient
              colors={['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.1)']}
              style={styles.logoutButtonGradient}
            >
              <Ionicons name="log-out" size={24} color="#EF4444" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Validation Form */}
          <View style={styles.validationContainer}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.06)']}
              style={styles.formGradient}
            >
              <View style={styles.formHeader}>
                <LinearGradient
                  colors={['#22C55E', '#16A34A']}
                  style={styles.formHeaderIcon}
                >
                  <Ionicons name="qr-code" size={32} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.formTitle}>Validar Token do Cliente</Text>
                <Text style={styles.formSubtitle}>Digite ou escaneie o código do token</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="ticket-outline" size={16} color="#22C55E" /> Código do Token
                </Text>
                <View style={styles.inputContainer}>
                  <LinearGradient
                    colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.08)']}
                    style={styles.inputGradient}
                  >
                    <View style={styles.inputIconContainer}>
                      <Ionicons name="ticket" size={20} color="#22C55E" />
                    </View>
                    <TextInput
                      style={styles.textInput}
                      value={tokenCode}
                      onChangeText={setTokenCode}
                      placeholder="Ex: ABC123DEF456"
                      placeholderTextColor="#64748B"
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                  </LinearGradient>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.validateButton, loading && styles.validateButtonDisabled]}
                onPress={validateToken}
                disabled={loading}
              >
                <LinearGradient
                  colors={loading ? ['#64748B', '#475569'] : ['#22C55E', '#16A34A', '#15803D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.validateButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.validateButtonText}>Validar Token</Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.08)']}
              style={styles.instructionsGradient}
            >
              <View style={styles.instructionHeader}>
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  style={styles.instructionIcon}
                >
                  <Ionicons name="information-circle" size={20} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.instructionTitle}>Como Validar Tokens</Text>
              </View>
              
              <View style={styles.instructionSteps}>
                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.instructionText}>
                    Cliente gera token no <Text style={styles.highlightText}>App Cliente</Text>
                  </Text>
                </View>
                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.instructionText}>
                    Cliente apresenta o <Text style={styles.highlightText}>código do token</Text>
                  </Text>
                </View>
                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.instructionText}>
                    Digite o código no campo acima e clique <Text style={styles.highlightText}>Validar</Text>
                  </Text>
                </View>
                <View style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>4</Text>
                  </View>
                  <Text style={styles.instructionText}>
                    Sistema confirma se token é <Text style={styles.highlightText}>válido ou inválido</Text>
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Status Info */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>Status do Sistema</Text>
            <View style={styles.statusItems}>
              <View style={styles.statusItem}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Sistema Online</Text>
              </View>
              <View style={styles.statusItem}>
                <Ionicons name="shield-checkmark" size={16} color="#22C55E" />
                <Text style={styles.statusText}>Validação Segura</Text>
              </View>
              <View style={styles.statusItem}>
                <Ionicons name="time" size={16} color="#F59E0B" />
                <Text style={styles.statusText}>Tokens Únicos</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
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
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  backButtonGradient: {
    flex: 1,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  logoutButtonGradient: {
    flex: 1,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  validationContainer: {
    marginTop: 32,
    marginBottom: 24,
  },
  formGradient: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  formHeaderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  inputContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  inputIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
    marginRight: 12,
  },
  validateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  validateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  validateButtonDisabled: {
    opacity: 0.6,
  },
  validateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsContainer: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  instructionsGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  instructionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionTitle: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionSteps: {
    gap: 12,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  instructionText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  highlightText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  statusContainer: {
    marginBottom: 32,
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  statusText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
});