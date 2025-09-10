import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Professional {
  id: string;
  full_name: string;
  email: string;
  professional_type: string;
  specialization?: string;
  registration_number?: string;
  created_at: string;
}

interface Stats {
  total_clients: number;
  active_plans: number;
  completed_sessions: number;
  client_satisfaction: number;
}

export default function PersonalTrainerProfile() {
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadProfessionalData = useCallback(async () => {
    try {
      const storedProfessional = await AsyncStorage.getItem('professional');
      if (storedProfessional) {
        const profData = JSON.parse(storedProfessional);
        setProfessional(profData);
        
        // Mock stats data
        setStats({
          total_clients: 12,
          active_plans: 8,
          completed_sessions: 156,
          client_satisfaction: 4.8
        });
      }
    } catch (error) {
      console.error('Error loading professional data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfessionalData();
  }, [loadProfessionalData]);

  const handleLogout = async () => {
    Alert.alert(
      'Confirmar Logout',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('professionalToken');
              await AsyncStorage.removeItem('professional');
              router.replace('/professional/personal/login');
            } catch (error) {
              console.error('Error during logout:', error);
            }
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('Info', 'Funcionalidade de edição de perfil em desenvolvimento');
  };

  const handleChangePassword = () => {
    Alert.alert('Info', 'Funcionalidade de alteração de senha em desenvolvimento');
  };

  const handleViewCertifications = () => {
    Alert.alert('Info', 'Funcionalidade de certificações em desenvolvimento');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Carregando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Meu Perfil</Text>
          <Text style={styles.headerSubtitle}>Personal Trainer Profissional</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="person-circle" size={24} color="#F59E0B" />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Ionicons name="fitness" size={32} color="#F59E0B" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {professional?.full_name || 'Prof. João Personal'}
              </Text>
              <Text style={styles.profileEmail}>
                {professional?.email || 'personal@luxepass.com'}
              </Text>
              <Text style={styles.profileSpecialty}>
                Personal Trainer • CREF-12345/SP
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Ionicons name="create" size={16} color="#F59E0B" />
            <Text style={styles.editButtonText}>Editar Perfil</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>📊 Estatísticas</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="people" size={24} color="#22C55E" />
                <Text style={styles.statNumber}>{stats.total_clients}</Text>
                <Text style={styles.statLabel}>Clientes Totais</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="clipboard" size={24} color="#F59E0B" />
                <Text style={styles.statNumber}>{stats.active_plans}</Text>
                <Text style={styles.statLabel}>Planos Ativos</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="checkmark-circle" size={24} color="#8B5CF6" />
                <Text style={styles.statNumber}>{stats.completed_sessions}</Text>
                <Text style={styles.statLabel}>Sessões Realizadas</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="star" size={24} color="#EAB308" />
                <Text style={styles.statNumber}>{stats.client_satisfaction.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Satisfação</Text>
              </View>
            </View>
          </View>
        )}

        {/* Profile Options */}
        <View style={styles.optionsSection}>
          <Text style={styles.sectionTitle}>⚙️ Configurações</Text>
          
          <TouchableOpacity style={styles.optionItem} onPress={handleEditProfile}>
            <View style={styles.optionIcon}>
              <Ionicons name="person" size={20} color="#94A3B8" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Editar Perfil</Text>
              <Text style={styles.optionSubtitle}>Alterar informações pessoais</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem} onPress={handleChangePassword}>
            <View style={styles.optionIcon}>
              <Ionicons name="lock-closed" size={20} color="#94A3B8" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Alterar Senha</Text>
              <Text style={styles.optionSubtitle}>Modificar senha de acesso</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem} onPress={handleViewCertifications}>
            <View style={styles.optionIcon}>
              <Ionicons name="school" size={20} color="#94A3B8" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Certificações</Text>
              <Text style={styles.optionSubtitle}>Gerenciar certificados e cursos</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Professional Info */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>ℹ️ Informações Profissionais</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Especialização:</Text>
              <Text style={styles.infoValue}>Musculação e Condicionamento</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Registro CREF:</Text>
              <Text style={styles.infoValue}>CREF-12345/SP</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Data de Cadastro:</Text>
              <Text style={styles.infoValue}>
                {professional?.created_at ? 
                  new Date(professional.created_at).toLocaleDateString('pt-BR') : 
                  '01/01/2025'
                }
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Plataforma:</Text>
              <Text style={styles.infoValue}>LuxePass Professional</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#EF4444" />
          <Text style={styles.logoutButtonText}>Sair da Conta</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
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
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
  },
  headerIcon: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 2,
  },
  profileSpecialty: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    gap: 6,
  },
  editButtonText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  statsSection: {
    marginVertical: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  optionsSection: {
    marginVertical: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
  },
  infoSection: {
    marginVertical: 16,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 8,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
});