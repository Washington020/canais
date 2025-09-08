import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface TokenUsage {
  id: string;
  token_code: string;
  user_name: string;
  user_email: string;
  token_type: string;
  gym_name?: string;
  is_used: boolean;
  created_at: string;
  used_at?: string;
  expires_at: string;
}

interface TokenStats {
  total_generated: number;
  total_used: number;
  gym_tokens: number;
  nutritionist_tokens: number;
  usage_rate: number;
}

export default function AdminTokens() {
  const [tokens, setTokens] = useState<TokenUsage[]>([]);
  const [stats, setStats] = useState<TokenStats>({
    total_generated: 0,
    total_used: 0,
    gym_tokens: 0,
    nutritionist_tokens: 0,
    usage_rate: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'active' | 'used'>('stats');

  const router = useRouter();

  useEffect(() => {
    loadTokensData();
  }, []);

  const loadTokensData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Load token statistics
      const statsResponse = await axios.get(`${API_URL}/api/admin/tokens/stats`, { headers });
      setStats(statsResponse.data);

      // Load token usage data
      const tokensResponse = await axios.get(`${API_URL}/api/admin/tokens`, { headers });
      setTokens(tokensResponse.data);
      
    } catch (error: any) {
      console.error('Error loading tokens data:', error);
      if (error.response?.status === 401) {
        router.replace('/admin/login');
      } else {
        Alert.alert('Erro', 'Erro ao carregar dados de tokens');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTokensData();
  };

  const getTokenTypeColor = (type: string) => {
    switch (type) {
      case 'gym': return '#8B5CF6';
      case 'nutritionist': return '#22C55E';
      default: return '#64748B';
    }
  };

  const getTokenTypeName = (type: string) => {
    switch (type) {
      case 'gym': return 'Academia';
      case 'nutritionist': return 'Nutricionista';
      default: return 'Desconhecido';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isTokenExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt);
  };

  const filterTokens = () => {
    switch (activeTab) {
      case 'active':
        return tokens.filter(token => !token.is_used && !isTokenExpired(token.expires_at));
      case 'used':
        return tokens.filter(token => token.is_used);
      default:
        return tokens;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando dados de tokens...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Gestão de Tokens</Text>
        <Text style={styles.subtitle}>Monitore e gerencie tokens de acesso</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            Estatísticas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Ativos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'used' && styles.activeTab]}
          onPress={() => setActiveTab('used')}
        >
          <Text style={[styles.tabText, activeTab === 'used' && styles.activeTabText]}>
            Utilizados
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'stats' ? (
          <>
            {/* Enhanced Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                    <Ionicons name="qr-code" size={24} color="#8B5CF6" />
                  </View>
                  <Text style={styles.statValue}>{stats.total_generated}</Text>
                  <Text style={styles.statLabel}>Tokens Gerados</Text>
                </View>

                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                    <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                  </View>
                  <Text style={styles.statValue}>{stats.total_used}</Text>
                  <Text style={styles.statLabel}>Tokens Usados</Text>
                </View>

                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                    <Ionicons name="fitness" size={24} color="#8B5CF6" />
                  </View>
                  <Text style={styles.statValue}>{stats.gym_tokens}</Text>
                  <Text style={styles.statLabel}>Academia</Text>
                </View>

                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                    <Ionicons name="nutrition" size={24} color="#22C55E" />
                  </View>
                  <Text style={styles.statValue}>{stats.nutritionist_tokens}</Text>
                  <Text style={styles.statLabel}>Tokens Nutricionista</Text>
                </View>
              </View>

              <View style={styles.usageRateContainer}>
                <Text style={styles.usageRateTitle}>Taxa de Utilização</Text>
                <View style={styles.usageRateBar}>
                  <View 
                    style={[styles.usageRateFill, { width: `${stats.usage_rate}%` }]}
                  />
                </View>
                <Text style={styles.usageRateText}>{stats.usage_rate.toFixed(1)}% dos tokens foram utilizados</Text>
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.recentActivity}>
              <Text style={styles.sectionTitle}>Atividade Recente</Text>
              {tokens.slice(0, 5).map(token => (
                <View key={token.id} style={styles.activityItem}>
                  <View style={[styles.activityIcon, { backgroundColor: getTokenTypeColor(token.token_type) + '20' }]}>
                    <Ionicons 
                      name={token.token_type === 'gym' ? 'fitness' : 'nutrition'} 
                      size={16} 
                      color={getTokenTypeColor(token.token_type)} 
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      {token.user_name} - {getTokenTypeName(token.token_type)}
                    </Text>
                    <Text style={styles.activityTime}>
                      {token.is_used ? 'Usado' : 'Gerado'} • {formatDate(token.is_used ? token.used_at || '' : token.created_at)}
                    </Text>
                  </View>
                  {token.is_used && (
                    <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                  )}
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.tokensContainer}>
            {filterTokens().length > 0 ? filterTokens().map(token => (
              <View key={token.id} style={styles.tokenCard}>
                <View style={styles.tokenHeader}>
                  <View style={styles.tokenInfo}>
                    <Text style={styles.tokenCode}>{token.token_code}</Text>
                    <Text style={styles.tokenUser}>{token.user_name} • {token.user_email}</Text>
                    <View style={styles.tokenMeta}>
                      <View style={[styles.tokenTypeBadge, { backgroundColor: getTokenTypeColor(token.token_type) + '20' }]}>
                        <Text style={[styles.tokenTypeText, { color: getTokenTypeColor(token.token_type) }]}>
                          {getTokenTypeName(token.token_type)}
                        </Text>
                      </View>
                      {token.is_used && (
                        <View style={styles.usedBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
                          <Text style={styles.usedText}>Utilizado</Text>
                        </View>
                      )}
                      {!token.is_used && isTokenExpired(token.expires_at) && (
                        <View style={styles.expiredBadge}>
                          <Ionicons name="time" size={12} color="#F59E0B" />
                          <Text style={styles.expiredText}>Expirado</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.tokenDetails}>
                  <View style={styles.tokenDetail}>
                    <Ionicons name="calendar" size={14} color="#94A3B8" />
                    <Text style={styles.tokenDetailText}>
                      Criado: {formatDate(token.created_at)}
                    </Text>
                  </View>
                  
                  <View style={styles.tokenDetail}>
                    <Ionicons name="time" size={14} color="#94A3B8" />
                    <Text style={styles.tokenDetailText}>
                      Expira: {formatDate(token.expires_at)}
                    </Text>
                  </View>
                  
                  {token.is_used && token.used_at && (
                    <View style={styles.tokenDetail}>
                      <Ionicons name="checkmark" size={14} color="#22C55E" />
                      <Text style={[styles.tokenDetailText, { color: '#22C55E' }]}>
                        Usado: {formatDate(token.used_at)}
                      </Text>
                    </View>
                  )}
                  
                  {token.gym_name && (
                    <View style={styles.tokenDetail}>
                      <Ionicons name="business" size={14} color="#8B5CF6" />
                      <Text style={[styles.tokenDetailText, { color: '#8B5CF6' }]}>
                        Academia: {token.gym_name}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )) : (
              <View style={styles.emptyContainer}>
                <Ionicons 
                  name={activeTab === 'active' ? 'qr-code-outline' : 'checkmark-circle-outline'} 
                  size={64} 
                  color="#64748B" 
                />
                <Text style={styles.emptyText}>
                  {activeTab === 'active' ? 'Nenhum token ativo encontrado' : 'Nenhum token utilizado encontrado'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D17',
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#8B5CF6',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#8B5CF6',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  usageRateContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  usageRateTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  usageRateBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
  },
  usageRateFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },
  usageRateText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  recentActivity: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  activityTime: {
    color: '#94A3B8',
    fontSize: 12,
  },
  tokensContainer: {
    paddingHorizontal: 24,
  },
  tokenCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tokenHeader: {
    marginBottom: 12,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenCode: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  tokenUser: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 8,
  },
  tokenMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  tokenTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tokenTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  usedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  usedText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expiredText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  tokenDetails: {
    gap: 8,
  },
  tokenDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenDetailText: {
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});