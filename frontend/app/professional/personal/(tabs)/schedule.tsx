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

interface Appointment {
  id: string;
  client_name: string;
  client_email: string;
  client_plan: string;
  date: string;
  time: string;
  duration: string;
  status: string;
  notes: string;
  meeting_type: string;
  created_at: string;
}

export default function PersonalTrainerSchedule() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [professional, setProfessional] = useState<any>(null);
  const [confirmingAppointment, setConfirmingAppointment] = useState<string | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    loadProfessionalData();
    loadAppointments();
  }, []);

  const loadProfessionalData = async () => {
    try {
      const professionalData = await AsyncStorage.getItem('professional');
      if (professionalData) {
        setProfessional(JSON.parse(professionalData));
      }
    } catch (error) {
      console.error('Error loading professional data:', error);
    }
  };

  const loadAppointments = async () => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) {
        router.replace('/professional/personal/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/professionals/my-appointments`, { headers });
      
      setAppointments(response.data.appointments || []);
    } catch (error: any) {
      console.error('Error loading appointments:', error);
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
    loadAppointments();
  };

  const confirmAppointment = async (appointmentId: string) => {
    setConfirmingAppointment(appointmentId);
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(
        `${API_URL}/professionals/appointments/${appointmentId}/confirm`,
        {},
        { headers }
      );
      
      Alert.alert('✅ Sucesso', 'Agendamento confirmado com sucesso!');
      loadAppointments(); // Reload to update status
      
    } catch (error: any) {
      console.error('Error confirming appointment:', error);
      Alert.alert('Erro', 'Não foi possível confirmar o agendamento');
    } finally {
      setConfirmingAppointment(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#3B82F6';
      case 'scheduled':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'scheduled':
        return 'Agendado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'vip':
        return '#FFD700';
      case 'premium':
        return '#8B5CF6';
      default:
        return '#64748B';
    }
  };

  const groupAppointmentsByDate = (appointments: Appointment[]) => {
    const grouped: { [key: string]: Appointment[] } = {};
    
    appointments.forEach(appointment => {
      const date = appointment.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(appointment);
    });
    
    // Sort dates and sort appointments within each date by time
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.time.localeCompare(b.time));
    });
    
    return grouped;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Carregando agendamentos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const groupedAppointments = groupAppointmentsByDate(appointments);
  const sortedDates = Object.keys(groupedAppointments).sort();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Minha Agenda</Text>
          <Text style={styles.subtitle}>
            {professional?.full_name} - {professional?.cref_crn}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => onRefresh()}
        >
          <Ionicons name="refresh" size={20} color="#3B82F6" />
          <Text style={styles.refreshText}>Atualizar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={20} color="#3B82F6" />
            <Text style={styles.statNumber}>{appointments.length}</Text>
            <Text style={styles.statLabel}>Agendamentos</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
            <Text style={styles.statNumber}>
              {appointments.filter(a => a.status === 'confirmed').length}
            </Text>
            <Text style={styles.statLabel}>Confirmados</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="time" size={20} color="#F59E0B" />
            <Text style={styles.statNumber}>
              {appointments.filter(a => a.status === 'scheduled').length}
            </Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
        </View>

        {/* Appointments List */}
        {appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#64748B" />
            <Text style={styles.emptyTitle}>Nenhum Agendamento</Text>
            <Text style={styles.emptyText}>
              Você não tem consultas agendadas no momento. Os agendamentos aparecerão aqui quando os clientes marcarem consultas.
            </Text>
          </View>
        ) : (
          <View style={styles.appointmentsContainer}>
            {sortedDates.map((date) => (
              <View key={date} style={styles.dateSection}>
                <Text style={styles.dateHeader}>
                  {formatDate(date)}
                </Text>
                
                {groupedAppointments[date].map((appointment) => (
                  <View key={appointment.id} style={styles.appointmentCard}>
                    <View style={styles.appointmentHeader}>
                      <View style={styles.appointmentInfo}>
                        <Text style={styles.clientName}>{appointment.client_name}</Text>
                        <Text style={styles.clientEmail}>{appointment.client_email}</Text>
                      </View>
                      <View style={styles.badgeContainer}>
                        <View style={[
                          styles.planBadge,
                          { backgroundColor: getPlanColor(appointment.client_plan) }
                        ]}>
                          <Text style={styles.planBadgeText}>
                            {appointment.client_plan.toUpperCase()}
                          </Text>
                        </View>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(appointment.status) }
                        ]}>
                          <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.appointmentDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="time" size={16} color="#3B82F6" />
                        <Text style={styles.detailText}>
                          {appointment.time} • {appointment.duration}
                        </Text>
                      </View>
                      
                      <View style={styles.detailRow}>
                        <Ionicons name="location" size={16} color="#3B82F6" />
                        <Text style={styles.detailText}>
                          {appointment.meeting_type === 'presencial' ? 'Presencial' : 'Online'}
                        </Text>
                      </View>

                      {appointment.notes && (
                        <View style={styles.detailRow}>
                          <Ionicons name="document-text" size={16} color="#3B82F6" />
                          <Text style={styles.detailText}>{appointment.notes}</Text>
                        </View>
                      )}
                      
                      <View style={styles.detailRow}>
                        <Ionicons name="calendar" size={16} color="#64748B" />
                        <Text style={styles.detailTextSecondary}>
                          Agendado em: {new Date(appointment.created_at).toLocaleDateString('pt-BR')}
                        </Text>
                      </View>
                    </View>

                    {appointment.status === 'scheduled' && (
                      <View style={styles.appointmentActions}>
                        <TouchableOpacity
                          style={[
                            styles.confirmButton,
                            confirmingAppointment === appointment.id && styles.confirmButtonLoading
                          ]}
                          onPress={() => confirmAppointment(appointment.id)}
                          disabled={confirmingAppointment === appointment.id}
                        >
                          {confirmingAppointment === appointment.id ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                              <Text style={styles.confirmButtonText}>Confirmar Consulta</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#3B82F6',
    fontSize: 14,
    marginTop: 4,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  refreshText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
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
  },
  dateSection: {
    marginBottom: 32,
  },
  dateHeader: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  appointmentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clientEmail: {
    color: '#64748B',
    fontSize: 12,
  },
  badgeContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  planBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  appointmentDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    color: '#94A3B8',
    fontSize: 14,
    marginLeft: 8,
  },
  detailTextSecondary: {
    color: '#64748B',
    fontSize: 12,
    marginLeft: 8,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  confirmButtonLoading: {
    backgroundColor: '#64748B',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});