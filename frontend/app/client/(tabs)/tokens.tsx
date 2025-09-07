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
  Modal,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface TokenData {
  token_code: string;
  token_type: string;
  expires_at: string;
  created_by_checkin: boolean;
  location_name?: string;
}

interface CheckinHistory {
  id: string;
  type: 'gym' | 'nutritionist';
  location_name: string;
  checkin_time: string;
  token_code: string;
  status: string;
}

export default function Tokens() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentToken, setCurrentToken] = useState<TokenData | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [checkinHistory, setCheckinHistory] = useState<CheckinHistory[]>([]);
  const [stats, setStats] = useState({
    tokens_available: 0,
    tokens_used: 0,
    gyms_visited: 0
  });

  useEffect(() => {
    loadStats();
    loadCheckinHistory();
  }, []);

  const loadStats = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/users/stats`, { headers });
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadCheckinHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/checkins/history`, { headers });
      setCheckinHistory(response.data.history || []);
    } catch (error) {
      console.error('Error loading checkin history:', error);
    }
  };

  const checkinGym = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Erro', 'Você precisa estar logado para fazer check-in');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Para demonstração, usar ID de academia padrão
      const gymId = "demo_gym_123";
      
      const response = await axios.post(
        `${API_URL}/api/checkin/gym/${gymId}`, 
        {}, 
        { headers }
      );

      const result = response.data;
      
      Alert.alert(
        'Check-in Realizado! 🏋️‍♂️', 
        `${result.message}\n\n🎟️ Token: ${result.token_code}\n⏰ Válido até: ${new Date(result.expires_at).toLocaleString('pt-BR')}\n🏢 Local: ${result.gym_name}`,
        [
          {
            text: 'Ver Token',
            onPress: () => {
              setCurrentToken({
                token_code: result.token_code,
                token_type: 'gym',
                expires_at: result.expires_at,
                created_by_checkin: true,
                location_name: result.gym_name
              });
              setShowQRModal(true);
            }
          },
          { text: 'OK' }
        ]
      );

      // Refresh data
      await loadStats();
      await loadCheckinHistory();
      
    } catch (error: any) {
      console.error('Error in gym checkin:', error);
      const errorMessage = error.response?.data?.detail || 'Erro ao fazer check-in. Tente novamente.';
      Alert.alert('Erro no Check-in ❌', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const checkinNutritionist = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Erro', 'Você precisa estar logado para fazer check-in');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Para demonstração, usar ID de nutricionista padrão
      const nutritionistId = "demo_nutritionist_456";
      
      const response = await axios.post(
        `${API_URL}/api/checkin/nutritionist/${nutritionistId}`, 
        {}, 
        { headers }
      );

      const result = response.data;
      
      Alert.alert(
        'Check-in Realizado! 🍎', 
        `${result.message}\n\n🎟️ Token: ${result.token_code}\n⏰ Válido até: ${new Date(result.expires_at).toLocaleString('pt-BR')}\n👩‍⚕️ Profissional: ${result.nutritionist_name}`,
        [
          {
            text: 'Ver Token',
            onPress: () => {
              setCurrentToken({
                token_code: result.token_code,
                token_type: 'nutritionist',
                expires_at: result.expires_at,
                created_by_checkin: true,
                location_name: result.nutritionist_name
              });
              setShowQRModal(true);
            }
          },
          { text: 'OK' }
        ]
      );

      // Refresh data
      await loadStats();
      await loadCheckinHistory();
      
    } catch (error: any) {
      console.error('Error in nutritionist checkin:', error);
      const errorMessage = error.response?.data?.detail || 'Erro ao fazer check-in. Tente novamente.';
      Alert.alert('Erro no Check-in ❌', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const generateSimpleToken = async (type: 'gym' | 'nutritionist') => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Erro', 'Você precisa estar logado para gerar tokens');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(
        `${API_URL}/api/tokens/generate-simple?token_type=${type}`, 
        {}, 
        { headers }
      );

      const result = response.data;
      
      Alert.alert(
        'Token Gerado! ✅', 
        `${result.message}\n\n🎟️ Código: ${result.token_code}\n📱 Tipo: ${type === 'gym' ? 'Academia' : 'Nutricionista'}\n⏰ Válido até: ${new Date(result.expires_at).toLocaleString('pt-BR')}`,
        [
          {
            text: 'Ver Token',
            onPress: () => {
              setCurrentToken({
                token_code: result.token_code,
                token_type: result.token_type,
                expires_at: result.expires_at,
                created_by_checkin: false
              });
              setShowQRModal(true);
            }
          },
          { text: 'OK' }
        ]
      );

      // Refresh data
      await loadStats();
      await loadCheckinHistory();
      
    } catch (error: any) {
      console.error('Error generating token:', error);
      const errorMessage = error.response?.data?.detail || 'Erro ao gerar token. Tente novamente.';
      Alert.alert('Erro ao Gerar Token ❌', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  const isTokenExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt);
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expirado';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m restantes`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tokens</Text>
        <Text style={styles.subtitle}>Gerencie seus tokens de acesso</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadStats} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="qr-code" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.statNumber}>{stats.tokens_available}</Text>
            <Text style={styles.statLabel}>Tokens Disponíveis</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
            </View>
            <Text style={styles.statNumber}>{stats.tokens_used}</Text>
            <Text style={styles.statLabel}>Tokens Utilizados</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="location" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statNumber}>{stats.gyms_visited}</Text>
            <Text style={styles.statLabel}>Academias Visitadas</Text>
          </View>
        </View>

        {/* Current Token */}
        {currentToken && !isTokenExpired(currentToken.expires_at) && (
          <View style={styles.currentTokenContainer}>
            <Text style={styles.sectionTitle}>Token Ativo</Text>
            <View style={styles.currentTokenCard}>
              <View style={styles.tokenHeader}>
                <View style={styles.tokenTypeIcon}>
                  <Ionicons 
                    name={currentToken.token_type === 'gym' ? 'fitness' : 'restaurant'} 
                    size={24} 
                    color="#FFFFFF" 
                  />
                </View>
                <View style={styles.tokenInfo}>
                  <Text style={styles.tokenType}>
                    {currentToken.token_type === 'gym' ? 'Academia' : 'Nutricionista'}
                  </Text>
                  <Text style={styles.tokenExpiry}>
                    {getTimeRemaining(currentToken.expires_at)}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.qrButton}
                  onPress={() => setShowQRModal(true)}
                >
                  <Ionicons name="qr-code" size={20} color="#8B5CF6" />
                </TouchableOpacity>
              </View>
              <Text style={styles.tokenCode}>Código: {currentToken.token_code}</Text>
            </View>
          </View>
        )}

        {/* Token Generation */}
        <View style={styles.generationContainer}>
          <Text style={styles.sectionTitle}>Gerar Novo Token</Text>
          
          <View style={styles.tokenTypes}>
            <TouchableOpacity 
              style={[styles.tokenTypeCard, styles.gymTokenCard]}
              onPress={() => generateSimpleToken('gym')}
              disabled={loading || stats.tokens_available <= 0}
            >
              <View style={styles.tokenCardIcon}>
                <Ionicons name="fitness" size={32} color="#22C55E" />
              </View>
              <Text style={styles.tokenCardTitle}>Academia</Text>
              <Text style={styles.tokenCardDescription}>
                Gerar token para acesso às academias parceiras
              </Text>
              <View style={styles.tokenCardFeatures}>
                <Text style={styles.tokenFeature}>• Válido por 3 horas</Text>
                <Text style={styles.tokenFeature}>• QR Code único</Text>
                <Text style={styles.tokenFeature}>• Acesso direto</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tokenTypeCard, styles.nutritionistTokenCard]}
              onPress={() => generateSimpleToken('nutritionist')}
              disabled={loading || stats.tokens_available <= 0}
            >
              <View style={styles.tokenCardIcon}>
                <Ionicons name="restaurant" size={32} color="#F59E0B" />
              </View>
              <Text style={styles.tokenCardTitle}>Nutricionista</Text>
              <Text style={styles.tokenCardDescription}>
                Gerar token para consulta nutricional
              </Text>
              <View style={styles.tokenCardFeatures}>
                <Text style={styles.tokenFeature}>• Consulta online/presencial</Text>
                <Text style={styles.tokenFeature}>• Plano personalizado</Text>
                <Text style={styles.tokenFeature}>• Acompanhamento</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Check-in Section */}
        <View style={styles.generationContainer}>
          <Text style={styles.sectionTitle}>Check-in Direto</Text>
          
          <View style={styles.tokenTypes}>
            <TouchableOpacity 
              style={[styles.tokenTypeCard, styles.checkinCard]}
              onPress={checkinGym}
              disabled={loading}
            >
              <View style={styles.tokenCardIcon}>
                <Ionicons name="location" size={32} color="#3B82F6" />
              </View>
              <Text style={styles.tokenCardTitle}>Check-in Academia</Text>
              <Text style={styles.tokenCardDescription}>
                Fazer check-in direto na academia e gerar token automaticamente
              </Text>
              <View style={styles.tokenCardFeatures}>
                <Text style={styles.tokenFeature}>• Token gerado automaticamente</Text>
                <Text style={styles.tokenFeature}>• Localização automática</Text>
                <Text style={styles.tokenFeature}>• Histórico salvo</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tokenTypeCard, styles.checkinCard]}
              onPress={checkinNutritionist}
              disabled={loading}
            >
              <View style={styles.tokenCardIcon}>
                <Ionicons name="person" size={32} color="#8B5CF6" />
              </View>
              <Text style={styles.tokenCardTitle}>Check-in Nutricionista</Text>
              <Text style={styles.tokenCardDescription}>
                Fazer check-in com nutricionista e gerar token de consulta
              </Text>
              <View style={styles.tokenCardFeatures}>
                <Text style={styles.tokenFeature}>• Consulta confirmada</Text>
                <Text style={styles.tokenFeature}>• Profissional identificado</Text>
                <Text style={styles.tokenFeature}>• Histórico completo</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.sectionTitle}>Dicas de Uso</Text>
          <View style={styles.tipsCard}>
            <View style={styles.tip}>
              <Ionicons name="time" size={20} color="#8B5CF6" />
              <Text style={styles.tipText}>
                Gere seu token com antecedência, mas lembre-se da validade
              </Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="qr-code" size={20} color="#8B5CF6" />
              <Text style={styles.tipText}>
                Apresente o QR Code na recepção da academia
              </Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="calendar" size={20} color="#8B5CF6" />
              <Text style={styles.tipText}>
                Novos tokens são creditados diariamente
              </Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="shield-checkmark" size={20} color="#8B5CF6" />
              <Text style={styles.tipText}>
                Não compartilhe seus tokens com outras pessoas
              </Text>
            </View>
          </View>
        </View>

        {/* Check-in History */}
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>Histórico de Check-ins</Text>
          {checkinHistory.length > 0 ? (
            checkinHistory.map((item, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={[
                  styles.historyIcon,
                  { backgroundColor: item.status === 'completed' ? '#22C55E20' : '#EF444420' }
                ]}>
                  <Ionicons 
                    name={item.type === 'gym' ? 'fitness' : 'restaurant'} 
                    size={20} 
                    color={item.status === 'completed' ? '#22C55E' : '#EF4444'} 
                  />
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyTitle}>{item.location_name}</Text>
                  <Text style={styles.historyDate}>{formatDate(item.checkin_time)}</Text>
                  <Text style={styles.historyToken}>Token: {item.token_code}</Text>
                </View>
                <View style={[
                  styles.historyStatus,
                  { backgroundColor: item.status === 'completed' ? '#22C55E20' : '#EF444420' }
                ]}>
                  <Text style={[
                    styles.historyStatusText,
                    { color: item.status === 'completed' ? '#22C55E' : '#EF4444' }
                  ]}>
                    {item.status === 'completed' ? 'Concluído' : 'Pendente'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyHistory}>
              <Ionicons name="time-outline" size={48} color="#64748B" />
              <Text style={styles.emptyHistoryText}>Nenhum check-in realizado ainda</Text>
              <Text style={styles.emptyHistorySubtext}>
                Faça seu primeiro check-in usando os botões acima
              </Text>
            </View>
          )}
        </View>

        {/* Token History */}
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>Histórico Recente</Text>
          {[
            { type: 'gym', gym: 'SmartFit Paulista', date: '2025-01-20T14:30:00Z', status: 'used' },
            { type: 'nutritionist', gym: 'Dra. Ana Carolina', date: '2025-01-19T10:00:00Z', status: 'used' },
            { type: 'gym', gym: 'Bio Ritmo', date: '2025-01-18T18:15:00Z', status: 'expired' },
            { type: 'gym', gym: 'Academia Central', date: '2025-01-17T16:45:00Z', status: 'used' }
          ].map((item, index) => (
            <View key={index} style={styles.historyItem}>
              <View style={[
                styles.historyIcon,
                { backgroundColor: item.status === 'used' ? '#22C55E20' : '#EF444420' }
              ]}>
                <Ionicons 
                  name={item.type === 'gym' ? 'fitness' : 'restaurant'} 
                  size={20} 
                  color={item.status === 'used' ? '#22C55E' : '#EF4444'} 
                />
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyTitle}>{item.gym}</Text>
                <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
              </View>
              <View style={[
                styles.historyStatus,
                { backgroundColor: item.status === 'used' ? '#22C55E20' : '#EF444420' }
              ]}>
                <Text style={[
                  styles.historyStatusText,
                  { color: item.status === 'used' ? '#22C55E' : '#EF4444' }
                ]}>
                  {item.status === 'used' ? 'Usado' : 'Expirado'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seu Token</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowQRModal(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {currentToken && (
              <>
                <View style={styles.qrContainer}>
                  <View style={styles.qrPlaceholder}>
                    <Ionicons name="qr-code" size={120} color="#8B5CF6" />
                    <Text style={styles.qrPlaceholderText}>QR Code</Text>
                  </View>
                </View>
                
                <View style={styles.tokenDetails}>
                  <Text style={styles.tokenDetailLabel}>Tipo:</Text>
                  <Text style={styles.tokenDetailValue}>
                    {currentToken.token_type === 'gym' ? 'Academia' : 'Nutricionista'}
                  </Text>
                  
                  <Text style={styles.tokenDetailLabel}>Código:</Text>
                  <Text style={styles.tokenDetailValue}>{currentToken.token_code}</Text>
                  
                  <Text style={styles.tokenDetailLabel}>Expira em:</Text>
                  <Text style={styles.tokenDetailValue}>
                    {getTimeRemaining(currentToken.expires_at)}
                  </Text>

                  {currentToken.created_by_checkin && currentToken.location_name && (
                    <>
                      <Text style={styles.tokenDetailLabel}>Local:</Text>
                      <Text style={styles.tokenDetailValue}>{currentToken.location_name}</Text>
                    </>
                  )}
                </View>
                
                <Text style={styles.qrInstructions}>
                  {currentToken.created_by_checkin 
                    ? 'Token gerado automaticamente pelo check-in'
                    : 'Apresente este QR Code na recepção da academia ou para o nutricionista'
                  }
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>
            {currentToken?.created_by_checkin ? 'Fazendo check-in...' : 'Gerando token...'}
          </Text>
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statIcon: {
    marginBottom: 8,
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  currentTokenContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  currentTokenCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tokenTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenType: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tokenExpiry: {
    color: '#A855F7',
    fontSize: 14,
  },
  qrButton: {
    padding: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
  },
  tokenCode: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  generationContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  tokenTypes: {
    gap: 16,
  },
  tokenTypeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  gymTokenCard: {
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  nutritionistTokenCard: {
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  checkinCard: {
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  tokenCardIcon: {
    marginBottom: 12,
  },
  tokenCardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  tokenCardDescription: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  tokenCardFeatures: {
    alignItems: 'flex-start',
  },
  tokenFeature: {
    color: '#A1A1AA',
    fontSize: 12,
    marginBottom: 4,
  },
  tipsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  tipsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipText: {
    color: '#94A3B8',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  historyContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  historyDate: {
    color: '#94A3B8',
    fontSize: 12,
  },
  historyToken: {
    color: '#8B5CF6',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyHistoryText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyHistorySubtext: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrImage: {
    width: 200,
    height: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    borderStyle: 'dashed',
  },
  qrPlaceholderText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  tokenDetails: {
    marginBottom: 16,
  },
  tokenDetailLabel: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 4,
  },
  tokenDetailValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  qrInstructions: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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