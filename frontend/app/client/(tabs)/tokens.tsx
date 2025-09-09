import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Share
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = '/api';

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

  const copyTokenCode = useCallback(async (tokenCode: string) => {
    try {
      await Clipboard.setStringAsync(tokenCode);
      setSuccessMessage('✅ Código copiado para a área de transferência!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('❌ Erro ao copiar código');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  }, []);

  const shareToken = useCallback(async (tokenCode: string) => {
    try {
      await Share.share({
        message: `Meu token LuxePass: ${tokenCode}`,
        title: 'Token LuxePass'
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  }, []);

  const generateToken = useCallback(async (type: 'academia' | 'nutricionista') => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Sessão Expirada', 'Você precisa estar logado para gerar tokens');
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
        `${API_URL}/tokens/generate-simple`,
        {
          token_type: type,
          validity_hours: 4
        },
        { headers, timeout: 15000 }
      );

      console.log('✅ Token gerado com sucesso:', response.data);

      if (response.data.success) {
        setSuccessMessage(`🎉 Token ${type} gerado com sucesso!\n🎫 Código: ${response.data.token_code}\n⏰ Válido por 4 horas`);
        setErrorMessage('');
        
        // Reload tokens to show new one
        loadTokens();
        
        // Auto-hide success message after 8 seconds
        setTimeout(() => setSuccessMessage(''), 8000);
      } else {
        throw new Error(response.data.message || 'Erro na resposta do servidor');
      }

    } catch (error: any) {
      console.error('❌ Erro ao gerar token:', error);
      
      let errorMsg = 'Não foi possível gerar o token. Tente novamente.';
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Error data:', error.response.data);
        
        if (error.response.status === 401) {
          errorMsg = 'Sessão expirada. Faça login novamente.';
          setTimeout(() => router.replace('/client/login'), 2000);
        } else if (error.response.status === 429) {
          errorMsg = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
        } else if (error.response.status >= 500) {
          errorMsg = 'Erro interno do servidor. Tente novamente em alguns minutos.';
        } else {
          errorMsg = error.response.data?.detail || error.response.data?.message || errorMsg;
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMsg = 'Timeout na conexão. Verifique sua internet e tente novamente.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setErrorMessage(`❌ ${errorMsg}`);
      setSuccessMessage('');
      
      // Auto-hide error after 8 seconds
      setTimeout(() => setErrorMessage(''), 8000);
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

      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Load user tokens
      try {
        const response = await axios.get(`${API_URL}/users/tokens`, { headers });
        if (response.data && Array.isArray(response.data)) {
          setTokens(response.data);
        } else {
          console.log('No tokens found or invalid response format');
          setTokens([]);
        }
      } catch (error: any) {
        console.log('Error loading tokens:', error.response?.status);
        if (error.response?.status === 401) {
          router.replace('/client/login');
          return;
        }
        setTokens([]);
      }

      // Load stats
      try {
        const statsResponse = await axios.get(`${API_URL}/users/stats`, { headers });
        if (statsResponse.data) {
          setStats(statsResponse.data);
        }
      } catch (error) {
        console.log('Using demo stats data');
        // Keep default stats
      }

    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [router]);

  useEffect(() => {
    loadTokens();
    const interval = setInterval(loadTokens, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadTokens]);

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
              colors={['rgba(34, 197, 94, 0.3)', 'rgba(34, 197, 94, 0.1)']}
              style={styles.backButtonGradient}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>🎫 Meus Tokens</Text>
            <Text style={styles.headerSubtitle}>Geração e Gerenciamento</Text>
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

        {/* Success/Error Messages */}
        {successMessage !== '' && (
          <View style={styles.successMessage}>
            <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}
        
        {errorMessage !== '' && (
          <View style={styles.errorMessage}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={styles.statsContainer}>
            <LinearGradient
              colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.08)']}
              style={styles.statCard}
            >
              <Ionicons name="qr-code" size={28} color="#22C55E" />
              <Text style={styles.statNumber}>{stats.tokens_available}</Text>
              <Text style={styles.statLabel}>Disponíveis</Text>
            </LinearGradient>
            
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.08)']}
              style={styles.statCard}
            >
              <Ionicons name="checkmark-circle" size={28} color="#8B5CF6" />
              <Text style={styles.statNumber}>{stats.tokens_used}</Text>
              <Text style={styles.statLabel}>Usados</Text>
            </LinearGradient>
            
            <LinearGradient
              colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.08)']}
              style={styles.statCard}
            >
              <Ionicons name="add-circle" size={28} color="#F59E0B" />
              <Text style={styles.statNumber}>{stats.tokens_generated}</Text>
              <Text style={styles.statLabel}>Gerados</Text>
            </LinearGradient>
          </View>

          {/* Generate Tokens */}
          <View style={styles.generateSection}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.06)']}
              style={styles.generateContainer}
            >
              <View style={styles.generateHeader}>
                <LinearGradient
                  colors={['#22C55E', '#16A34A']}
                  style={styles.generateIcon}
                >
                  <Ionicons name="add" size={32} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.sectionTitle}>Gerar Novos Tokens</Text>
                <Text style={styles.sectionSubtitle}>Escolha o tipo de acesso desejado</Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.generateButton, loading && styles.generateButtonDisabled]}
                onPress={() => generateToken('academia')}
                disabled={loading}
              >
                <LinearGradient
                  colors={loading ? ['#64748B', '#475569'] : ['#22C55E', '#16A34A', '#15803D']}
                  style={styles.generateButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="fitness" size={20} color="#FFFFFF" />
                      <Text style={styles.generateButtonText}>Token Academia</Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.generateButton, loading && styles.generateButtonDisabled]}
                onPress={() => generateToken('nutricionista')}
                disabled={loading}
              >
                <LinearGradient
                  colors={loading ? ['#64748B', '#475569'] : ['#8B5CF6', '#A855F7', '#C084FC']}
                  style={styles.generateButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="nutrition" size={20} color="#FFFFFF" />
                      <Text style={styles.generateButtonText}>Token Nutricionista</Text>
                      <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Recent Tokens */}
          <View style={styles.tokensSection}>
            <Text style={styles.sectionTitle}>💎 Meus Tokens Ativos</Text>
            
            {tokens.length === 0 ? (
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.08)']}
                style={styles.emptyState}
              >
                <Ionicons name="qr-code-outline" size={64} color="#3B82F6" />
                <Text style={styles.emptyText}>Nenhum token gerado ainda</Text>
                <Text style={styles.emptySubtext}>Gere seus primeiros tokens acima para começar</Text>
              </LinearGradient>
            ) : (
              tokens.map((token, index) => (
                <LinearGradient
                  key={token.id || `token-${index}`}
                  colors={['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.06)']}
                  style={styles.tokenCard}
                >
                  <View style={styles.tokenHeader}>
                    <View style={styles.tokenTypeContainer}>
                      <LinearGradient
                        colors={token.type === 'academia' ? ['#22C55E', '#16A34A'] : ['#8B5CF6', '#A855F7']}
                        style={styles.tokenTypeIcon}
                      >
                        <Ionicons 
                          name={token.type === 'academia' ? 'fitness' : 'nutrition'} 
                          size={16} 
                          color="#FFFFFF"
                        />
                      </LinearGradient>
                      <Text style={styles.tokenType}>
                        {token.type === 'academia' ? '🏋️ Academia' : '🥗 Nutricionista'}
                      </Text>
                    </View>
                    <LinearGradient
                      colors={token.status === 'active' ? ['#22C55E', '#16A34A'] : ['#EF4444', '#DC2626']}
                      style={styles.tokenStatusBadge}
                    >
                      <Text style={styles.tokenStatusText}>
                        {token.status === 'active' ? 'ATIVO' : 'USADO'}
                      </Text>
                    </LinearGradient>
                  </View>

                  {/* Token Code Display */}
                  <View style={styles.tokenCodeContainer}>
                    <Text style={styles.tokenCodeLabel}>📱 Código do Token:</Text>
                    <LinearGradient
                      colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.08)']}
                      style={styles.tokenCodeDisplay}
                    >
                      <Text style={styles.tokenCode}>{token.code || token.token_code}</Text>
                      <View style={styles.tokenActions}>
                        <TouchableOpacity 
                          style={styles.actionButton} 
                          onPress={() => copyTokenCode(token.code || token.token_code)}
                        >
                          <Ionicons name="copy-outline" size={18} color="#22C55E" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.actionButton} 
                          onPress={() => shareToken(token.code || token.token_code)}
                        >
                          <Ionicons name="share-outline" size={18} color="#22C55E" />
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </View>

                  {/* Token Info */}
                  <View style={styles.tokenInfo}>
                    <View style={styles.tokenInfoRow}>
                      <Ionicons name="time-outline" size={16} color="#94A3B8" />
                      <Text style={styles.tokenInfoText}>
                        Criado: {new Date(token.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                    <View style={styles.tokenInfoRow}>
                      <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
                      <Text style={styles.tokenInfoText}>
                        Expira: {new Date(token.expires_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                    {token.used_at && (
                      <View style={styles.tokenInfoRow}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#22C55E" />
                        <Text style={styles.tokenInfoText}>
                          Usado: {new Date(token.used_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Usage Progress */}
                  <View style={styles.usageInfo}>
                    <Text style={styles.usageText}>
                      Usos: {token.usage_count || 0}/{token.max_usage || 1}
                    </Text>
                    <View style={styles.usageBar}>
                      <LinearGradient
                        colors={['#22C55E', '#16A34A']}
                        style={[
                          styles.usageProgress,
                          { width: `${((token.usage_count || 0) / (token.max_usage || 1)) * 100}%` }
                        ]}
                      />
                    </View>
                  </View>
                </LinearGradient>
              ))
            )}
          </View>

          {/* Instructions */}
          <View style={styles.instructionsSection}>
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.08)']}
              style={styles.instructionsContainer}
            >
              <View style={styles.instructionsHeader}>
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  style={styles.instructionsIcon}
                >
                  <Ionicons name="information-circle" size={24} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.instructionsTitle}>Como Usar seus Tokens</Text>
              </View>
              
              <View style={styles.instructionsSteps}>
                <View style={styles.instructionStep}>
                  <Text style={styles.stepNumber}>1</Text>
                  <Text style={styles.instructionText}>
                    Gere seu token clicando em "Token Academia" ou "Token Nutricionista"
                  </Text>
                </View>
                <View style={styles.instructionStep}>
                  <Text style={styles.stepNumber}>2</Text>
                  <Text style={styles.instructionText}>
                    Copie o código do token e apresente na academia/consultório
                  </Text>
                </View>
                <View style={styles.instructionStep}>
                  <Text style={styles.stepNumber}>3</Text>
                  <Text style={styles.instructionText}>
                    O profissional validará seu token e liberará o acesso
                  </Text>
                </View>
                <View style={styles.instructionStep}>
                  <Text style={styles.stepNumber}>4</Text>
                  <Text style={styles.instructionText}>
                    Tokens têm validade de 4 horas e são de uso único
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.bottomPadding} />
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
    fontSize: 20,
    fontWeight: 'bold',
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  generateSection: {
    marginBottom: 32,
  },
  generateContainer: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  generateHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  generateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  sectionSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
  },
  generateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
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
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  emptyText: {
    color: '#3B82F6',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  tokenCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tokenTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tokenTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenType: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tokenStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tokenStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tokenCodeContainer: {
    marginBottom: 16,
  },
  tokenCodeLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  tokenCodeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  tokenCode: {
    color: '#22C55E',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    flex: 1,
  },
  tokenActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenInfo: {
    marginBottom: 16,
  },
  tokenInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  tokenInfoText: {
    color: '#94A3B8',
    fontSize: 13,
    flex: 1,
  },
  usageInfo: {
    marginTop: 8,
  },
  usageText: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 6,
  },
  usageBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  usageProgress: {
    height: '100%',
    borderRadius: 3,
  },
  instructionsSection: {
    marginBottom: 32,
  },
  instructionsContainer: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  instructionsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsTitle: {
    color: '#3B82F6',
    fontSize: 18,
    fontWeight: '600',
  },
  instructionsSteps: {
    gap: 16,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
  },
  instructionText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    gap: 12,
  },
  successText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});