import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = '/api';

interface GymInfo {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface ClientData {
  id: string;
  name: string;
  email: string;
  plan: string;
  token_code: string;
  valid_until: string;
}

interface CheckInRecord {
  id: string;
  client_name: string;
  check_in_time: string;
  token_code: string;
}

export default function GymDashboard() {
  const router = useRouter();
  const [gymInfo, setGymInfo] = useState<GymInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para funcionalidades
  const [tokenCode, setTokenCode] = useState('');
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [stats, setStats] = useState({
    todayCheckIns: 0,
    monthlyRevenue: 0,
    totalClients: 0
  });
  
  // Estados dos modais
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [tokenValidating, setTokenValidating] = useState(false);

  useEffect(() => {
    loadGymData();
  }, []);

  const loadGymData = async () => {
    try {
      const gymInfoStr = await AsyncStorage.getItem('gymInfo');
      const token = await AsyncStorage.getItem('gymToken');
      
      if (!gymInfoStr || !token) {
        Alert.alert('Sessão Expirada', 'Faça login novamente.', [
          { text: 'OK', onPress: () => router.replace('/gym/login') }
        ]);
        return;
      }

      const gymData = JSON.parse(gymInfoStr);
      setGymInfo(gymData);
      
      // Carregar estatísticas
      await loadStats();
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da academia');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = await AsyncStorage.getItem('gymToken');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Simular dados de estatísticas (substitua por endpoint real)
      setStats({
        todayCheckIns: Math.floor(Math.random() * 50),
        monthlyRevenue: Math.floor(Math.random() * 10000),
        totalClients: Math.floor(Math.random() * 200)
      });
      
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const validateToken = async () => {
    if (!tokenCode.trim()) {
      Alert.alert('Token Necessário', 'Digite o código do token para validar.');
      return;
    }

    setTokenValidating(true);
    try {
      const token = await AsyncStorage.getItem('gymToken');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Passar o gym_id como parâmetro de query
      const response = await axios.post(
        `${API_URL}/tokens/validate/${tokenCode}?gym_id=${gymInfo?.id}`, 
        {}, 
        { headers }
      );
      
      if (response.data.valid) {
        const userData = response.data.user;
        const tokenInfo = response.data.token_info;
        
        // Criar objeto cliente com dados completos
        const clientData = {
          id: userData.id,
          name: userData.full_name,
          email: userData.email,
          phone: userData.phone,
          cpf: userData.cpf,
          plan: userData.plan_type,
          profile_photo: userData.profile_photo,
          date_of_birth: userData.date_of_birth,
          address: userData.address,
          emergency_contact: userData.emergency_contact,
          medical_conditions: userData.medical_conditions,
          tokens_used_today: userData.tokens_used_today,
          member_since: userData.member_since,
          token_code: tokenInfo.token_code,
          token_type: tokenInfo.token_type,
          expires_at: tokenInfo.expires_at
        };
        
        setClientData(clientData);
        
        // Mostrar dados completos do cliente
        Alert.alert(
          '✅ TOKEN VÁLIDO!',
          `👤 Cliente: ${userData.full_name}\n` +
          `📧 Email: ${userData.email}\n` +
          `📱 Telefone: ${userData.phone}\n` +
          `🆔 CPF: ${userData.cpf}\n` +
          `🏅 Plano: ${userData.plan_type}\n` +
          `📅 Membro desde: ${new Date(userData.member_since).toLocaleDateString('pt-BR')}\n` +
          `🎫 Tokens usados hoje: ${userData.tokens_used_today}`,
          [
            { text: 'Ver Mais Detalhes', onPress: () => setShowClientDetails(true) },
            {
              text: 'Confirmar Check-in',
              onPress: () => performCheckIn(clientData)
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('Erro na validação:', error);
      const errorMessage = error.response?.data?.detail || 'Token inválido ou expirado';
      Alert.alert('❌ Token Inválido', errorMessage);
    } finally {
      setTokenValidating(false);
    }
  };

  const performCheckIn = async (client: ClientData) => {
    try {
      const token = await AsyncStorage.getItem('gymToken');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.post(`${API_URL}/gym/checkin`, {
        token_code: tokenCode,
        client_id: client.id
      }, { headers });
      
      if (response.data.success) {
        Alert.alert(
          '🎉 Check-in Realizado!',
          `${client.name} fez check-in com sucesso!`
        );
        
        // Limpar formulário e recarregar dados
        setTokenCode('');
        setClientData(null);
        setShowTokenModal(false);
        await loadStats();
      }
    } catch (error: any) {
      console.error('Erro no check-in:', error);
      Alert.alert('Erro', error.response?.data?.detail || 'Não foi possível realizar o check-in');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair do Sistema',
      'Deseja realmente sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('gymToken');
            await AsyncStorage.removeItem('gymInfo');
            router.replace('/gym/login');
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadGymData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={['#1E1B4B', '#3730A3']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.welcomeText}>Bem-vindo!</Text>
            <Text style={styles.gymName}>{gymInfo?.name}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
          <Text style={styles.statusText}>Sistema Ativo</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color="#8B5CF6" />
            <Text style={styles.statNumber}>{stats.todayCheckIns}</Text>
            <Text style={styles.statLabel}>Check-ins Hoje</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="card" size={24} color="#22C55E" />
            <Text style={styles.statNumber}>
              R$ {stats.monthlyRevenue.toLocaleString('pt-BR')}
            </Text>
            <Text style={styles.statLabel}>Receita Mensal</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="fitness" size={24} color="#F59E0B" />
            <Text style={styles.statNumber}>{stats.totalClients}</Text>
            <Text style={styles.statLabel}>Clientes Totais</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => setShowTokenModal(true)}
          >
            <LinearGradient
              colors={['#8B5CF6', '#A855F7']}
              style={styles.actionGradient}
            >
              <Ionicons name="qr-code" size={32} color="#FFFFFF" />
              <Text style={styles.actionTitle}>Validar Token</Text>
              <Text style={styles.actionSubtitle}>Escanear código do cliente</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => setShowStatsModal(true)}
          >
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              style={styles.actionGradient}
            >
              <Ionicons name="stats-chart" size={32} color="#FFFFFF" />
              <Text style={styles.actionTitle}>Ver Relatórios</Text>
              <Text style={styles.actionSubtitle}>Estatísticas detalhadas</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>Atividade Recente</Text>
          <View style={styles.activityCard}>
            <Ionicons name="time" size={20} color="#8B5CF6" />
            <Text style={styles.activityText}>
              Sistema funcionando corretamente
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Token Validation Modal */}
      <Modal visible={showTokenModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Validar Token</Text>
              <TouchableOpacity onPress={() => setShowTokenModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>
                Digite o código do token do cliente:
              </Text>
              
              <TextInput
                style={styles.tokenInput}
                value={tokenCode}
                onChangeText={setTokenCode}
                placeholder="Código do token (ex: ABC123)"
                placeholderTextColor="#64748B"
                autoCapitalize="characters"
                maxLength={10}
              />
              
              {clientData && (
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{clientData.name}</Text>
                  <Text style={styles.clientPlan}>Plano: {clientData.plan}</Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.validateButton}
                onPress={validateToken}
                disabled={tokenValidating}
              >
                {tokenValidating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    <Text style={styles.validateButtonText}>Validar Token</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Client Details Modal */}
      <Modal visible={showClientDetails} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes do Cliente</Text>
              <TouchableOpacity onPress={() => setShowClientDetails(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            {clientData && (
              <ScrollView style={styles.modalContent}>
                {/* Profile Photo */}
                {clientData.profile_photo && (
                  <View style={styles.photoContainer}>
                    <Image 
                      source={{ uri: clientData.profile_photo }} 
                      style={styles.profilePhoto}
                      resizeMode="cover"
                    />
                  </View>
                )}
                
                {/* Personal Info */}
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>📋 Informações Pessoais</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Nome:</Text>
                    <Text style={styles.infoValue}>{clientData.name}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email:</Text>
                    <Text style={styles.infoValue}>{clientData.email}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Telefone:</Text>
                    <Text style={styles.infoValue}>{clientData.phone || 'Não informado'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>CPF:</Text>
                    <Text style={styles.infoValue}>{clientData.cpf || 'Não informado'}</Text>
                  </View>
                  {clientData.date_of_birth && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Nascimento:</Text>
                      <Text style={styles.infoValue}>
                        {new Date(clientData.date_of_birth).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Plan Info */}
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>🏅 Plano e Membros</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Plano:</Text>
                    <Text style={[styles.infoValue, styles.planValue]}>{clientData.plan}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Membro desde:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(clientData.member_since).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Tokens usados hoje:</Text>
                    <Text style={styles.infoValue}>{clientData.tokens_used_today}</Text>
                  </View>
                </View>

                {/* Token Info */}
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>🎫 Informações do Token</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Código:</Text>
                    <Text style={styles.infoValue}>{clientData.token_code}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Tipo:</Text>
                    <Text style={styles.infoValue}>{clientData.token_type}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Expira em:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(clientData.expires_at).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                </View>

                {/* Address */}
                {clientData.address && Object.keys(clientData.address).length > 0 && (
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>📍 Endereço</Text>
                    <Text style={styles.addressText}>
                      {`${clientData.address.street || ''}, ${clientData.address.number || ''}\n${clientData.address.city || ''} - ${clientData.address.state || ''}\nCEP: ${clientData.address.zip || ''}`}
                    </Text>
                  </View>
                )}

                {/* Emergency Contact */}
                {clientData.emergency_contact && Object.keys(clientData.emergency_contact).length > 0 && (
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>🚨 Contato de Emergência</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Nome:</Text>
                      <Text style={styles.infoValue}>{clientData.emergency_contact.name || 'Não informado'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Telefone:</Text>
                      <Text style={styles.infoValue}>{clientData.emergency_contact.phone || 'Não informado'}</Text>
                    </View>
                  </View>
                )}

                {/* Medical Conditions */}
                {clientData.medical_conditions && clientData.medical_conditions.length > 0 && (
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>🏥 Condições Médicas</Text>
                    {clientData.medical_conditions.map((condition: string, index: number) => (
                      <Text key={index} style={styles.medicalCondition}>• {condition}</Text>
                    ))}
                  </View>
                )}

                {/* Actions */}
                <TouchableOpacity 
                  style={styles.checkInButton}
                  onPress={() => performCheckIn(clientData)}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.checkInButtonText}>Confirmar Check-in</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  welcomeText: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  gymName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 16,
    flex: 1,
  },
  actionSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginLeft: 16,
  },
  activityContainer: {
    marginBottom: 24,
  },
  activityCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activityText: {
    color: '#94A3B8',
    fontSize: 14,
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  modalSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 16,
  },
  tokenInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
  },
  clientInfo: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clientPlan: {
    color: '#22C55E',
    fontSize: 14,
    marginTop: 4,
  },
  validateButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  validateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#334155',
  },
  infoSection: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  infoLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    minWidth: 80,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  planValue: {
    color: '#22C55E',
    fontWeight: '600',
  },
  addressText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  medicalCondition: {
    color: '#F59E0B',
    fontSize: 14,
    marginBottom: 4,
  },
  checkInButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});