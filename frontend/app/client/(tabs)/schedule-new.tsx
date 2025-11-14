import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import VideoCallModal from '../../../../../components/VideoCallModal';

const API_URL = '/api';

interface MyAppointment {
  id: string;
  professional_id: string;
  professional_name: string;
  professional_type: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  video_room_url?: string;
  can_cancel: boolean;
}

interface UserProfile {
  plan_type: string;
  full_name: string;
  email: string;
}

export default function ClientSchedule() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [appointments, setAppointments] = useState<MyAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<MyAppointment | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/client/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      
      // Load user profile
      const profileResponse = await axios.get(`${API_URL}/users/profile`, { headers });
      setUser(profileResponse.data);

      // Load appointments
      const appointmentsResponse = await axios.get(`${API_URL}/appointments/my-appointments`, { headers });
      setAppointments(appointmentsResponse.data.appointments || []);
      
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      if (error.response?.status === 401) {
        router.replace('/client/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    Alert.alert(
      'Cancelar Consulta',
      'Tem certeza que deseja cancelar esta consulta?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(
                `${API_URL}/appointments/${appointmentId}/cancel`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              
              Alert.alert('Sucesso', 'Consulta cancelada com sucesso!');
              loadData();
            } catch (error) {
              console.error('Erro ao cancelar:', error);
              Alert.alert('Erro', 'Não foi possível cancelar a consulta.');
            }
          }
        }
      ]
    );
  };

  const joinVideoCall = async (appointment: MyAppointment) => {
    try {
      // Check if it's time for the appointment (within 15 minutes before)
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      const now = new Date();
      const timeDiff = appointmentDateTime.getTime() - now.getTime();
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));

      if (minutesDiff > 15) {
        Alert.alert(
          'Aguarde',
          `A consulta começa às ${appointment.appointment_time}. Você poderá entrar 15 minutos antes.`
        );
        return;
      }

      if (minutesDiff < -30) {
        Alert.alert(
          'Consulta Expirada',
          'O horário desta consulta já passou.'
        );
        return;
      }

      // Create or get video room
      let roomUrl = appointment.video_room_url;
      
      if (!roomUrl) {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.post(
          `${API_URL}/video/create-room`,
          { appointment_id: appointment.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        roomUrl = response.data.room_url;
      }

      setSelectedAppointment({ ...appointment, video_room_url: roomUrl });
      setShowVideoModal(true);
      
    } catch (error) {
      console.error('Erro ao entrar na chamada:', error);
      Alert.alert('Erro', 'Não foi possível iniciar a videochamada.');
    }
  };

  const getProfessionalIcon = (type: string) => {
    return type === 'nutritionist' ? 'restaurant' : 'barbell';
  };

  const getProfessionalColor = (type: string) => {
    return type === 'nutritionist' ? '#10B981' : '#8B5CF6';
  };

  const getProfessionalLabel = (type: string) => {
    return type === 'nutritionist' ? 'Nutricionista' : 'Personal Trainer';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#22C55E';
      case 'completed': return '#3B82F6';
      case 'cancelled': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return 'Pendente';
    }
  };

  const canJoinCall = (appointment: MyAppointment) => {
    if (appointment.status !== 'confirmed') return false;
    
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const now = new Date();
    const timeDiff = appointmentDateTime.getTime() - now.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));

    return minutesDiff <= 15 && minutesDiff >= -30;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando consultas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const upcomingAppointments = appointments.filter(a => a.status === 'confirmed');
  const pastAppointments = appointments.filter(a => a.status === 'completed');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor="#8B5CF6" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="calendar" size={32} color="#8B5CF6" />
          <Text style={styles.headerTitle}>Minhas Consultas</Text>
          <Text style={styles.headerSubtitle}>
            Plano: {user?.plan_type?.toUpperCase()}
          </Text>
        </View>

        {/* Book New Appointment Button */}
        <TouchableOpacity
          style={styles.newAppointmentButton}
          onPress={() => router.push('/client/(tabs)/schedule')}
        >
          <Ionicons name="add-circle" size={24} color="#FFFFFF" />
          <Text style={styles.newAppointmentText}>Agendar Nova Consulta</Text>
        </TouchableOpacity>

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Próximas Consultas</Text>
            
            {upcomingAppointments.map((appointment) => (
              <View
                key={appointment.id}
                style={[
                  styles.appointmentCard,
                  { borderLeftColor: getProfessionalColor(appointment.professional_type) }
                ]}
              >
                <View style={styles.appointmentHeader}>
                  <View style={styles.professionalInfo}>
                    <Ionicons
                      name={getProfessionalIcon(appointment.professional_type)}
                      size={24}
                      color={getProfessionalColor(appointment.professional_type)}
                    />
                    <View style={styles.professionalText}>
                      <Text style={styles.professionalName}>
                        {appointment.professional_name}
                      </Text>
                      <Text style={styles.professionalType}>
                        {getProfessionalLabel(appointment.professional_type)}
                      </Text>
                    </View>
                  </View>
                  
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(appointment.status)}20` }
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(appointment.status) }
                      ]}
                    >
                      {getStatusLabel(appointment.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.appointmentDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar" size={16} color="#94A3B8" />
                    <Text style={styles.detailText}>
                      {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="time" size={16} color="#94A3B8" />
                    <Text style={styles.detailText}>{appointment.appointment_time}</Text>
                  </View>
                </View>

                <View style={styles.appointmentActions}>
                  {canJoinCall(appointment) && (
                    <TouchableOpacity
                      style={styles.joinButton}
                      onPress={() => joinVideoCall(appointment)}
                    >
                      <Ionicons name="videocam" size={20} color="#FFFFFF" />
                      <Text style={styles.joinButtonText}>Entrar em Consulta</Text>
                    </TouchableOpacity>
                  )}
                  
                  {appointment.can_cancel && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => cancelAppointment(appointment.id)}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Consultas Anteriores</Text>
            
            {pastAppointments.map((appointment) => (
              <View key={appointment.id} style={styles.pastAppointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.professionalInfo}>
                    <Ionicons
                      name={getProfessionalIcon(appointment.professional_type)}
                      size={20}
                      color="#64748B"
                    />
                    <Text style={styles.pastProfessionalName}>
                      {appointment.professional_name}
                    </Text>
                  </View>
                </View>

                <View style={styles.appointmentDetails}>
                  <Text style={styles.pastDetailText}>
                    {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')} às {appointment.appointment_time}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {appointments.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#64748B" />
            <Text style={styles.emptyText}>Nenhuma consulta agendada</Text>
            <Text style={styles.emptySubtext}>
              Clique em "Agendar Nova Consulta" para começar
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Video Call Modal */}
      {showVideoModal && selectedAppointment && (
        <VideoCallModal
          visible={showVideoModal}
          roomUrl={selectedAppointment.video_room_url || ''}
          userName={user?.full_name || 'Cliente'}
          onClose={() => {
            setShowVideoModal(false);
            setSelectedAppointment(null);
          }}
          onCallEnded={() => {
            loadData();
          }}
        />
      )}
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
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  newAppointmentButton: {
    flexDirection: 'row',
    backgroundColor: '#8B5CF6',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  newAppointmentText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  appointmentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  professionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  professionalText: {
    gap: 2,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  professionalType: {
    fontSize: 12,
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  appointmentDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#E2E8F0',
  },
  appointmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  joinButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#22C55E',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  pastAppointmentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    opacity: 0.7,
  },
  pastProfessionalName: {
    fontSize: 14,
    color: '#94A3B8',
  },
  pastDetailText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});