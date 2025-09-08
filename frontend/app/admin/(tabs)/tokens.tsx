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
export default function AdminTokens() {
  const [tokens, setTokens] = useState<TokenUsage[]>([]);
  const [stats, setStats] = useState<TokenStats>({
    total_generated: 0,
    total_used: 0,
    gym_tokens: 0,
    nutritionist_tokens: 0,
    usage_rate: 0
  intercommunicationSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  systemStatus: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  statusItem: {
    marginBottom: 16,
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  statusDetail: {
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 16,
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
      } else {
        Alert.alert('Erro', 'Erro ao carregar dados de tokens');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  const onRefresh = () => {
    setRefreshing(true);
  const getTokenTypeColor = (type: string) => {
    switch (type) {
      case 'gym': return '#8B5CF6';
      case 'nutritionist': return '#22C55E';
      default: return '#64748B';
  const getTokenTypeName = (type: string) => {
      case 'gym': return 'Academia';
      case 'nutritionist': return 'Nutricionista';
      default: return 'Desconhecido';
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  const isTokenExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt);
  const filterTokens = () => {
    switch (activeTab) {
      case 'active':
        return tokens.filter(token => !token.is_used && !isTokenExpired(token.expires_at));
      case 'used':
        return tokens.filter(token => token.is_used);
      default:
        return tokens;
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
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Ativos
          style={[styles.tab, activeTab === 'used' && styles.activeTab]}
          onPress={() => setActiveTab('used')}
          <Text style={[styles.tabText, activeTab === 'used' && styles.activeTabText]}>
            Utilizados
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
                  <View style={[styles.statIcon, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                    <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                  <Text style={styles.statValue}>{stats.total_used}</Text>
                  <Text style={styles.statLabel}>Tokens Usados</Text>
                    <Ionicons name="fitness" size={24} color="#8B5CF6" />
                  <Text style={styles.statValue}>{stats.gym_tokens}</Text>
                  <Text style={styles.statLabel}>Academia</Text>
                    <Ionicons name="nutrition" size={24} color="#22C55E" />
                  <Text style={styles.statValue}>{stats.nutritionist_tokens}</Text>
                  <Text style={styles.statLabel}>Nutricionista</Text>
              </View>
              <View style={styles.usageRateContainer}>
                <Text style={styles.usageRateTitle}>Taxa de Utilização</Text>
                <View style={styles.usageRateBar}>
                  <View 
                    style={[styles.usageRateFill, { width: `${stats.usage_rate}%` }]}
                  />
                <Text style={styles.usageRateText}>{stats.usage_rate.toFixed(1)}% dos tokens foram utilizados</Text>
            </View>
            {/* Intercommunication Status */}
            <View style={styles.intercommunicationSection}>
              <Text style={styles.sectionTitle}>🔄 Status de Intercomunicação</Text>
              
              <View style={styles.systemStatus}>
                <View style={styles.statusItem}>
                  <View style={styles.statusIndicator}>
                    <View style={[styles.statusDot, { backgroundColor: '#22C55E' }]} />
                    <Text style={styles.statusLabel}>App Cliente → Admin</Text>
                  <Text style={styles.statusDetail}>Tokens sendo gerados normalmente</Text>
                
                    <Text style={styles.statusLabel}>Admin → Academias</Text>
                  <Text style={styles.statusDetail}>Credenciais sendo enviadas</Text>
                    <View style={[styles.statusDot, { backgroundColor: '#22C55E' }]} />  
                    <Text style={styles.statusLabel}>Academia → Sistema</Text>
                  <Text style={styles.statusDetail}>Validação funcionando</Text>
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
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      {token.user_name} - {getTokenTypeName(token.token_type)}
                    </Text>
                    <Text style={styles.activityTime}>
                      {token.is_used ? 'Usado' : 'Gerado'} • {formatDate(token.is_used ? token.used_at || '' : token.created_at)}
                  {token.is_used && (
                    <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                  )}
              ))}
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
                <View style={styles.tokenDetails}>
                  <View style={styles.tokenDetail}>
                    <Ionicons name="calendar" size={14} color="#94A3B8" />
                    <Text style={styles.tokenDetailText}>
                      Criado: {formatDate(token.created_at)}
                  
                    <Ionicons name="time" size={14} color="#94A3B8" />
                      Expira: {formatDate(token.expires_at)}
                  {token.is_used && token.used_at && (
                    <View style={styles.tokenDetail}>
                      <Ionicons name="checkmark" size={14} color="#22C55E" />
                      <Text style={[styles.tokenDetailText, { color: '#22C55E' }]}>
                        Usado: {formatDate(token.used_at)}
                      </Text>
                  {token.gym_name && (
                      <Ionicons name="business" size={14} color="#8B5CF6" />
                      <Text style={[styles.tokenDetailText, { color: '#8B5CF6' }]}>
                        Academia: {token.gym_name}
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
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D17',
  loadingContainer: {
    justifyContent: 'center',
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  header: {
    paddingVertical: 20,
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  subtitle: {
  tabsContainer: {
    marginBottom: 20,
  tab: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  activeTab: {
    borderBottomColor: '#8B5CF6',
  tabText: {
    fontWeight: '500',
  activeTabText: {
    color: '#8B5CF6',
  scrollView: {
  statsContainer: {
  statsGrid: {
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  statCard: {
    width: '48%',
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 12,
  statValue: {
    fontSize: 20,
  statLabel: {
    textAlign: 'center',
  usageRateContainer: {
  usageRateTitle: {
    fontWeight: '600',
  usageRateBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 8,
  usageRateFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
  usageRateText: {
  recentActivity: {
  sectionTitle: {
  activityItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  activityContent: {
  activityTitle: {
    fontSize: 14,
    marginBottom: 2,
  activityTime: {
  tokensContainer: {
  tokenCard: {
  tokenHeader: {
  tokenInfo: {
  tokenCode: {
    fontFamily: 'monospace',
  tokenUser: {
  tokenMeta: {
    gap: 8,
  tokenTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  tokenTypeText: {
  usedBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  usedText: {
    color: '#22C55E',
    marginLeft: 4,
  expiredBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  expiredText: {
    color: '#F59E0B',
  tokenDetails: {
  tokenDetail: {
  tokenDetailText: {
  emptyContainer: {
    paddingVertical: 60,
  emptyText: {
});
