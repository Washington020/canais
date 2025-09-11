import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

export default function NutritionistProfile() {
  const [professional, setProfessional] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  
  const router = useRouter();

  useEffect(() => {
    loadProfessionalData();
  }, []);

  const loadProfessionalData = async () => {
    try {
      const professionalData = await AsyncStorage.getItem('professional');
      if (professionalData) {
        const data = JSON.parse(professionalData);
        setProfessional(data);
        setEditData(data);
      } else {
        // If no cached data, redirect to login
        router.replace('/professional/nutritionist/login');
      }
    } catch (error) {
      console.error('Error loading professional data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) {
        Alert.alert('Erro', 'Token não encontrado');
        return;
      }

      // For now, just save locally
      await AsyncStorage.setItem('professional', JSON.stringify(editData));
      setProfessional(editData);
      setEditing(false);
      
      Alert.alert('✅ Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Erro', 'Não foi possível salvar o perfil');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirmar Logout',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('professionalToken');
              await AsyncStorage.removeItem('professional');
              router.replace('/professional/nutritionist/login');
            } catch (error) {
              console.error('Error during logout:', error);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Carregando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color="#22C55E" />
            </View>
          </View>
          
          <Text style={styles.name}>{professional?.full_name}</Text>
          <Text style={styles.title}>Nutricionista</Text>
          <Text style={styles.cref}>{professional?.cref_crn}</Text>
        </View>

        {/* Profile Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📋 Informações Profissionais</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setEditing(!editing)}
            >
              <Ionicons name={editing ? "close" : "create"} size={20} color="#22C55E" />
              <Text style={styles.editButtonText}>{editing ? 'Cancelar' : 'Editar'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Ionicons name="person-circle" size={20} color="#22C55E" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nome Completo</Text>
                {editing ? (
                  <TextInput
                    style={styles.infoInput}
                    value={editData.full_name}
                    onChangeText={(text) => setEditData({...editData, full_name: text})}
                    placeholder="Nome completo"
                    placeholderTextColor="#64748B"
                  />
                ) : (
                  <Text style={styles.infoValue}>{professional?.full_name}</Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="mail" size={20} color="#22C55E" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{professional?.email}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={20} color="#22C55E" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>CRN</Text>
                {editing ? (
                  <TextInput
                    style={styles.infoInput}
                    value={editData.cref_crn}
                    onChangeText={(text) => setEditData({...editData, cref_crn: text})}
                    placeholder="CRN-12345/SP"
                    placeholderTextColor="#64748B"
                  />
                ) : (
                  <Text style={styles.infoValue}>{professional?.cref_crn}</Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="business" size={20} color="#22C55E" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Especialização</Text>
                {editing ? (
                  <TextInput
                    style={styles.infoInput}
                    value={editData.specialization || 'Nutrição Clínica e Esportiva'}
                    onChangeText={(text) => setEditData({...editData, specialization: text})}
                    placeholder="Especialização"
                    placeholderTextColor="#64748B"
                  />
                ) : (
                  <Text style={styles.infoValue}>{professional?.specialization || 'Nutrição Clínica e Esportiva'}</Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#22C55E" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Localização</Text>
                {editing ? (
                  <TextInput
                    style={styles.infoInput}
                    value={editData.location || 'São Paulo, SP'}
                    onChangeText={(text) => setEditData({...editData, location: text})}
                    placeholder="Cidade, Estado"
                    placeholderTextColor="#64748B"
                  />
                ) : (
                  <Text style={styles.infoValue}>{professional?.location || 'São Paulo, SP'}</Text>
                )}
              </View>
            </View>
          </View>

          {editing && (
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveProfile}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Salvar Alterações</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Professional Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Estatísticas Rápidas</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.quickStatCard}>
              <Ionicons name="people" size={24} color="#22C55E" />
              <Text style={styles.quickStatNumber}>0</Text>
              <Text style={styles.quickStatLabel}>Clientes Ativos</Text>
            </View>

            <View style={styles.quickStatCard}>
              <Ionicons name="restaurant" size={24} color="#10B981" />
              <Text style={styles.quickStatNumber}>0</Text>
              <Text style={styles.quickStatLabel}>Planos Criados</Text>
            </View>

            <View style={styles.quickStatCard}>
              <Ionicons name="star" size={24} color="#FFD700" />
              <Text style={styles.quickStatNumber}>4.9</Text>
              <Text style={styles.quickStatLabel}>Avaliação</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Configurações</Text>
          
          <View style={styles.settingsContainer}>
            <TouchableOpacity style={styles.settingItem}>
              <Ionicons name="notifications" size={20} color="#22C55E" />
              <Text style={styles.settingText}>Notificações</Text>
              <Ionicons name="chevron-forward" size={16} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <Ionicons name="lock-closed" size={20} color="#22C55E" />
              <Text style={styles.settingText}>Alterar Senha</Text>
              <Ionicons name="chevron-forward" size={16} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <Ionicons name="help-circle" size={20} color="#22C55E" />
              <Text style={styles.settingText}>Ajuda e Suporte</Text>
              <Ionicons name="chevron-forward" size={16} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <Ionicons name="document-text" size={20} color="#22C55E" />
              <Text style={styles.settingText}>Termos e Privacidade</Text>
              <Ionicons name="chevron-forward" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={20} color="#EF4444" />
            <Text style={styles.logoutButtonText}>Sair da Conta</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 50 }} />
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
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#22C55E',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  title: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cref: {
    color: '#94A3B8',
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.5)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  editButtonText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  infoInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickStatNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  quickStatLabel: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  settingsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 12,
    padding: 16,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});