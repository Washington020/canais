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
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://luxeforma-app.preview.emergentagent.com';

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
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [checkinHistory, setCheckinHistory] = useState<CheckinHistory[]>([]);
  const [stats, setStats] = useState({
    tokens_available: 0,
    tokens_used: 0,
    gyms_visited: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadStats(),
      loadCheckinHistory()
    ]);
  };

  const loadStats = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      console.log('🔍 Loading stats from:', `${API_URL}/api/users/stats`);
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/users/stats`, { headers });
      console.log('📊 Stats response:', response.data);
      setStats(response.data);
    } catch (error) {
      console.error('❌ Error loading stats:', error);
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
      console.error('❌ Error loading checkin history:', error);
    }
  };

  const generateToken = async (type: 'gym' | 'nutritionist') => {
    console.log(`🎫 Generating ${type} token...`);
    setLoading(true);
    
    try {
      const authToken = await AsyncStorage.getItem('token');
      if (!authToken) {
        Alert.alert('Erro', 'Você precisa estar logado para gerar tokens');
        return;
      }

      console.log('🌐 API URL:', `${API_URL}/api/tokens/generate-simple?token_type=${type}`);
      
      const headers = { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axios.post(
        `${API_URL}/api/tokens/generate-simple?token_type=${type}`, 
        {}, 
        { headers }
      );

      console.log('✅ Token generated successfully:', response.data);
      const result = response.data;
      
      const tokenData = {
        token_code: result.token_code,
        token_type: result.token_type,
        expires_at: result.expires_at,
        created_by_checkin: false
      };
      
      setCurrentToken(tokenData);
      setShowTokenModal(true);
      
      Alert.alert(
        '🎉 Token Gerado!', 
        `Código: ${result.token_code}\nTipo: ${type === 'gym' ? '🏋️ Academia' : '🥗 Nutrição'}\nVálido até: ${new Date(result.expires_at).toLocaleString('pt-BR')}`,
        [
          { text: 'OK' }
        ]
      );

      // Refresh data
      await loadData();
      
    } catch (error: any) {
      console.error('❌ Error generating token:', error);
      console.error('📄 Error response:', error.response?.data);
      console.error('🔢 Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.detail || 'Erro ao gerar token. Verifique sua conexão.';
      Alert.alert('❌ Erro ao Gerar Token', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const shareToken = async () => {
    if (!currentToken) return;
    
    const message = `🎟️ Token LuxePass\n\n` +
                   `Código: ${currentToken.token_code}\n` +
                   `Tipo: ${currentToken.token_type === 'gym' ? '🏋️ Academia' : '🥗 Nutrição'}\n` +
                   `Válido até: ${new Date(currentToken.expires_at).toLocaleString('pt-BR')}\n\n` +
                   `Apresente este código na recepção.`;
    
    try {
      await Share.share({
        message: message,
        title: 'Token LuxePass'
      });
    } catch (error) {
      console.error('Error sharing:', error);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎟️ Meus Tokens</Text>
        <Text style={styles.subtitle}>Gere tokens para academia e nutrição</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
              <Ionicons name="fitness" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statNumber}>{stats.gyms_visited}</Text>
            <Text style={styles.statLabel}>Academias Visitadas</Text>
          </View>
        </View>

        {/* Token Generation Buttons */}
        <View style={styles.actionContainer}>
          <Text style={styles.sectionTitle}>🎯 Gerar Novos Tokens</Text>
          
          <TouchableOpacity 
            style={[styles.generateButton, styles.gymButton]} 
            onPress={() => generateToken('gym')}
            disabled={loading}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="fitness" size={24} color="#FFFFFF" />
              <View style={styles.buttonText}>
                <Text style={styles.buttonTitle}>🏋️ Token Academia</Text>
                <Text style={styles.buttonSubtitle}>Acesso para treinos</Text>
              </View>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.generateButton, styles.nutritionButton]} 
            onPress={() => generateToken('nutritionist')}
            disabled={loading}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="restaurant" size={24} color="#FFFFFF" />
              <View style={styles.buttonText}>
                <Text style={styles.buttonTitle}>🥗 Token Nutrição</Text>
                <Text style={styles.buttonSubtitle}>Consulta nutricional</Text>
              </View>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Check-in History */}
        {checkinHistory.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>📋 Histórico Recente</Text>
            {checkinHistory.slice(0, 5).map((item, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyIcon}>
                  <Ionicons 
                    name={item.type === 'gym' ? 'fitness' : 'restaurant'} 
                    size={16} 
                    color={item.type === 'gym' ? '#8B5CF6' : '#22C55E'} 
                  />
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyTitle}>{item.location_name}</Text>
                  <Text style={styles.historyDate}>{formatDate(item.checkin_time)}</Text>
                </View>
                <View style={styles.historyToken}>
                  <Text style={styles.historyTokenCode}>{item.token_code}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>💡 Como Usar</Text>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>1</Text>
            <Text style={styles.instructionText}>Gere seu token clicando nos botões acima</Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>2</Text>
            <Text style={styles.instructionText}>Apresente o código na recepção da academia/nutricionista</Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>3</Text>
            <Text style={styles.instructionText}>Os tokens são válidos por 4 horas após geração</Text>
          </View>
        </View>
      </ScrollView>

      {/* Token Display Modal */}
      <Modal
        visible={showTokenModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTokenModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎟️ Seu Token</Text>
            
            {currentToken && (
              <View style={styles.tokenDisplay}>
                <View style={styles.tokenCodeContainer}>
                  <Text style={styles.tokenCode}>{currentToken.token_code}</Text>
                </View>
                
                <Text style={styles.tokenType}>
                  {currentToken.token_type === 'gym' ? '🏋️ Academia' : '🥗 Nutrição'}
                </Text>
                
                <Text style={styles.tokenInfo}>
                  Válido até: {new Date(currentToken.expires_at).toLocaleString('pt-BR')}
                </Text>
                
                <Text style={styles.tokenStatus}>
                  {getTimeRemaining(currentToken.expires_at)}
                </Text>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.shareButton} onPress={shareToken}>
                <Ionicons name="share" size={20} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>Compartilhar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setShowTokenModal(false)}
              >
                <Text style={styles.closeButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  actionContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  generateButton: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gymButton: {
    backgroundColor: '#8B5CF6',
  },
  nutritionButton: {
    backgroundColor: '#22C55E',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    flex: 1,
    marginLeft: 16,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  historyContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  historyToken: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  historyTokenCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  instructionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  tokenDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tokenCodeContainer: {
    backgroundColor: '#0B0D17',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tokenCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B5CF6',
    textAlign: 'center',
    letterSpacing: 4,
  },
  tokenType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tokenInfo: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 4,
  },
  tokenStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22C55E',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  closeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});