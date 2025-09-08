import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
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

export default function TokenValidation() {
  const [tokenCode, setTokenCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [gymInfo, setGymInfo] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Sair do Sistema',
      'Deseja realmente sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            router.replace('/academia');
          }
        }
      ]
    );
  }, [router]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  const validateToken = useCallback(async () => {
    if (!tokenCode.trim()) {
      Alert.alert('Erro', 'Digite o código do token');
      return;
    }

    setLoading(true);
    try {
      const gymToken = await AsyncStorage.getItem('gymToken');
      if (!gymToken) {
        Alert.alert('Erro', 'Você não está autenticado. Faça login primeiro.');
        router.replace('/gym/login');
        return;
      }

      const gymData = await AsyncStorage.getItem('gymInfo');
      const gym = gymData ? JSON.parse(gymData) : null;

      if (!gym?.id) {
        Alert.alert('Erro', 'Informações da academia não encontradas');
        router.replace('/gym/login');
        return;
      }

      console.log('🔍 Validando token:', tokenCode);
      console.log('🏋️ Academia ID:', gym.id);

      const headers = { 
        'Authorization': `Bearer ${gymToken}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axios.post(
        `${API_URL}/api/tokens/validate/${tokenCode}?gym_id=${gym.id}`,
        {},
        { headers, timeout: 10000 }
      );

      console.log('✅ Token válido:', response.data);

      Alert.alert(
        'Token Válido! ✅',
        `Cliente: ${response.data.user.full_name}\nCheck-in realizado com sucesso!\n\nToken usado em: ${gym.name}`,
        [{ text: 'OK', onPress: () => setTokenCode('') }]
      );

    } catch (error: any) {
      console.error('❌ Erro na validação:', error);
      
      if (error.response?.status === 401) {
        Alert.alert('Sessão Expirada', 'Faça login novamente');
        router.replace('/gym/login');
      } else if (error.response?.status === 404) {
        Alert.alert('Token Inválido ❌', 'Token não encontrado ou já foi usado');
      } else if (error.response?.status === 400) {
        Alert.alert('Token Inválido ❌', 'Token expirado ou já utilizado');
      } else {
        Alert.alert(
          'Erro na Validação ❌',
          error.response?.data?.detail || 'Não foi possível validar o token'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [tokenCode, router]);

  const checkAuthentication = useCallback(async () => {
    try {
      const gymToken = await AsyncStorage.getItem('gymToken');
      const gymData = await AsyncStorage.getItem('gymInfo');
      
      if (!gymToken) {
        console.log('❌ Academia não autenticada, redirecionando para login');
        router.replace('/gym/login');
        return;
      }

      if (gymData) {
        setGymInfo(JSON.parse(gymData));
      }
      
      setIsAuthenticated(true);
      console.log('✅ Academia autenticada');
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      router.replace('/gym/login');
    }
  }, [router]);

  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Verificando autenticação...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header with Navigation */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Validação de Tokens</Text>
        </View>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color="#FF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Gym Info */}
        {gymInfo && (
          <View style={styles.gymInfoCard}>
            <Ionicons name="business" size={24} color="#22C55E" />
            <Text style={styles.gymName}>{gymInfo.name}</Text>
            <Text style={styles.gymStatus}>✅ Academia Autenticada</Text>
          </View>
        )}

        {/* Validation Form */}
        <View style={styles.validationCard}>
          <Text style={styles.cardTitle}>Validar Token do Cliente</Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="qr-code" size={20} color="#94A3B8" />
            <TextInput
              style={styles.tokenInput}
              placeholder="Digite o código do token"
              placeholderTextColor="#64748B"
              value={tokenCode}
              onChangeText={setTokenCode}
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity 
            style={[styles.validateButton, loading && styles.validateButtonDisabled]}
            onPress={validateToken}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.validateButtonText}>Validar Token</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Como usar:</Text>
          <Text style={styles.instructionsText}>
            1. Cliente mostra o código do token{'\n'}
            2. Digite o código no campo acima{'\n'}
            3. Clique em "Validar Token"{'\n'}
            4. Sistema confirma se é válido e registra check-in
          </Text>
        </View>

        {/* Security Info */}
        <View style={styles.securityCard}>
          <Text style={styles.securityTitle}>🔒 Sistema Seguro:</Text>
          <Text style={styles.securityText}>
            • Você está logado como: {gymInfo?.name}{'\n'}
            • Tokens são únicos e de uso único{'\n'}
            • Cada validação é registrada no sistema{'\n'}
            • Todas as ações são auditadas
          </Text>
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutFullButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color="#FFFFFF" />
            <Text style={styles.logoutFullText}>Sair do Sistema</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    marginTop: 16,
    fontSize: 16,
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
    fontSize: 18,
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
    padding: 24,
  },
  gymInfoCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  gymName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  gymStatus: {
    color: '#22C55E',
    fontSize: 14,
    marginTop: 4,
  },
  validationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  tokenInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 16,
    paddingLeft: 12,
  },
  validateButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  validateButtonDisabled: {
    backgroundColor: '#64748B',
  },
  validateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  instructionsTitle: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionsText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
  },
  securityCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  securityTitle: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  securityText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
  },
  logoutSection: {
    paddingVertical: 20,
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
});