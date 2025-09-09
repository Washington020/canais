import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { notificationService } from '../services/notificationService';
import LoadingSpinner from '../components/LoadingSpinner';
import FeedbackToast from '../components/FeedbackToast';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface NotificationPreferences {
  payment_reminders: boolean;
  token_reminders: boolean;
  gym_reminders: boolean;
  promotional: boolean;
  weekly_summary: boolean;
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    payment_reminders: true,
    token_reminders: true,
    gym_reminders: true,
    promotional: false,
    weekly_summary: true,
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const router = useRouter();

  const loadPreferences = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/client/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Check notification permissions
      const notificationPermissions = await notificationService.areNotificationsEnabled();
      setNotificationsEnabled(notificationPermissions);

      // Load user preferences
      const response = await axios.get(`${API_URL}/notifications/user/preferences`, { headers });
      setPreferences(response.data);

    } catch (error: any) {
      console.error('Erro ao carregar preferências:', error);
      showToast('Erro ao carregar preferências', 'error');
      if (error.response?.status === 401) {
        router.replace('/client/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  const savePreferences = useCallback(async (newPreferences: NotificationPreferences) => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      await axios.put(`${API_URL}/notifications/user/preferences`, newPreferences, { headers });
      
      setPreferences(newPreferences);
      showToast('Preferências salvas com sucesso!', 'success');

    } catch (error: any) {
      console.error('Erro ao salvar preferências:', error);
      showToast('Erro ao salvar preferências', 'error');
    } finally {
      setSaving(false);
    }
  }, []);

  const requestNotificationPermissions = useCallback(async () => {
    try {
      const initialized = await notificationService.initialize();
      if (initialized) {
        setNotificationsEnabled(true);
        showToast('Notificações habilitadas com sucesso!', 'success');
      } else {
        Alert.alert(
          'Permissão Negada',
          'Para receber notificações, você precisa habilitar as permissões nas configurações do dispositivo.',
          [
            { text: 'OK', style: 'default' }
          ]
        );
      }
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
      showToast('Erro ao habilitar notificações', 'error');
    }
  }, []);

  const handlePreferenceChange = useCallback((key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['token', 'user']);
              await notificationService.cancelAllNotifications();
              router.replace('/client/login');
            } catch (error) {
              console.error('Erro ao fazer logout:', error);
            }
          }
        }
      ]
    );
  }, [router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={40} gradient />
          <Text style={styles.loadingText}>Carregando configurações...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Configurações</Text>
        
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificações</Text>
          
          {!notificationsEnabled && (
            <TouchableOpacity 
              style={styles.enableNotificationsCard}
              onPress={requestNotificationPermissions}
            >
              <View style={styles.enableNotificationsContent}>
                <Ionicons name="notifications-off" size={24} color="#F59E0B" />
                <View style={styles.enableNotificationsText}>
                  <Text style={styles.enableNotificationsTitle}>
                    Notificações Desabilitadas
                  </Text>
                  <Text style={styles.enableNotificationsSubtitle}>
                    Toque para habilitar e receber lembretes importantes
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
              </View>
            </TouchableOpacity>
          )}

          <View style={[styles.settingsCard, !notificationsEnabled && styles.disabledCard]}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Lembretes de Pagamento</Text>
                <Text style={styles.settingSubtitle}>
                  Receba notificações sobre vencimentos de assinatura
                </Text>
              </View>
              <Switch
                value={preferences.payment_reminders}
                onValueChange={(value) => handlePreferenceChange('payment_reminders', value)}
                trackColor={{ false: '#374151', true: '#8B5CF6' }}
                thumbColor={preferences.payment_reminders ? '#FFFFFF' : '#9CA3AF'}
                disabled={!notificationsEnabled || saving}
              />
            </View>

            <View style={styles.separator} />

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Lembretes de Tokens</Text>
                <Text style={styles.settingSubtitle}>
                  Seja lembrado de usar seus tokens disponíveis
                </Text>
              </View>
              <Switch
                value={preferences.token_reminders}
                onValueChange={(value) => handlePreferenceChange('token_reminders', value)}
                trackColor={{ false: '#374151', true: '#8B5CF6' }}
                thumbColor={preferences.token_reminders ? '#FFFFFF' : '#9CA3AF'}
                disabled={!notificationsEnabled || saving}
              />
            </View>

            <View style={styles.separator} />

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Lembretes de Academia</Text>
                <Text style={styles.settingSubtitle}>
                  Receba notificações sobre suas atividades na academia
                </Text>
              </View>
              <Switch
                value={preferences.gym_reminders}
                onValueChange={(value) => handlePreferenceChange('gym_reminders', value)}
                trackColor={{ false: '#374151', true: '#8B5CF6' }}
                thumbColor={preferences.gym_reminders ? '#FFFFFF' : '#9CA3AF'}
                disabled={!notificationsEnabled || saving}
              />
            </View>

            <View style={styles.separator} />

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Ofertas Promocionais</Text>
                <Text style={styles.settingSubtitle}>
                  Receba notificações sobre promoções e novidades
                </Text>
              </View>
              <Switch
                value={preferences.promotional}
                onValueChange={(value) => handlePreferenceChange('promotional', value)}
                trackColor={{ false: '#374151', true: '#8B5CF6' }}
                thumbColor={preferences.promotional ? '#FFFFFF' : '#9CA3AF'}
                disabled={!notificationsEnabled || saving}
              />
            </View>

            <View style={styles.separator} />

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Resumo Semanal</Text>
                <Text style={styles.settingSubtitle}>
                  Receba um resumo das suas atividades da semana
                </Text>
              </View>
              <Switch
                value={preferences.weekly_summary}
                onValueChange={(value) => handlePreferenceChange('weekly_summary', value)}
                trackColor={{ false: '#374151', true: '#8B5CF6' }}
                thumbColor={preferences.weekly_summary ? '#FFFFFF' : '#9CA3AF'}
                disabled={!notificationsEnabled || saving}
              />
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta</Text>
          
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Editar Perfil</Text>
                <Text style={styles.settingSubtitle}>
                  Altere suas informações pessoais
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Alterar Senha</Text>
                <Text style={styles.settingSubtitle}>
                  Atualize sua senha de acesso
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Privacidade</Text>
                <Text style={styles.settingSubtitle}>
                  Gerencie suas configurações de privacidade
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suporte</Text>
          
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Central de Ajuda</Text>
                <Text style={styles.settingSubtitle}>
                  Encontre respostas para suas dúvidas
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Fale Conosco</Text>
                <Text style={styles.settingSubtitle}>
                  Entre em contato com nosso suporte
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Sobre o LuxePass</Text>
                <Text style={styles.settingSubtitle}>
                  Versão 1.0.0 - Informações do aplicativo
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Sair da Conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Saving Indicator */}
      {saving && (
        <View style={styles.savingOverlay}>
          <LoadingSpinner size={24} color="#FFFFFF" />
          <Text style={styles.savingText}>Salvando...</Text>
        </View>
      )}

      {/* Toast */}
      <FeedbackToast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
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
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledCard: {
    opacity: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: 20,
  },
  enableNotificationsCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 16,
  },
  enableNotificationsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  enableNotificationsText: {
    flex: 1,
    marginLeft: 12,
  },
  enableNotificationsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  enableNotificationsSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9998,
  },
  savingText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 12,
  },
});