import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ModeSelection() {
  const router = useRouter();
  const [professionalEmail, setProfessionalEmail] = useState('');

  useEffect(() => {
    loadProfessionalInfo();
  }, []);

  const loadProfessionalInfo = async () => {
    const email = await AsyncStorage.getItem('professionalEmail');
    setProfessionalEmail(email || '');
  };

  const selectMode = async (mode: 'nutritionist' | 'personal') => {
    try {
      // Salvar modo selecionado
      await AsyncStorage.setItem('selectedMode', mode);
      
      // Redirecionar para interface correspondente
      if (mode === 'nutritionist') {
        router.replace('/professional/nutritionist/(tabs)/');
      } else {
        router.replace('/professional/personal/(tabs)/');
      }
    } catch (error) {
      console.error('Erro ao selecionar modo:', error);
      Alert.alert('Erro', 'Não foi possível selecionar o modo');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('professionalToken');
            await AsyncStorage.removeItem('professionalEmail');
            await AsyncStorage.removeItem('selectedMode');
            router.replace('/professional/luxecoach/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="fitness" size={48} color="#F59E0B" />
        </View>
        <Text style={styles.title}>LuxeCoach</Text>
        <Text style={styles.subtitle}>Bem-vindo(a)!</Text>
        {professionalEmail && (
          <Text style={styles.email}>{professionalEmail}</Text>
        )}
      </View>

      <View style={styles.modesContainer}>
        <Text style={styles.modesTitle}>Escolha seu modo de atuação:</Text>
        
        <TouchableOpacity
          style={[styles.modeCard, styles.nutritionistCard]}
          onPress={() => selectMode('nutritionist')}
        >
          <View style={styles.modeIcon}>
            <Ionicons name="nutrition" size={48} color="#22C55E" />
          </View>
          <Text style={styles.modeTitle}>Nutricionista</Text>
          <Text style={styles.modeDescription}>
            Acesse sua agenda, clientes e crie planos de suplementação personalizados
          </Text>
          <View style={styles.modeFeatures}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
              <Text style={styles.featureText}>Consultas online</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
              <Text style={styles.featureText}>Planos de suplementação</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
              <Text style={styles.featureText}>Gestão de clientes</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeCard, styles.personalCard]}
          onPress={() => selectMode('personal')}
        >
          <View style={styles.modeIcon}>
            <Ionicons name="barbell" size={48} color="#3B82F6" />
          </View>
          <Text style={styles.modeTitle}>Personal Trainer</Text>
          <Text style={styles.modeDescription}>
            Gerencie treinos, acompanhe alunos e crie fichas de exercícios
          </Text>
          <View style={styles.modeFeatures}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
              <Text style={styles.featureText}>Consultas online</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
              <Text style={styles.featureText}>Fichas de treino</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
              <Text style={styles.featureText}>Acompanhamento de alunos</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutButtonText}>Sair</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D17',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#94A3B8',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#64748B',
  },
  modesContainer: {
    flex: 1,
  },
  modesTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  modeCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  nutritionistCard: {
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  personalCard: {
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  modeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  modeDescription: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  modeFeatures: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7F1D1D',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginTop: 16,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
