import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export default function ClientTokens() {
  const [loading, setLoading] = useState(false);
  const [tokens, setTokens] = useState<any[]>([]);
  const [stats, setStats] = useState({
    tokens_available: 50,
    tokens_used: 5,
    tokens_generated: 3
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Sair do App',
      'Deseja realmente sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            router.replace('/client/login');
          }
        }
      ]
    );
  }, [router]);

  const generateToken = useCallback(async (type: 'academia' | 'nutricionista') => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Erro', 'Você precisa estar logado para gerar tokens');
        router.replace('/client/login');
        return;
      }

      console.log('🚀 Gerando token tipo:', type);
      console.log('📡 API URL:', API_URL);

      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.post(
        `${API_URL}/api/tokens/generate-simple`,
        {
          token_type: type,
          validity_hours: 4
        },
        { headers, timeout: 10000 }
      );

      console.log('✅ Token gerado com sucesso:', response.data);

      // Show success message in UI instead of alert (works better on web)
      setSuccessMessage(`Token ${type} gerado! Código: ${response.data.token_code}`);
      setErrorMessage('');
      
      // Hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // Reload tokens
      loadTokens();

    } catch (error: any) {
      console.error('❌ Erro ao gerar token:', error);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }
      
      if (error.response?.status === 401) {
        Alert.alert('Sessão Expirada', 'Faça login novamente');
        router.replace('/client/login');
      } else {
        setErrorMessage(
          error.response?.data?.detail || 'Não foi possível gerar o token. Tente novamente.'
        );
        setSuccessMessage('');
        
        // Hide error message after 5 seconds
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadTokens = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/client/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Carregar tokens do usuário
      try {
        const response = await axios.get(`${API_URL}/api/users/tokens`, { headers });
        setTokens(response.data || []);
      } catch (error) {
        console.log('Usando dados demo para tokens');
        setTokens([]);
      }

      // Carregar estatísticas
      try {
        const statsResponse = await axios.get(`${API_URL}/api/users/stats`, { headers });
        setStats(statsResponse.data);
      } catch (error) {
        console.log('Usando dados demo para stats');
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }, [router]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Meus Tokens</Text>
        </View>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color="#FF4444" />
        </TouchableOpacity>
      </View>

      {/* Success/Error Messages */}
      {successMessage !== '' && (
        <View style={styles.successMessage}>
          <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}
      
      {errorMessage !== '' && (
        <View style={styles.errorMessage}>
          <Ionicons name="close-circle" size={20} color="#FF4444" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="qr-code" size={24} color="#8B5CF6" />
            <Text style={styles.statNumber}>{stats.tokens_available}</Text>
            <Text style={styles.statLabel}>Disponíveis</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
            <Text style={styles.statNumber}>{stats.tokens_used}</Text>
            <Text style={styles.statLabel}>Usados</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="add-circle" size={24} color="#F59E0B" />
            <Text style={styles.statNumber}>{stats.tokens_generated}</Text>
            <Text style={styles.statLabel}>Gerados</Text>
          </View>
        </View>

        {/* Generate Tokens */}
        <View style={styles.generateSection}>
          <Text style={styles.sectionTitle}>Gerar Novos Tokens</Text>
          
          <TouchableOpacity 
            style={[styles.generateButton, styles.academiaButton]}
            onPress={() => generateToken('academia')}
            disabled={loading}
          >
            <Ionicons name="fitness" size={20} color="#FFFFFF" />
            <Text style={styles.generateButtonText}>
              {loading ? 'Gerando...' : 'Token Academia'}
            </Text>
            {loading && <ActivityIndicator size="small" color="#FFFFFF" />}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.generateButton, styles.nutricionistaButton]}
            onPress={() => generateToken('nutricionista')}
            disabled={loading}
          >
            <Ionicons name="nutrition" size={20} color="#FFFFFF" />
            <Text style={styles.generateButtonText}>
              {loading ? 'Gerando...' : 'Token Nutricionista'}
            </Text>
            {loading && <ActivityIndicator size="small" color="#FFFFFF" />}
          </TouchableOpacity>
        </View>

        {/* Recent Tokens */}
        <View style={styles.tokensSection}>
          <Text style={styles.sectionTitle}>Tokens Recentes</Text>
          
          {tokens.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="qr-code-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>Nenhum token gerado ainda</Text>
              <Text style={styles.emptySubtext}>Gere seus primeiros tokens acima</Text>
            </View>
          ) : (
            tokens.map((token, index) => (
              <View key={index} style={styles.tokenCard}>
                <View style={styles.tokenHeader}>
                  <Ionicons 
                    name={token.type === 'academia' ? 'fitness' : 'nutrition'} 
                    size={20} 
                    color={token.type === 'academia' ? '#8B5CF6' : '#22C55E'} 
                  />
                  <Text style={styles.tokenType}>
                    {token.type === 'academia' ? 'Academia' : 'Nutricionista'}
                  </Text>
                  <Text style={styles.tokenStatus}>
                    {token.status === 'active' ? '✅ Ativo' : '❌ Usado'}
                  </Text>
                </View>
                <Text style={styles.tokenCode}>{token.code}</Text>
                <Text style={styles.tokenExpiry}>
                  Expira: {new Date(token.expires_at).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutFullButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color="#FFFFFF" />
            <Text style={styles.logoutFullText}>Sair do App</Text>
          </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  generateSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  academiaButton: {
    backgroundColor: '#8B5CF6',
  },
  nutricionistaButton: {
    backgroundColor: '#22C55E',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tokensSection: {
    marginBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 16,
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 4,
  },
  tokenCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tokenType: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  tokenStatus: {
    color: '#94A3B8',
    fontSize: 12,
  },
  tokenCode: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  tokenExpiry: {
    color: '#64748B',
    fontSize: 12,
  },
  logoutSection: {
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoutFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4444',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  logoutFullText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    gap: 8,
  },
  successText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    gap: 8,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});