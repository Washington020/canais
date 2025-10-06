import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
// import * as DocumentPicker from 'expo-document-picker'; // Removido temporariamente

const API_URL = '/api';

interface ClientData {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  plan_type: string;
  total_visits: number;
  profile_photo?: string;
  first_visit: string;
}

interface RevenueData {
  gym_id: string;
  check_in_value: number;
  monthly_stats: {
    checkins: number;
    revenue: number;
    month: string;
  };
  total_stats: {
    checkins: number;
    revenue: number;
  };
  last_30_days: {
    checkins: number;
    revenue: number;
  };
  contract_status: string;
}

interface ContractData {
  gym_id: string;
  contract_exists: boolean;
  check_in_value: number;
  contract_document?: string;
  signed_at?: string;
  status: string;
}

export default function GymDashboard() {
  const [activeTab, setActiveTab] = useState<'validation' | 'clients' | 'revenue' | 'contract'>('validation');
  const [tokenCode, setTokenCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [gymInfo, setGymInfo] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastValidation, setLastValidation] = useState<any>(null);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [newCheckInValue, setNewCheckInValue] = useState('');
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
        `${API_URL}/tokens/validate/${tokenCode.trim()}?gym_id=${gymInfo.id}`,
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

  const loadClientsReport = useCallback(async () => {
    if (!gymInfo?.id) return;
    
    try {
      const gymToken = await AsyncStorage.getItem('gymToken');
      const headers = { 'Authorization': `Bearer ${gymToken}` };
      
      const response = await axios.get(`${API_URL}/gym/${gymInfo.id}/clients-report`, { headers });
      setClients(response.data.clients);
    } catch (error) {
      console.error('Erro ao carregar relatório de clientes:', error);
    }
  }, [gymInfo]);

  const loadRevenueReport = useCallback(async () => {
    if (!gymInfo?.id) return;
    
    try {
      const gymToken = await AsyncStorage.getItem('gymToken');
      const headers = { 'Authorization': `Bearer ${gymToken}` };
      
      const response = await axios.get(`${API_URL}/gym/${gymInfo.id}/revenue-report`, { headers });
      setRevenueData(response.data);
    } catch (error) {
      console.error('Erro ao carregar relatório de receita:', error);
    }
  }, [gymInfo]);

  const loadContract = useCallback(async () => {
    if (!gymInfo?.id) return;
    
    try {
      const gymToken = await AsyncStorage.getItem('gymToken');
      const headers = { 'Authorization': `Bearer ${gymToken}` };
      
      const response = await axios.get(`${API_URL}/gym/${gymInfo.id}/contract`, { headers });
      setContractData(response.data);
      if (response.data.contract_exists) {
        setNewCheckInValue(response.data.check_in_value.toString());
      }
    } catch (error) {
      console.error('Erro ao carregar contrato:', error);
    }
  }, [gymInfo]);

  const updateCheckInValue = async () => {
    if (!newCheckInValue || parseFloat(newCheckInValue) < 0) {
      Alert.alert('Erro', 'Digite um valor válido por check-in');
      return;
    }

    try {
      const gymToken = await AsyncStorage.getItem('gymToken');
      const headers = { 'Authorization': `Bearer ${gymToken}` };
      
      await axios.put(
        `${API_URL}/gym/${gymInfo.id}/contract/value?check_in_value=${parseFloat(newCheckInValue)}`,
        {},
        { headers }
      );
      
      Alert.alert('✅ Sucesso', 'Valor por check-in atualizado com sucesso!');
      loadContract();
      loadRevenueReport();
    } catch (error) {
      console.error('Erro ao atualizar valor:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o valor.');
    }
  };

  const pickDocument = async () => {
    Alert.alert(
      'Anexar Contrato',
      'Funcionalidade de upload de documento será implementada em breve. Por enquanto, entre em contato com o suporte para anexar o contrato assinado.',
      [
        { text: 'Contatar Suporte', onPress: () => Alert.alert('Suporte', 'Entre em contato: suporte@luxepass.com') },
        { text: 'OK' }
      ]
    );
  };

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  useEffect(() => {
    if (isAuthenticated && gymInfo?.id) {
      if (activeTab === 'clients') loadClientsReport();
      if (activeTab === 'revenue') loadRevenueReport();
      if (activeTab === 'contract') loadContract();
    }
  }, [activeTab, isAuthenticated, gymInfo, loadClientsReport, loadRevenueReport, loadContract]);

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

  const renderValidationTab = () => (
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
              {lastValidation.user?.profile_photo && (
                <Image 
                  source={{ uri: lastValidation.user.profile_photo }} 
                  style={styles.clientPhoto}
                />
              )}
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );

  const renderClientsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>👥 Clientes Atendidos</Text>
        <Text style={styles.sectionSubtitle}>Total: {clients.length} clientes únicos</Text>
      </View>

      <ScrollView style={styles.clientsList}>
        {clients.map((client) => (
          <TouchableOpacity
            key={client.id}
            style={styles.clientCard}
            onPress={() => {
              setSelectedClient(client);
              setShowClientModal(true);
            }}
          >
            <LinearGradient colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']} style={styles.clientCardGradient}>
              <View style={styles.clientCardContent}>
                <View style={styles.clientCardInfo}>
                  <Text style={styles.clientCardName}>{client.full_name}</Text>
                  <Text style={styles.clientCardDetail}>📧 {client.email}</Text>
                  <Text style={styles.clientCardDetail}>🏃‍♂️ {client.total_visits} visitas</Text>
                  <View style={styles.planBadgeSmall}>
                    <Text style={styles.planTextSmall}>{client.plan_type}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#94A3B8" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderRevenueTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>💰 Relatório Financeiro</Text>
        <Text style={styles.sectionSubtitle}>Receita por check-ins</Text>
      </View>

      {revenueData && (
        <ScrollView>
          <View style={styles.revenueCards}>
            <LinearGradient colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.08)']} style={styles.revenueCard}>
              <Text style={styles.revenueCardTitle}>💵 Valor por Check-in</Text>
              <Text style={styles.revenueCardValue}>
                {revenueData.check_in_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </LinearGradient>

            <LinearGradient colors={['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.08)']} style={styles.revenueCard}>
              <Text style={styles.revenueCardTitle}>📅 {revenueData.monthly_stats.month}</Text>
              <Text style={styles.revenueCardValue}>
                {revenueData.monthly_stats.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
              <Text style={styles.revenueCardSubtitle}>{revenueData.monthly_stats.checkins} check-ins</Text>
            </LinearGradient>

            <LinearGradient colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.08)']} style={styles.revenueCard}>
              <Text style={styles.revenueCardTitle}>📈 Últimos 30 Dias</Text>
              <Text style={styles.revenueCardValue}>
                {revenueData.last_30_days.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
              <Text style={styles.revenueCardSubtitle}>{revenueData.last_30_days.checkins} check-ins</Text>
            </LinearGradient>

            <LinearGradient colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.08)']} style={styles.revenueCard}>
              <Text style={styles.revenueCardTitle}>🏆 Total Geral</Text>
              <Text style={styles.revenueCardValue}>
                {revenueData.total_stats.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
              <Text style={styles.revenueCardSubtitle}>{revenueData.total_stats.checkins} check-ins</Text>
            </LinearGradient>
          </View>
        </ScrollView>
      )}
    </View>
  );

  const renderContractTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📋 Gestão de Contrato</Text>
        <Text style={styles.sectionSubtitle}>Configure valores e documentos</Text>
      </View>

      <ScrollView>
        <View style={styles.contractSection}>
          <LinearGradient colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']} style={styles.contractCard}>
            <Text style={styles.contractCardTitle}>💰 Valor por Check-in</Text>
            <View style={styles.valueInputContainer}>
              <Text style={styles.valueLabel}>R$</Text>
              <TextInput
                style={styles.valueInput}
                value={newCheckInValue}
                onChangeText={setNewCheckInValue}
                placeholder="0,00"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.updateButton} onPress={updateCheckInValue}>
                <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.updateButtonGradient}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.updateButtonText}>Salvar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <LinearGradient colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']} style={styles.contractCard}>
            <Text style={styles.contractCardTitle}>📄 Documento do Contrato</Text>
            <Text style={styles.contractInfo}>
              Status: {contractData?.status === 'signed' ? '✅ Assinado' : '⏳ Pendente'}
            </Text>
            {contractData?.signed_at && (
              <Text style={styles.contractInfo}>
                Assinado em: {new Date(contractData.signed_at).toLocaleDateString('pt-BR')}
              </Text>
            )}
            
            <TouchableOpacity style={styles.documentButton} onPress={pickDocument}>
              <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.documentButtonGradient}>
                <Ionicons name="document-attach" size={20} color="#FFFFFF" />
                <Text style={styles.documentButtonText}>Anexar Contrato Assinado</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );

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
          {activeTab === 'validation' && renderValidationTab()}
          {activeTab === 'clients' && renderClientsTab()}
          {activeTab === 'revenue' && renderRevenueTab()}
          {activeTab === 'contract' && renderContractTab()}
        </ScrollView>

        {/* Client Details Modal */}
        <Modal visible={showClientModal} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={styles.modalContainer}>
            <LinearGradient colors={['#0B0D17', '#1E1A3C', '#2A1B4A']} style={styles.modalGradient}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detalhes do Cliente</Text>
                <TouchableOpacity onPress={() => setShowClientModal(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              
              {selectedClient && (
                <ScrollView style={styles.modalContent}>
                  <View style={styles.clientDetailCard}>
                    <Text style={styles.clientDetailName}>{selectedClient.full_name}</Text>
                    <Text style={styles.clientDetailInfo}>📧 {selectedClient.email}</Text>
                    <Text style={styles.clientDetailInfo}>📱 {selectedClient.phone}</Text>
                    <Text style={styles.clientDetailInfo}>🏃‍♂️ {selectedClient.total_visits} visitas total</Text>
                    <Text style={styles.clientDetailInfo}>📅 Primeira visita: {new Date(selectedClient.first_visit).toLocaleDateString('pt-BR')}</Text>
                    <View style={styles.planBadgeLarge}>
                      <Text style={styles.planTextLarge}>{selectedClient.plan_type}</Text>
                    </View>
                  </View>
                </ScrollView>
              )}
            </LinearGradient>
          </SafeAreaView>
        </Modal>
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
  clientPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginLeft: 16,
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
  clientsList: {
    maxHeight: 400,
  },
  clientCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  clientCardGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  clientCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientCardInfo: {
    flex: 1,
  },
  clientCardName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  clientCardDetail: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 2,
  },
  planBadgeSmall: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  planTextSmall: {
    color: '#22C55E',
    fontSize: 10,
    fontWeight: '600',
  },
  revenueCards: {
    gap: 16,
  },
  revenueCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  revenueCardTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  revenueCardValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  revenueCardSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
  },
  contractSection: {
    gap: 16,
  },
  contractCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  contractCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  valueInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  valueLabel: {
    color: '#22C55E',
    fontSize: 18,
    fontWeight: '600',
  },
  valueInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 16,
  },
  updateButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  updateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  contractInfo: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 8,
  },
  documentButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
  },
  documentButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  documentButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  clientDetailCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
  },
  clientDetailName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  clientDetailInfo: {
    color: '#E2E8F0',
    fontSize: 14,
    marginBottom: 8,
  },
  planBadgeLarge: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  planTextLarge: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
  },
});