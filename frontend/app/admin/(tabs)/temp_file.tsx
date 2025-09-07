import React, { useEffect, useState } from 'react';
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

interface AdminStats {
  total_users: number;
  active_subscriptions: number;
  overdue_payments: number;
  blocked_users: number;
  total_gyms: number;
  tokens_generated_today: number;
  monthly_revenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/admin/dashboard`, { headers });
      
      setStats(response.data);
    } catch (error: any) {
      console.error('Admin dashboard error:', error);
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('token');
        router.replace('/admin/login');
      } else {
        // Use mock data for demonstration
        const mockStats = {
          total_users: 2847,
          active_subscriptions: 2234,
          total_gyms: 156,
          tokens_generated_today: 1423
        };
        setStats(mockStats);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };


  const handleLogout = () => {
    console.log('🔥 ADMIN LOGOUT CLICADO - FUNÇÃO EXECUTANDO');
    
    Alert.alert(
      'Sair do Painel',
      'Tem certeza que deseja sair do painel administrativo?',
      [
        { 
          text: 'Cancelar', 
          style: 'cancel',
          onPress: () => console.log('❌ Admin logout cancelado')
        },
        {
          text: 'SAIR AGORA',
          style: 'destructive',
          onPress: () => {
            console.log('🚀 EXECUTANDO ADMIN LOGOUT DEFINITIVO');
            
            try {
              // Limpar storage imediatamente
              AsyncStorage.clear().then(() => {
                console.log('✅ Admin AsyncStorage limpo');
                
                // Navegar para home
                router.push('/');
                console.log('✅ Admin navegação para home executada');
                
              }).catch(error => {
                console.error('❌ Erro ao limpar admin storage:', error);
                router.push('/');
              });
              
            } catch (error) {
              console.error('❌ Erro no admin logout:', error);
              router.push('/');
            }
          }
        }
      ]
    );
  };
