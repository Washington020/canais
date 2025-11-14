import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://wellness-hub-270.preview.emergentagent.com';

interface Gym {
  id: string;
  name: string;
  full_address: string;
  phone: string;
  type: string;
  capacity: number;
  amenities: string[];
  status: string;
  rating: number;
}

export default function ClientAcademias() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userTokens, setUserTokens] = useState<any[]>([]);
  const router = useRouter();

  const loadGyms = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/client/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Carregar academias disponíveis
      const gymsResponse = await axios.get(`${API_URL}/api/users/gyms`, { headers });
      setGyms(gymsResponse.data || []);

      // Carregar tokens ativos do usuário para check-in
      const tokensResponse = await axios.get(`${API_URL}/api/users/tokens`, { headers });
      const activeTokens = (tokensResponse.data || []).filter((t: any) => t.status === 'active');
      setUserTokens(activeTokens);

    } catch (error: any) {
      console.error('Erro ao carregar academias:', error);
      if (error.response?.status === 401) {
        router.replace('/client/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  const makeCheckIn = useCallback(async (gym: Gym) => {
    if (userTokens.length === 0) {
      Alert.alert(
        'Nenhum Token Ativo',
        'Você precisa gerar um token primeiro para fazer check-in.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Gerar Token', onPress: () => router.push('/client/(tabs)/tokens') }
        ]
      );
      return;
    }

    const tokenOptions = userTokens.map((token) => ({
      text: `${token.type.toUpperCase()} - ${token.code}`,
      onPress: () => confirmCheckIn(gym, token)
    }));

    Alert.alert(
      'Escolha seu Token',
      `Selecione o token para fazer check-in na ${gym.name}:`,
      [
        ...tokenOptions,
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  }, [userTokens, router]);

  const confirmCheckIn = useCallback((gym: Gym, token: any) => {
    Alert.alert(
      '✅ Check-in Realizado!',
      `Academia: ${gym.name}\nToken: ${token.code}\nTipo: ${token.type.toUpperCase()}\n\nApresente este código na recepção da academia para validar sua entrada.`,
      [
        { text: 'Entendi', style: 'default' },
        { text: 'Ver Tokens', onPress: () => router.push('/client/(tabs)/tokens') }
      ]
    );
  }, [router]);

  const openMaps = useCallback((gym: Gym) => {
    if (!gym.full_address || gym.full_address.trim() === ',  - , /') {
      Alert.alert('Endereço não disponível', 'Esta academia não possui endereço cadastrado.');
      return;
    }

    const address = encodeURIComponent(gym.full_address);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${address}`;
    
    Linking.openURL(mapsUrl).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o mapa.');
    });
  }, []);

  useEffect(() => {
    loadGyms();
  }, [loadGyms]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGyms();
  }, [loadGyms]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
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
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Academias Parceiras</Text>
          <Text style={styles.headerSubtitle}>{gyms.length} academias disponíveis</Text>
        </View>
        
        <TouchableOpacity style={styles.logoutButton} onPress={() => router.replace('/client/login')}>
          <Ionicons name="log-out" size={24} color="#FF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tokensInfo}>
          <View style={styles.tokensHeader}>
            <Ionicons name="qr-code" size={20} color="#8B5CF6" />
            <Text style={styles.tokensTitle}>Tokens Ativos: {userTokens.length}</Text>
          </View>
          <Text style={styles.tokensDescription}>
            {userTokens.length > 0 
              ? 'Você pode fazer check-in usando seus tokens ativos'
              : 'Gere tokens para fazer check-in nas academias'
            }
          </Text>
          {userTokens.length === 0 && (
            <TouchableOpacity 
              style={styles.generateTokensButton}
              onPress={() => router.push('/client/(tabs)/tokens')}
            >
              <Ionicons name="add-circle" size={16} color="#FFFFFF" />
              <Text style={styles.generateTokensText}>Gerar Tokens</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.gymsContainer}>
          {gyms.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>Nenhuma academia disponível</Text>
              <Text style={styles.emptySubtext}>Aguarde novas academias serem aprovadas</Text>
            </View>
          ) : (
            gyms.map((gym) => (
              <View key={gym.id} style={styles.gymCard}>
                <View style={styles.gymHeader}>
                  <View style={styles.gymTitleContainer}>
                    <Text style={styles.gymName}>{gym.name}</Text>
                    <View style={styles.statusBadge}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>ATIVA</Text>
                    </View>
                  </View>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.ratingText}>{gym.rating}</Text>
                  </View>
                </View>

                <View style={styles.gymDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#94A3B8" />
                    <Text style={styles.detailText}>
                      {gym.full_address || 'Endereço não informado'}
                    </Text>
                  </View>

                  {gym.phone && (
                    <View style={styles.detailRow}>
                      <Ionicons name="call-outline" size={16} color="#94A3B8" />
                      <Text style={styles.detailText}>{gym.phone}</Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Ionicons name="fitness-outline" size={16} color="#94A3B8" />
                    <Text style={styles.detailText}>Academia {gym.type}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="people-outline" size={16} color="#94A3B8" />
                    <Text style={styles.detailText}>Capacidade: {gym.capacity} pessoas</Text>
                  </View>
                </View>

                {gym.amenities && gym.amenities.length > 0 && (
                  <View style={styles.amenitiesContainer}>
                    <Text style={styles.amenitiesTitle}>Comodidades:</Text>
                    <View style={styles.amenitiesGrid}>
                      {gym.amenities.slice(0, 6).map((amenity, index) => (
                        <View key={index} style={styles.amenityTag}>
                          <Text style={styles.amenityText}>{amenity}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.checkInButton]}
                    onPress={() => makeCheckIn(gym)}
                  >
                    <Ionicons name="qr-code" size={16} color="#FFFFFF" />
                    <Text style={styles.checkInButtonText}>Check-in</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.mapsButton]}
                    onPress={() => openMaps(gym)}
                  >
                    <Ionicons name="map" size={16} color="#FFFFFF" />
                    <Text style={styles.mapsButtonText}>Ver no Mapa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D17' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFFFFF', fontSize: 16, marginTop: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  backButton: { width: 44, height: 44, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 16 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: '#94A3B8', fontSize: 14, marginTop: 2 },
  logoutButton: { width: 44, height: 44, backgroundColor: 'rgba(255, 68, 68, 0.1)', borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  tokensInfo: { backgroundColor: 'rgba(139, 92, 246, 0.1)', margin: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)' },
  tokensHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tokensTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  tokensDescription: { color: '#94A3B8', fontSize: 14, marginBottom: 12 },
  generateTokensButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B5CF6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, gap: 6 },
  generateTokensText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  gymsContainer: { paddingHorizontal: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtext: { color: '#64748B', fontSize: 14, textAlign: 'center', marginTop: 8 },
  gymCard: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  gymHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  gymTitleContainer: { flex: 1 },
  gymName: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', marginRight: 4 },
  statusText: { color: '#22C55E', fontSize: 10, fontWeight: 'bold' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { color: '#F59E0B', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  gymDetails: { marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  detailText: { color: '#E2E8F0', fontSize: 14, marginLeft: 8, flex: 1 },
  amenitiesContainer: { marginBottom: 16 },
  amenitiesTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  amenityTag: { backgroundColor: 'rgba(139, 92, 246, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  amenityText: { color: '#8B5CF6', fontSize: 10, fontWeight: '500' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 6 },
  checkInButton: { backgroundColor: '#8B5CF6' },
  checkInButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  mapsButton: { backgroundColor: '#22C55E' },
  mapsButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
