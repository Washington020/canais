import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import * as Location from 'expo-location';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface Gym {
  id: string;
  name: string;
  full_address: string;
  phone?: string;
  opening_hours?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
}

export default function GymsScreen() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    requestLocationPermission();
    loadGyms();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Erro ao obter localização:', error);
    }
  };

  const loadGyms = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Erro', 'Token não encontrado');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/gyms/list`, { headers });
      
      let gymsList = response.data.gyms || [];

      // Calcular distância se tiver localização
      if (userLocation) {
        gymsList = gymsList.map((gym: Gym) => ({
          ...gym,
          distance: gym.latitude && gym.longitude
            ? calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                gym.latitude,
                gym.longitude
              )
            : null,
        }));

        // Ordenar por distância
        gymsList.sort((a: Gym, b: Gym) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      }

      setGyms(gymsList);
    } catch (error: any) {
      console.error('Erro ao carregar academias:', error);
      Alert.alert('Erro', 'Não foi possível carregar as academias');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  };

  const openInMaps = async (gym: Gym) => {
    if (!gym.latitude || !gym.longitude) {
      Alert.alert('Erro', 'Localização da academia não disponível');
      return;
    }

    const scheme = Platform.select({
      ios: 'maps:',
      android: 'geo:',
    });
    
    const latLng = `${gym.latitude},${gym.longitude}`;
    const label = encodeURIComponent(gym.name);

    let url = '';
    
    if (Platform.OS === 'ios') {
      // Apple Maps
      url = `${scheme}?q=${label}&ll=${latLng}`;
    } else {
      // Google Maps
      url = `${scheme}${latLng}?q=${latLng}(${label})`;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback para Google Maps via browser
        const browserUrl = `https://www.google.com/maps/search/?api=1&query=${latLng}`;
        await Linking.openURL(browserUrl);
      }
    } catch (error) {
      console.error('Erro ao abrir mapas:', error);
      Alert.alert('Erro', 'Não foi possível abrir o mapa');
    }
  };

  const makePhoneCall = (phone: string) => {
    const phoneUrl = `tel:${phone.replace(/\D/g, '')}`;
    Linking.openURL(phoneUrl);
  };

  const onRefresh = () => {
    setRefreshing(true);
    requestLocationPermission();
    loadGyms();
  };

  const renderGym = (gym: Gym) => (
    <View key={gym.id} style={styles.gymCard}>
      <View style={styles.gymHeader}>
        <View style={styles.gymIcon}>
          <Ionicons name="fitness" size={24} color="#F59E0B" />
        </View>
        <View style={styles.gymInfo}>
          <Text style={styles.gymName}>{gym.name}</Text>
          {gym.distance !== null && gym.distance !== undefined && (
            <View style={styles.distanceContainer}>
              <Ionicons name="location" size={14} color="#22C55E" />
              <Text style={styles.distanceText}>
                {gym.distance < 1
                  ? `${(gym.distance * 1000).toFixed(0)}m de distância`
                  : `${gym.distance.toFixed(1)}km de distância`}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.gymDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#94A3B8" />
          <Text style={styles.detailText}>{gym.full_address}</Text>
        </View>

        {gym.phone && (
          <TouchableOpacity
            style={styles.detailRow}
            onPress={() => makePhoneCall(gym.phone!)}
          >
            <Ionicons name="call-outline" size={16} color="#94A3B8" />
            <Text style={[styles.detailText, styles.phoneText]}>{gym.phone}</Text>
          </TouchableOpacity>
        )}

        {gym.opening_hours && (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#94A3B8" />
            <Text style={styles.detailText}>{gym.opening_hours}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.mapButton}
        onPress={() => openInMaps(gym)}
      >
        <Ionicons name="navigate" size={20} color="#FFFFFF" />
        <Text style={styles.mapButtonText}>Ver no Mapa</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Carregando academias...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Academias Parceiras</Text>
        <Text style={styles.subtitle}>
          {gyms.length} {gyms.length === 1 ? 'academia encontrada' : 'academias encontradas'}
        </Text>
      </View>

      {!userLocation && (
        <View style={styles.locationAlert}>
          <Ionicons name="information-circle" size={20} color="#F59E0B" />
          <Text style={styles.locationAlertText}>
            Ative a localização para ver academias próximas
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F59E0B"
          />
        }
      >
        {gyms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#475569" />
            <Text style={styles.emptyText}>Nenhuma academia disponível</Text>
            <Text style={styles.emptySubtext}>
              Entre em contato com o suporte para mais informações
            </Text>
          </View>
        ) : (
          gyms.map(renderGym)
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 16,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  locationAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  locationAlertText: {
    flex: 1,
    color: '#F59E0B',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  gymCard: {
    backgroundColor: '#1E293B',
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  gymHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  gymIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gymInfo: {
    flex: 1,
  },
  gymName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '600',
  },
  gymDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  phoneText: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  mapButton: {
    flexDirection: 'row',
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
  },
});
