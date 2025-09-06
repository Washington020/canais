import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  plan_type: string;
  is_active: boolean;
  created_at: string;
  subscription_end?: string;
  tokens_available: number;
  tokens_used: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Since we don't have a specific users endpoint, we'll create mock data
      const mockUsers: User[] = [
        {
          id: '1',
          full_name: 'João Silva',
          email: 'joao.silva@email.com',
          phone: '+5511999999999',
          plan_type: 'premium',
          is_active: true,
          created_at: '2024-06-15T10:30:00Z',
          subscription_end: '2025-07-15T10:30:00Z',
          tokens_available: 15,
          tokens_used: 25
        },
        {
          id: '2',
          full_name: 'Maria Santos',
          email: 'maria.santos@email.com',
          phone: '+5511888888888',
          plan_type: 'intermediate',
          is_active: true,
          created_at: '2024-08-20T14:15:00Z',
          subscription_end: '2025-09-20T14:15:00Z',
          tokens_available: 8,
          tokens_used: 12
        },
        {
          id: '3',
          full_name: 'Pedro Oliveira',
          email: 'pedro.oliveira@email.com',
          phone: '+5511777777777',
          plan_type: 'basic',
          is_active: true,
          created_at: '2024-09-01T09:45:00Z',
          subscription_end: '2025-10-01T09:45:00Z',
          tokens_available: 5,
          tokens_used: 8
        },
        {
          id: '4',
          full_name: 'Ana Costa',
          email: 'ana.costa@email.com',
          phone: '+5511666666666',
          plan_type: 'premium',
          is_active: false,
          created_at: '2024-05-10T16:20:00Z',
          subscription_end: '2024-12-10T16:20:00Z',
          tokens_available: 0,
          tokens_used: 45
        },
        {
          id: '5',
          full_name: 'Cliente Demo',
          email: 'cliente@fitpass.com',
          phone: '+5511888888888',
          plan_type: 'premium',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          subscription_end: '2025-01-01T00:00:00Z',
          tokens_available: 38,
          tokens_used: 47
        }
      ];
      
      setUsers(mockUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Erro', 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'premium': return '#FFD700';
      case 'intermediate': return '#8B5CF6';
      default: return '#22C55E';
    }
  };

  const getPlanName = (planType: string) => {
    switch (planType) {
      case 'premium': return 'Premium';
      case 'intermediate': return 'Intermediário';
      default: return 'Básico';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const toggleUserStatus = (userId: string) => {
    Alert.alert(
      'Alterar Status',
      'Deseja alterar o status deste usuário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            setUsers(prev => 
              prev.map(user => 
                user.id === userId 
                  ? { ...user, is_active: !user.is_active }
                  : user
              )
            );
            Alert.alert('Sucesso', 'Status do usuário alterado com sucesso!');
          }
        }
      ]
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchText.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesPlan = filterPlan === 'all' || user.plan_type === filterPlan;
    
    return matchesSearch && matchesPlan;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Carregando usuários...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Gestão de Usuários</Text>
        <Text style={styles.subtitle}>{users.length} usuários cadastrados</Text>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar usuários..."
            placeholderTextColor="#64748B"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <TouchableOpacity 
            style={[styles.filterButton, filterPlan === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterPlan('all')}
          >
            <Text style={[styles.filterText, filterPlan === 'all' && styles.filterTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filterPlan === 'premium' && styles.filterButtonActive]}
            onPress={() => setFilterPlan('premium')}
          >
            <Text style={[styles.filterText, filterPlan === 'premium' && styles.filterTextActive]}>
              Premium
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filterPlan === 'intermediate' && styles.filterButtonActive]}
            onPress={() => setFilterPlan('intermediate')}
          >
            <Text style={[styles.filterText, filterPlan === 'intermediate' && styles.filterTextActive]}>
              Intermediário
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filterPlan === 'basic' && styles.filterButtonActive]}
            onPress={() => setFilterPlan('basic')}
          >
            <Text style={[styles.filterText, filterPlan === 'basic' && styles.filterTextActive]}>
              Básico
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Users List */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredUsers.map((user) => (
          <TouchableOpacity
            key={user.id}
            style={styles.userCard}
            onPress={() => {
              setSelectedUser(user);
              setShowUserModal(true);
            }}
          >
            <View style={styles.userHeader}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {user.full_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.full_name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userPhone}>{user.phone}</Text>
              </View>
              <View style={styles.userStatus}>
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: user.is_active ? '#22C55E' : '#EF4444' }
                ]} />
              </View>
            </View>
            
            <View style={styles.userDetails}>
              <View style={styles.userPlan}>
                <View style={[
                  styles.planBadge,
                  { backgroundColor: `${getPlanColor(user.plan_type)}20` }
                ]}>
                  <Text style={[
                    styles.planBadgeText,
                    { color: getPlanColor(user.plan_type) }
                  ]}>
                    {getPlanName(user.plan_type)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.userStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{user.tokens_available}</Text>
                  <Text style={styles.statLabel}>Tokens</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{user.tokens_used}</Text>
                  <Text style={styles.statLabel}>Usados</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.userFooter}>
              <Text style={styles.memberSince}>
                Membro desde {formatDate(user.created_at)}
              </Text>
              {user.subscription_end && (
                <Text style={styles.subscriptionEnd}>
                  Expira em {formatDate(user.subscription_end)}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
        
        {filteredUsers.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#64748B" />
            <Text style={styles.emptyTitle}>Nenhum usuário encontrado</Text>
            <Text style={styles.emptyText}>
              Tente ajustar os filtros ou buscar por outro termo
            </Text>
          </View>
        )}
      </ScrollView>

      {/* User Details Modal */}
      <Modal
        visible={showUserModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedUser && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Detalhes do Usuário</Text>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={() => setShowUserModal(false)}
                  >
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.modalUserHeader}>
                    <View style={styles.modalUserAvatar}>
                      <Text style={styles.modalUserAvatarText}>
                        {selectedUser.full_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.modalUserName}>{selectedUser.full_name}</Text>
                    <Text style={styles.modalUserEmail}>{selectedUser.email}</Text>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Informações Básicas</Text>
                    <View style={styles.modalInfoItem}>
                      <Text style={styles.modalInfoLabel}>Telefone:</Text>
                      <Text style={styles.modalInfoValue}>{selectedUser.phone || 'Não informado'}</Text>
                    </View>
                    <View style={styles.modalInfoItem}>
                      <Text style={styles.modalInfoLabel}>Plano:</Text>
                      <Text style={[styles.modalInfoValue, { color: getPlanColor(selectedUser.plan_type) }]}>
                        {getPlanName(selectedUser.plan_type)}
                      </Text>
                    </View>
                    <View style={styles.modalInfoItem}>
                      <Text style={styles.modalInfoLabel}>Status:</Text>
                      <Text style={[
                        styles.modalInfoValue,
                        { color: selectedUser.is_active ? '#22C55E' : '#EF4444' }
                      ]}>
                        {selectedUser.is_active ? 'Ativo' : 'Inativo'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Estatísticas</Text>
                    <View style={styles.modalStats}>
                      <View style={styles.modalStatCard}>
                        <Text style={styles.modalStatValue}>{selectedUser.tokens_available}</Text>
                        <Text style={styles.modalStatLabel}>Tokens Disponíveis</Text>
                      </View>
                      <View style={styles.modalStatCard}>
                        <Text style={styles.modalStatValue}>{selectedUser.tokens_used}</Text>
                        <Text style={styles.modalStatLabel}>Tokens Utilizados</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Datas Importantes</Text>
                    <View style={styles.modalInfoItem}>
                      <Text style={styles.modalInfoLabel}>Cadastrado em:</Text>
                      <Text style={styles.modalInfoValue}>{formatDate(selectedUser.created_at)}</Text>
                    </View>
                    {selectedUser.subscription_end && (
                      <View style={styles.modalInfoItem}>
                        <Text style={styles.modalInfoLabel}>Assinatura expira em:</Text>
                        <Text style={styles.modalInfoValue}>{formatDate(selectedUser.subscription_end)}</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[
                      styles.statusButton,
                      { backgroundColor: selectedUser.is_active ? '#EF4444' : '#22C55E' }
                    ]}
                    onPress={() => {
                      toggleUserStatus(selectedUser.id);
                      setShowUserModal(false);
                    }}
                  >
                    <Ionicons 
                      name={selectedUser.is_active ? 'ban' : 'checkmark-circle'} 
                      size={20} 
                      color="#FFFFFF" 
                    />
                    <Text style={styles.statusButtonText}>
                      {selectedUser.is_active ? 'Suspender' : 'Reativar'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.editButton}>
                    <Ionicons name="create" size={20} color="#F59E0B" />
                    <Text style={styles.editButtonText}>Editar</Text>
                  </TouchableOpacity>
                </View>
              </>
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
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  filtersScroll: {
    maxHeight: 50,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#F59E0B',
  },
  filterText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 2,
  },
  userPhone: {
    color: '#A1A1AA',
    fontSize: 12,
  },
  userStatus: {
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  userDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userPlan: {},
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 10,
  },
  userFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 8,
  },
  memberSince: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 2,
  },
  subscriptionEnd: {
    color: '#A1A1AA',
    fontSize: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#94A3B8',
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
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 400,
    paddingHorizontal: 24,
  },
  modalUserHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalUserAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalUserAvatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  modalUserName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalUserEmail: {
    color: '#94A3B8',
    fontSize: 16,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalInfoLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  modalInfoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalStatCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
  },
  modalStatValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalStatLabel: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  editButtonText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});