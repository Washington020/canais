import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface ValidationResult {
  valid: boolean;
  user: {
    full_name: string;
    plan_type: string;
    email: string;
  };
  token_type: string;
}

interface ActiveUser {
  id: string;
  name: string;
  plan: string;
  checkInTime: string;
}

export default function GymValidation() {
  const [tokenCode, setTokenCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [gymInfo, setGymInfo] = useState({
    name: 'SmartFit Paulista',
    cnpj: '12.345.678/0001-99',
    address: 'Av. Paulista, 1578 - Bela Vista, São Paulo - SP',
    phone: '(11) 3251-2525',
    email: 'paulista@smartfit.com.br',
    type: 'Academia Tradicional',
    status: 'Aprovada',
    currentOccupancy: 42,
    maxCapacity: 120
  });
  const [gymData, setGymData] = useState<any>(null);
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Sair do Sistema',
      'Tem certeza que deseja sair do sistema da academia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all stored data
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('gymToken');
              await AsyncStorage.removeItem('gymId');
              await AsyncStorage.clear(); // Clear all AsyncStorage data
              
              // Navigate back to main screen
              router.replace('/');
              
              // Show success message
              setTimeout(() => {
                Alert.alert('Sucesso', 'Logout do sistema da academia realizado com sucesso!');
              }, 500);
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Erro', 'Erro ao fazer logout. Tente novamente.');
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadGymData();
    loadActiveUsers();
    const interval = setInterval(loadActiveUsers, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadGymData = async () => {
    try {
      const storedGymInfo = await AsyncStorage.getItem('gymInfo');
      if (storedGymInfo) {
        const parsedGymInfo = JSON.parse(storedGymInfo);
        setGymData(parsedGymInfo);
        
        // Update gym info with real data
        setGymInfo(prevInfo => ({
          ...prevInfo,
          name: parsedGymInfo.name || prevInfo.name,
          type: parsedGymInfo.type || prevInfo.type,
          status: parsedGymInfo.status || prevInfo.status,
        }));
      }
    } catch (error) {
      console.error('Error loading gym data:', error);
    }
  };

  const loadActiveUsers = () => {
    // Load initial active users
    const mockActiveUsers: ActiveUser[] = [
      { id: '1', name: 'João Silva', plan: 'Premium', checkInTime: '14:30' },
      { id: '2', name: 'Maria Santos', plan: 'Intermediário', checkInTime: '14:15' },
      { id: '3', name: 'Pedro Costa', plan: 'Premium', checkInTime: '14:00' },
      { id: '4', name: 'Ana Oliveira', plan: 'Básico', checkInTime: '13:45' }
    ];
    setActiveUsers(mockActiveUsers);
  };

  const validateToken = async () => {
    if (!tokenCode.trim()) {
      Alert.alert('Erro', 'Por favor, insira o código do token');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/tokens/validate/${tokenCode}?gym_id=gym-001`);
      
      setValidationResult(response.data);
      Alert.alert(
        'Token Válido! ✅',
        `Acesso liberado para ${response.data.user.full_name}`,
        [
          {
            text: 'Confirmar Entrada',
            onPress: () => {
              // Add user to active list
              const newUser: ActiveUser = {
                id: Date.now().toString(),
                name: response.data.user.full_name,
                plan: response.data.user.plan_type,
                checkInTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              };
              setActiveUsers(prev => [newUser, ...prev]);
              setGymInfo(prev => ({ ...prev, currentOccupancy: prev.currentOccupancy + 1 }));
              setTokenCode('');
              setValidationResult(null);
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Token validation error:', error);
      const errorMessage = error.response?.data?.detail || 'Token inválido ou expirado';
      Alert.alert('Token Inválido ❌', errorMessage);
      setValidationResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = () => {
    Alert.alert(
      'Entrada Manual',
      'Insira CPF ou email do cliente para busca manual:',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Buscar',
          onPress: () => {
            Alert.alert('Busca Manual', 'Funcionalidade em desenvolvimento');
          }
        }
      ]
    );
  };

  const getOccupancyColor = (occupancy: number, capacity: number) => {
    const percentage = (occupancy / capacity) * 100;
    if (percentage < 50) return '#22C55E';
    if (percentage < 80) return '#F59E0B';
    return '#EF4444';
  };

  const getOccupancyText = (occupancy: number, capacity: number) => {
    const percentage = (occupancy / capacity) * 100;
    if (percentage < 30) return 'Vazio';
    if (percentage < 60) return 'Moderado';
    if (percentage < 80) return 'Cheio';
    return 'Lotado';
  };

  const getPlanColor = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'premium': return '#FFD700';
      case 'intermediário': return '#8B5CF6';
      default: return '#22C55E';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        {/* Professional Gym Header */}
        <View style={styles.professionalHeader}>
          <View style={styles.gymLogoSection}>
            <View style={styles.gymLogo}>
              <Text style={styles.gymLogoText}>🏋️</Text>
            </View>
            <View style={styles.gymMainInfo}>
              <Text style={styles.gymName}>{gymInfo.name}</Text>
              <Text style={styles.gymType}>{gymInfo.type}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {/* Gym Details Card */}
          <View style={styles.gymDetailsCard}>
            <View style={styles.gymDetailsRow}>
              <View style={styles.gymDetailItem}>
                <Ionicons name="document-text" size={16} color="#8B5CF6" />
                <Text style={styles.gymDetailLabel}>CNPJ:</Text>
                <Text style={styles.gymDetailValue}>{gymInfo.cnpj}</Text>
              </View>
              <View style={styles.gymDetailItem}>
                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                <Text style={styles.gymDetailLabel}>Status:</Text>
                <Text style={[styles.gymDetailValue, { color: '#22C55E' }]}>{gymInfo.status}</Text>
              </View>
            </View>
            
            <View style={styles.gymDetailsRow}>
              <View style={styles.gymDetailItem}>
                <Ionicons name="location" size={16} color="#8B5CF6" />
                <Text style={styles.gymDetailLabel}>Endereço:</Text>
                <Text style={[styles.gymDetailValue, styles.addressText]}>{gymInfo.address}</Text>
              </View>
            </View>
            
            <View style={styles.gymDetailsRow}>
              <View style={styles.gymDetailItem}>
                <Ionicons name="call" size={16} color="#8B5CF6" />
                <Text style={styles.gymDetailLabel}>Telefone:</Text>
                <Text style={styles.gymDetailValue}>{gymInfo.phone}</Text>
              </View>
              <View style={styles.gymDetailItem}>
                <Ionicons name="mail" size={16} color="#8B5CF6" />
                <Text style={styles.gymDetailLabel}>Email:</Text>
                <Text style={styles.gymDetailValue}>{gymInfo.email}</Text>
              </View>
            </View>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.dashboardButton}
          onPress={() => router.push('/gym/dashboard')}
        >
          <Ionicons name="analytics" size={24} color="#22C55E" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Occupancy Status */}
        <View style={styles.occupancyContainer}>
          <Text style={styles.sectionTitle}>Status de Ocupação</Text>
          <View style={styles.occupancyCard}>
            <View style={styles.occupancyHeader}>
              <View style={styles.occupancyInfo}>
                <Text style={styles.occupancyNumber}>
                  {gymInfo.currentOccupancy}/{gymInfo.maxCapacity}
                </Text>
                <Text style={styles.occupancyLabel}>Pessoas</Text>
              </View>
              <View style={[
                styles.occupancyStatus,
                { backgroundColor: `${getOccupancyColor(gymInfo.currentOccupancy, gymInfo.maxCapacity)}20` }
              ]}>
                <View style={[
                  styles.occupancyDot,
                  { backgroundColor: getOccupancyColor(gymInfo.currentOccupancy, gymInfo.maxCapacity) }
                ]} />
                <Text style={[
                  styles.occupancyStatusText,
                  { color: getOccupancyColor(gymInfo.currentOccupancy, gymInfo.maxCapacity) }
                ]}>
                  {getOccupancyText(gymInfo.currentOccupancy, gymInfo.maxCapacity)}
                </Text>
              </View>
            </View>
            
            <View style={styles.occupancyBar}>
              <View style={[
                styles.occupancyFill,
                { 
                  width: `${(gymInfo.currentOccupancy / gymInfo.maxCapacity) * 100}%`,
                  backgroundColor: getOccupancyColor(gymInfo.currentOccupancy, gymInfo.maxCapacity)
                }
              ]} />
            </View>
          </View>
        </View>

        {/* Token Validation */}
        <View style={styles.validationContainer}>
          <Text style={styles.sectionTitle}>Validação de Token</Text>
          
          <View style={styles.validationCard}>
            <View style={styles.inputContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Código do Token</Text>
                <TextInput
                  style={styles.tokenInput}
                  value={tokenCode}
                  onChangeText={setTokenCode}
                  placeholder="Digite ou escaneie o código"
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              
              <TouchableOpacity 
                style={styles.scanButton}
                onPress={() => Alert.alert('QR Scanner', 'Funcionalidade de câmera em desenvolvimento')}
              >
                <Ionicons name="qr-code-outline" size={24} color="#22C55E" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.validateButton, loading && styles.validateButtonDisabled]}
                onPress={validateToken}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.validateButtonText}>Validar Token</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.manualButton}
                onPress={handleManualEntry}
              >
                <Ionicons name="person-add" size={20} color="#F59E0B" />
                <Text style={styles.manualButtonText}>Entrada Manual</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Active Users */}
        <View style={styles.activeUsersContainer}>
          <Text style={styles.sectionTitle}>Usuários Ativos na Academia</Text>
          
          {activeUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#64748B" />
              <Text style={styles.emptyStateText}>Nenhum usuário ativo no momento</Text>
            </View>
          ) : (
            <>
              {activeUsers.slice(0, 5).map((user) => (
                <View key={user.id} style={styles.activeUserCard}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {user.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <View style={styles.userMeta}>
                      <View style={[
                        styles.planBadge,
                        { backgroundColor: `${getPlanColor(user.plan)}20` }
                      ]}>
                        <Text style={[
                          styles.planBadgeText,
                          { color: getPlanColor(user.plan) }
                        ]}>
                          {user.plan}
                        </Text>
                      </View>
                      <Text style={styles.checkInTime}>Entrada: {user.checkInTime}</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.checkOutButton}
                    onPress={() => {
                      Alert.alert(
                        'Check-out',
                        `Confirma a saída de ${user.name}?`,
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Confirmar',
                            onPress: () => {
                              setActiveUsers(prev => prev.filter(u => u.id !== user.id));
                              setGymInfo(prev => ({ ...prev, currentOccupancy: prev.currentOccupancy - 1 }));
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="exit-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {activeUsers.length > 5 && (
                <View style={styles.moreUsersIndicator}>
                  <Text style={styles.moreUsersText}>
                    +{activeUsers.length - 5} usuários adicionais
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Estatísticas do Dia</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="log-in" size={24} color="#22C55E" />
              <Text style={styles.statNumber}>127</Text>
              <Text style={styles.statLabel}>Check-ins Hoje</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="time" size={24} color="#F59E0B" />
              <Text style={styles.statNumber}>68min</Text>
              <Text style={styles.statLabel}>Tempo Médio</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="trending-up" size={24} color="#8B5CF6" />
              <Text style={styles.statNumber}>89%</Text>
              <Text style={styles.statLabel}>Ocupação Pico</Text>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
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
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gymDetails: {
    flex: 1,
  },
  gymName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  gymSubtitle: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '500',
  },
  systemTitle: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  dashboardButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  occupancyContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  occupancyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
  },
  occupancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  occupancyInfo: {
    alignItems: 'center',
  },
  occupancyNumber: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  occupancyLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  occupancyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  occupancyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  occupancyStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  occupancyBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
  },
  occupancyFill: {
    height: '100%',
    borderRadius: 4,
  },
  validationContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  validationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  inputGroup: {
    flex: 1,
    marginRight: 12,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  tokenInput: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  scanButton: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  validateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    borderRadius: 8,
  },
  validateButtonDisabled: {
    opacity: 0.6,
  },
  validateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  manualButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  manualButtonText: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  activeUsersContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: '#64748B',
    fontSize: 16,
    marginTop: 12,
  },
  activeUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  checkInTime: {
    color: '#94A3B8',
    fontSize: 12,
  },
  checkOutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreUsersIndicator: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  moreUsersText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  statsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  // Professional Header Styles
  professionalHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  gymLogoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  gymLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gymLogoText: {
    fontSize: 24,
  },
  gymMainInfo: {
    flex: 1,
  },
  gymType: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  gymDetailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
  },
  gymDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gymDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  gymDetailLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
    marginRight: 4,
  },
  gymDetailValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  addressText: {
    fontSize: 11,
    lineHeight: 14,
  },
});