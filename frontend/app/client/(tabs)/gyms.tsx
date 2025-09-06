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
  Image,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Gym {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  accepted_plans: string[];
  equipments: string[];
  current_occupancy: number;
  max_capacity: number;
  rating: number;
  distance?: number;
}

export default function Gyms() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [showGymModal, setShowGymModal] = useState(false);
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('distance');

  useEffect(() => {
    loadGyms();
  }, []);

  const loadGyms = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      
      // Simulated location for demo (São Paulo coordinates)
      const lat = -23.5505;
      const lng = -46.6333;
      
      const response = await axios.get(`${API_URL}/api/gyms?lat=${lat}&lng=${lng}`, { headers });
      
      // If no gyms from API, create mock data
      if (response.data.length === 0) {
        const mockGyms = [
          {
            id: '1',
            name: 'SmartFit Paulista',
            address: 'Av. Paulista, 1234 - Bela Vista, São Paulo - SP',
            latitude: -23.5505,
            longitude: -46.6333,
            accepted_plans: ['basic', 'intermediate', 'premium'],
            equipments: ['Esteira', 'Musculação', 'CrossFit', 'Natação'],
            current_occupancy: 45,
            max_capacity: 100,
            rating: 4.5,
            distance: 0.8
          },
          {
            id: '2',
            name: 'Bio Ritmo Consolação',
            address: 'R. da Consolação, 3456 - Consolação, São Paulo - SP',
            latitude: -23.5489,
            longitude: -46.6388,
            accepted_plans: ['intermediate', 'premium'],
            equipments: ['Esteira', 'Musculação', 'Pilates', 'Yoga'],
            current_occupancy: 32,
            max_capacity: 80,
            rating: 4.8,
            distance: 1.2
          },
          {
            id: '3',
            name: 'Runner Academia',
            address: 'R. Augusta, 2345 - Jardins, São Paulo - SP',
            latitude: -23.5544,
            longitude: -46.6544,
            accepted_plans: ['premium'],
            equipments: ['Esteira', 'Musculação', 'Funcional', 'Spinning'],
            current_occupancy: 28,
            max_capacity: 60,
            rating: 4.7,
            distance: 1.5
          },
          {
            id: '4',
            name: 'Academia Central',
            address: 'Av. Brigadeiro Luis Antonio, 1234 - Bela Vista, São Paulo - SP',
            latitude: -23.5584,
            longitude: -46.6432,
            accepted_plans: ['basic', 'intermediate'],
            equipments: ['Esteira', 'Musculação', 'Aeróbica'],
            current_occupancy: 52,
            max_capacity: 90,
            rating: 4.2,
            distance: 2.1
          },
          {
            id: '5',
            name: 'Bodytech Vila Olímpia',
            address: 'R. Olimpíadas, 360 - Vila Olímpia, São Paulo - SP',
            latitude: -23.5938,
            longitude: -46.6854,
            accepted_plans: ['premium'],
            equipments: ['Esteira', 'Musculação', 'Natação', 'Squash', 'Spa'],
            current_occupancy: 67,
            max_capacity: 150,
            rating: 4.9,
            distance: 3.2
          }
        ];
        setGyms(mockGyms);
      } else {
        setGyms(response.data);
      }
    } catch (error) {
      console.error('Error loading gyms:', error);
      Alert.alert('Erro', 'Erro ao carregar academias');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadGyms();
  };

  const getOccupancyColor = (occupancy: number, capacity: number) => {
    const percentage = (occupancy / capacity) * 100;
    if (percentage < 30) return '#22C55E'; // Green - Empty
    if (percentage < 60) return '#F59E0B'; // Yellow - Medium
    if (percentage < 80) return '#EF4444'; // Red - Busy
    return '#7C2D12'; // Dark red - Very busy
  };

  const getOccupancyText = (occupancy: number, capacity: number) => {
    const percentage = (occupancy / capacity) * 100;
    if (percentage < 30) return 'Vazio';
    if (percentage < 60) return 'Médio';
    if (percentage < 80) return 'Cheio';
    return 'Lotado';
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'premium': return '#FFD700';
      case 'intermediate': return '#8B5CF6';
      default: return '#22C55E';
    }
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'premium': return 'Premium';
      case 'intermediate': return 'Inter';
      default: return 'Básico';
    }
  };

  const generateTokenForGym = async (gymId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API_URL}/api/tokens/generate`, {
        token_type: 'gym',
        gym_id: gymId,
        validity_hours: 3
      }, { headers });

      Alert.alert(
        'Token Gerado!', 
        'Seu token foi gerado com sucesso. Vá para a aba Tokens para visualizar o QR Code.',
        [
          { text: 'OK', onPress: () => setShowGymModal(false) }
        ]
      );
    } catch (error: any) {
      console.error('Error generating token:', error);
      Alert.alert(
        'Erro', 
        error.response?.data?.detail || 'Erro ao gerar token. Tente novamente.'
      );
    }
  };

  const filteredGyms = gyms.filter(gym => {
    const matchesSearch = gym.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         gym.address.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesPlan = filterPlan === 'all' || gym.accepted_plans.includes(filterPlan);
    
    return matchesSearch && matchesPlan;
  });

  const sortedGyms = [...filteredGyms].sort((a, b) => {
    switch (sortBy) {
      case 'distance':
        return (a.distance || 0) - (b.distance || 0);
      case 'rating':
        return b.rating - a.rating;
      case 'occupancy':
        return (a.current_occupancy / a.max_capacity) - (b.current_occupancy / b.max_capacity);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando academias...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Academias</Text>
        <Text style={styles.subtitle}>Encontre academias próximas</Text>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar academias..."
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
              Todas
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
          
          <TouchableOpacity 
            style={[styles.filterButton, filterPlan === 'intermediate' && styles.filterButtonActive]}
            onPress={() => setFilterPlan('intermediate')}
          >
            <Text style={[styles.filterText, filterPlan === 'intermediate' && styles.filterTextActive]}>
              Intermediário
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
        </ScrollView>
      </View>

      {/* Sort Options */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortContainer}>
        <TouchableOpacity 
          style={[styles.sortButton, sortBy === 'distance' && styles.sortButtonActive]}
          onPress={() => setSortBy('distance')}
        >
          <Ionicons name="location" size={16} color={sortBy === 'distance' ? '#FFFFFF' : '#94A3B8'} />
          <Text style={[styles.sortText, sortBy === 'distance' && styles.sortTextActive]}>
            Distância
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sortButton, sortBy === 'rating' && styles.sortButtonActive]}
          onPress={() => setSortBy('rating')}
        >
          <Ionicons name="star" size={16} color={sortBy === 'rating' ? '#FFFFFF' : '#94A3B8'} />
          <Text style={[styles.sortText, sortBy === 'rating' && styles.sortTextActive]}>
            Avaliação
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sortButton, sortBy === 'occupancy' && styles.sortButtonActive]}
          onPress={() => setSortBy('occupancy')}
        >
          <Ionicons name="people" size={16} color={sortBy === 'occupancy' ? '#FFFFFF' : '#94A3B8'} />
          <Text style={[styles.sortText, sortBy === 'occupancy' && styles.sortTextActive]}>
            Movimento
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Gyms List */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {sortedGyms.map((gym) => (
          <TouchableOpacity
            key={gym.id}
            style={styles.gymCard}
            onPress={() => {
              setSelectedGym(gym);
              setShowGymModal(true);
            }}
          >
            <View style={styles.gymHeader}>
              <View style={styles.gymInfo}>
                <Text style={styles.gymName}>{gym.name}</Text>
                <View style={styles.gymRating}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.ratingText}>{gym.rating.toFixed(1)}</Text>
                </View>
              </View>
              <View style={styles.gymDistance}>
                <Text style={styles.distanceText}>{gym.distance?.toFixed(1)}km</Text>
              </View>
            </View>
            
            <Text style={styles.gymAddress}>{gym.address}</Text>
            
            <View style={styles.gymDetails}>
              <View style={styles.occupancyContainer}>
                <View style={[
                  styles.occupancyDot,
                  { backgroundColor: getOccupancyColor(gym.current_occupancy, gym.max_capacity) }
                ]} />
                <Text style={styles.occupancyText}>
                  {getOccupancyText(gym.current_occupancy, gym.max_capacity)} 
                  ({gym.current_occupancy}/{gym.max_capacity})
                </Text>
              </View>
              
              <View style={styles.plansContainer}>
                {gym.accepted_plans.map((plan) => (
                  <View key={plan} style={[
                    styles.planBadge,
                    { backgroundColor: `${getPlanBadgeColor(plan)}20` }
                  ]}>
                    <Text style={[
                      styles.planBadgeText,
                      { color: getPlanBadgeColor(plan) }
                    ]}>
                      {getPlanName(plan)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            
            <View style={styles.equipmentsContainer}>
              {gym.equipments.slice(0, 3).map((equipment, index) => (
                <Text key={index} style={styles.equipmentText}>
                  • {equipment}
                </Text>
              ))}
              {gym.equipments.length > 3 && (
                <Text style={styles.equipmentText}>
                  +{gym.equipments.length - 3} mais
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
        
        {sortedGyms.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color="#64748B" />
            <Text style={styles.emptyTitle}>Nenhuma academia encontrada</Text>
            <Text style={styles.emptyText}>
              Tente ajustar os filtros ou buscar por outro termo
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Gym Details Modal */}
      <Modal
        visible={showGymModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGymModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedGym && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedGym.name}</Text>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={() => setShowGymModal(false)}
                  >
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalScroll}>
                  <Text style={styles.modalAddress}>{selectedGym.address}</Text>
                  
                  <View style={styles.modalStats}>
                    <View style={styles.modalStat}>
                      <Ionicons name="star" size={20} color="#F59E0B" />
                      <Text style={styles.modalStatText}>{selectedGym.rating.toFixed(1)}</Text>
                    </View>
                    <View style={styles.modalStat}>
                      <Ionicons name="location" size={20} color="#8B5CF6" />
                      <Text style={styles.modalStatText}>{selectedGym.distance?.toFixed(1)}km</Text>
                    </View>
                    <View style={styles.modalStat}>
                      <View style={[
                        styles.occupancyDot,
                        { backgroundColor: getOccupancyColor(selectedGym.current_occupancy, selectedGym.max_capacity) }
                      ]} />
                      <Text style={styles.modalStatText}>
                        {getOccupancyText(selectedGym.current_occupancy, selectedGym.max_capacity)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Planos Aceitos</Text>
                    <View style={styles.modalPlans}>
                      {selectedGym.accepted_plans.map((plan) => (
                        <View key={plan} style={[
                          styles.modalPlanBadge,
                          { backgroundColor: `${getPlanBadgeColor(plan)}20` }
                        ]}>
                          <Text style={[
                            styles.modalPlanText,
                            { color: getPlanBadgeColor(plan) }
                          ]}>
                            {getPlanName(plan)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Equipamentos Disponíveis</Text>
                    <View style={styles.modalEquipments}>
                      {selectedGym.equipments.map((equipment, index) => (
                        <View key={index} style={styles.modalEquipment}>
                          <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                          <Text style={styles.modalEquipmentText}>{equipment}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Horários de Funcionamento</Text>
                    <View style={styles.modalHours}>
                      <Text style={styles.modalHourText}>Segunda a Sexta: 06:00 - 22:00</Text>
                      <Text style={styles.modalHourText}>Sábado: 08:00 - 18:00</Text>
                      <Text style={styles.modalHourText}>Domingo: 08:00 - 16:00</Text>
                    </View>
                  </View>
                </ScrollView>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={styles.directionsButton}
                    onPress={() => {
                      // In real app, would open maps with directions
                      Alert.alert('Navegação', 'Abrindo navegação GPS...');
                    }}
                  >
                    <Ionicons name="navigate" size={20} color="#FFFFFF" />
                    <Text style={styles.directionsButtonText}>Ir até lá</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.tokenButton}
                    onPress={() => generateTokenForGym(selectedGym.id)}
                  >
                    <Ionicons name="qr-code" size={20} color="#FFFFFF" />
                    <Text style={styles.tokenButtonText}>Gerar Token</Text>
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
    backgroundColor: '#8B5CF6',
  },
  filterText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  sortContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
    maxHeight: 50,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  sortButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  sortText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  sortTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  gymCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  gymHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  gymInfo: {
    flex: 1,
  },
  gymName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  gymRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  gymDistance: {
    alignItems: 'center',
  },
  distanceText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
  },
  gymAddress: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  gymDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  occupancyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  occupancyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  occupancyText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  plansContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  equipmentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  equipmentText: {
    color: '#A1A1AA',
    fontSize: 12,
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 400,
    paddingHorizontal: 24,
  },
  modalAddress: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  modalStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalStatText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalPlans: {
    flexDirection: 'row',
    gap: 8,
  },
  modalPlanBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modalPlanText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalEquipments: {
    gap: 8,
  },
  modalEquipment: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalEquipmentText: {
    color: '#94A3B8',
    fontSize: 14,
    marginLeft: 8,
  },
  modalHours: {
    gap: 4,
  },
  modalHourText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    borderRadius: 12,
  },
  directionsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tokenButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 12,
  },
  tokenButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});