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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface PendingAppointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_plan: string;
  appointment_date: string;
  appointment_time: string;
  professional_type: string;
  notes: string;
  created_at: string;
}

export default function NewClients() {
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    loadPendingAppointments();
  }, []);

  const loadPendingAppointments = async () => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) {
        router.replace('/professional/personal/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/professionals/pending-appointments`, { headers });
      
      console.log('✅ Agendamentos pendentes recebidos:', response.data);
      setPendingAppointments(response.data.pending_appointments || []);
    } catch (error: any) {
      console.error('❌ Erro ao carregar agendamentos pendentes:', error);
      if (error.response?.status === 401) {
        router.replace('/professional/personal/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPendingAppointments();
  };

  const acceptClient = async (appointmentId: string, clientName: string, date: string, time: string) => {
    Alert.alert(
      'Assumir Cliente',
      `Deseja assumir ${clientName} como seu cliente?\n\n📅 Data: ${new Date(date).toLocaleDateString('pt-BR')}\n🕐 Horário: ${time}h\n\nVocê será responsável pelo acompanhamento nutricional deste cliente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Assumir Cliente',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('professionalToken');
              const headers = { Authorization: `Bearer ${token}` };
              
              const response = await axios.post(
                `${API_URL}/professionals/accept-client/${appointmentId}`,
                {},
                { headers }
              );
              
              Alert.alert(
                '✅ Sucesso!', 
                response.data.message || 'Cliente assumido com sucesso!',
                [{ text: 'OK', onPress: () => loadPendingAppointments() }]
              );
              
              // Remove from pending list
              setPendingAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
            } catch (error: any) {
              console.error('Erro ao aceitar cliente:', error);
              if (error.response?.data?.detail) {
                Alert.alert('Erro', error.response.data.detail);
              } else {
                Alert.alert('Erro', 'Não foi possível aceitar o cliente');
              }
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
          <Text style={styles.loadingText}>Carregando novos clientes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Novos Clientes</Text>
        <Text style={styles.subtitle}>Agendamentos aguardando profissional</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#22C55E" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Como funciona?</Text>
            <Text style={styles.infoDescription}>
              • Clientes fazem agendamentos e entram na fila{'\n'}
              • Você vê todos os agendamentos pendentes aqui{'\n'}
              • Clique em "Assumir Cliente" para aceitar{'\n'}
              • O agendamento vai para sua agenda automaticamente{'\n'}
              • O cliente será notificado que você aceitou
            </Text>
          </View>
        </View>

        {/* Pending Appointments */}
        {pendingAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#22C55E" />
            <Text style={styles.emptyTitle}>Nenhum agendamento pendente!</Text>
            <Text style={styles.emptyText}>
              No momento não há novos clientes aguardando.
              Quando um cliente agendar um treino personalizado, ele aparecerá aqui.
            </Text>
          </View>
        ) : (
          <View style={styles.appointmentsContainer}>
            <Text style={styles.sectionTitle}>
              {pendingAppointments.length} agendamento{pendingAppointments.length > 1 ? 's' : ''} pendente{pendingAppointments.length > 1 ? 's' : ''}
            </Text>
            
            {pendingAppointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{appointment.client_name}</Text>
                    <Text style={styles.clientEmail}>{appointment.client_email}</Text>
                    {appointment.client_phone && (
                      <Text style={styles.clientPhone}>📱 {appointment.client_phone}</Text>
                    )}
                  </View>
                  
                  <View style={styles.badgeContainer}>
                    <View style={[
                      styles.planBadge,
                      { backgroundColor: appointment.client_plan === 'vip' ? '#FFD700' : appointment.client_plan === 'premium' ? '#8B5CF6' : '#22C55E' }
                    ]}>
                      <Text style={styles.planBadgeText}>
                        {appointment.client_plan?.toUpperCase() || 'INTERMEDIÁRIO'}
                      </Text>
                    </View>
                    
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NOVO</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.appointmentDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar" size={18} color="#22C55E" />
                    <Text style={styles.detailText}>
                      {new Date(appointment.appointment_date).toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="time" size={18} color="#22C55E" />
                    <Text style={styles.detailText}>
                      {appointment.appointment_time}h
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="hourglass" size={18} color="#94A3B8" />
                    <Text style={styles.detailTextSmall}>
                      Solicitado há {Math.floor((new Date().getTime() - new Date(appointment.created_at).getTime()) / (1000 * 60))} minutos
                    </Text>
                  </View>

                  {appointment.notes && (
                    <View style={styles.notesContainer}>
                      <Ionicons name="document-text" size={16} color="#94A3B8" />
                      <Text style={styles.notesText}>{appointment.notes}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity 
                  style={styles.acceptButton}
                  onPress={() => acceptClient(
                    appointment.id, 
                    appointment.client_name,
                    appointment.appointment_date,
                    appointment.appointment_time
                  )}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.acceptButtonText}>Assumir Cliente</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 12,
    padding: 16,
    margin: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoDescription: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  appointmentsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionTitle: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  appointmentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clientEmail: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 2,
  },
  clientPhone: {
    color: '#94A3B8',
    fontSize: 13,
  },
  badgeContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  newBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  appointmentDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  detailTextSmall: {
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 8,
  },
  notesContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  notesText: {
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
