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

export default function GymDashboard() {
  const [activeTab, setActiveTab] = useState<'validation' | 'clients' | 'revenue' | 'contract'>('validation');
  const [tokenCode, setTokenCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [gymInfo, setGymInfo] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastValidation, setLastValidation] = useState<any>(null);
  const router = useRouter();

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
              await AsyncStorage.removeItem('gymToken');
              await AsyncStorage.removeItem('gymInfo');
              router.replace('/academia');
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
      Alert.alert('⚠️ Campo Obrigatório', 'Por favor, digite o código do token para validar.');
      return;
    }

    setLoading(true);
    try {
      const gymToken = await AsyncStorage.getItem('gymToken');
      if (!gymToken) {
        Alert.alert('❌ Sessão Expirada', 'Faça login novamente.');
        return;
      }

      const headers = { 'Authorization': `Bearer ${gymToken}` };
      const response = await axios.post(
        `/api/tokens/validate/${tokenCode.trim()}?gym_id=${gymInfo.id}`,
        {},
        { headers }
      );

      const validationData = response.data;
      setLastValidation(validationData);

      if (validationData.valid) {
        const userData = validationData.user;
        
        Alert.alert(
          '✅ TOKEN VALIDADO COM SUCESSO!',
          `Cliente: ${userData.full_name}
Plano: ${userData.plan_type}
E-mail: ${userData.email}
Telefone: ${userData.phone || 'Não informado'}
CPF: ${userData.cpf || 'Não informado'}

Check-in realizado com sucesso!`,
          [{ text: 'OK', onPress: () => setTokenCode('') }]
        );
      }
    } catch (error: any) {
      console.error('Erro na validação:', error);
      Alert.alert('❌ Erro na Validação', error.response?.data?.detail || 'Não foi possível validar o token.');
    } finally {
      setLoading(false);
    }
  }, [tokenCode, gymInfo]);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#0B0D17', '#1E1A3C', '#2A1B4A']} style={styles.backgroundGradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#22C55E" />
            <Text style={styles.loadingText}>Verificando autenticação...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient colors={['#0B0D17', '#1E1A3C', '#2A1B4A']} style={styles.backgroundGradient}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{gymInfo?.name || 'Academia'}</Text>
            <Text style={styles.headerSubtitle}>Sistema de Gestão LuxePass</Text>
          </View>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LinearGradient colors={['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.1)']} style={styles.logoutButtonGradient}>
              <Ionicons name="log-out" size={24} color="#EF4444" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'validation' && styles.tabButtonActive]}
              onPress={() => setActiveTab('validation')}
            >
              <Ionicons name="qr-code" size={20} color={activeTab === 'validation' ? '#22C55E' : '#94A3B8'} />
              <Text style={[styles.tabButtonText, activeTab === 'validation' && styles.tabButtonTextActive]}>
                Validação
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'clients' && styles.tabButtonActive]}
              onPress={() => setActiveTab('clients')}
            >
              <Ionicons name="people" size={20} color={activeTab === 'clients' ? '#22C55E' : '#94A3B8'} />
              <Text style={[styles.tabButtonText, activeTab === 'clients' && styles.tabButtonTextActive]}>
                Clientes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'revenue' && styles.tabButtonActive]}
              onPress={() => setActiveTab('revenue')}
            >
              <Ionicons name="trending-up" size={20} color={activeTab === 'revenue' ? '#22C55E' : '#94A3B8'} />
              <Text style={[styles.tabButtonText, activeTab === 'revenue' && styles.tabButtonTextActive]}>
                Receita
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'contract' && styles.tabButtonActive]}
              onPress={() => setActiveTab('contract')}
            >
              <Ionicons name="document-text" size={20} color={activeTab === 'contract' ? '#22C55E' : '#94A3B8'} />
              <Text style={[styles.tabButtonText, activeTab === 'contract' && styles.tabButtonTextActive]}>
                Contrato
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Tab Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'validation' && (
            <View style={styles.tabContent}>
              <View style={styles.validationContainer}>
                <LinearGradient colors={['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.06)']} style={styles.formGradient}>
                  <View style={styles.formHeader}>
                    <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.formHeaderIcon}>
                      <Ionicons name="qr-code" size={32} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={styles.formTitle}>Validar Token do Cliente</Text>
                    <Text style={styles.formSubtitle}>Digite o código apresentado pelo cliente</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      <Ionicons name="ticket-outline" size={16} color="#22C55E" /> Código do Token
                    </Text>
                    <View style={styles.inputContainer}>
                      <LinearGradient colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.08)']} style={styles.inputGradient}>
                        <View style={styles.inputIconContainer}>
                          <Ionicons name="ticket" size={20} color="#22C55E" />
                        </View>
                        <TextInput
                          style={styles.textInput}
                          value={tokenCode}
                          onChangeText={setTokenCode}
                          placeholder="Ex: 12345"
                          placeholderTextColor="#64748B"
                          autoCapitalize="characters"
                          keyboardType="numeric"
                          maxLength={10}
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
                      colors={loading ? ['#64748B', '#475569'] : ['#22C55E', '#16A34A']}
                      style={styles.validateButtonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                          <Text style={styles.validateButtonText}>Validar Token</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </View>

              {lastValidation && (
                <View style={styles.resultContainer}>
                  <LinearGradient colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.08)']} style={styles.resultGradient}>
                    <View style={styles.resultHeader}>
                      <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                      <Text style={styles.resultTitle}>✅ Última Validação</Text>
                    </View>
                    
                    <View style={styles.clientDetailsCard}>
                      <View style={styles.clientInfo}>
                        <Text style={styles.clientName}>{lastValidation.user?.full_name}</Text>
                        <Text style={styles.clientDetail}>📧 {lastValidation.user?.email}</Text>
                        <Text style={styles.clientDetail}>📱 {lastValidation.user?.phone || 'Não informado'}</Text>
                        <Text style={styles.clientDetail}>🆔 CPF: {lastValidation.user?.cpf || 'Não informado'}</Text>
                        <View style={styles.planBadge}>
                          <Text style={styles.planText}>{lastValidation.user?.plan_type}</Text>
                        </View>
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              )}
            </View>
          )}

          {activeTab !== 'validation' && (
            <View style={styles.tabContent}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {activeTab === 'clients' && '👥 Clientes'}
                  {activeTab === 'revenue' && '💰 Receita'}  
                  {activeTab === 'contract' && '📋 Contrato'}
                </Text>
                <Text style={styles.sectionSubtitle}>Em breve...</Text>
              </View>
            </View>
          )}
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
  tabNavigation: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  tabButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  tabButtonTextActive: {
    color: '#22C55E',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  tabContent: {
    paddingVertical: 16,
  },
  validationContainer: {
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
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    textAlign: 'center',
  },
  validateButton: {
    borderRadius: 16,
    overflow: 'hidden',
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
  resultContainer: {
    marginBottom: 24,
  },
  resultGradient: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  resultTitle: {
    color: '#22C55E',
    fontSize: 18,
    fontWeight: '600',
  },
  clientDetailsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  clientDetail: {
    color: '#E2E8F0',
    fontSize: 14,
    marginBottom: 4,
  },
  planBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  planText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
  },
});