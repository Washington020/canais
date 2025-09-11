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
  Modal,
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

interface AppointmentSlot {
  id: string;
  professional_id: string;
  professional_name: string;
  professional_cref: string;
  date: string;
  time: string;
  datetime: string;
  duration: string;
}

interface Appointment {
  id: string;
  professional_name: string;
  professional_type: string;
  professional_cref: string;
  date: string;
  time: string;
  duration: string;
  status: string;
  notes: string;
  meeting_type: string;
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedProfessionalType, setSelectedProfessionalType] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<any>(null);
  
  const router = useRouter();

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/client/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/appointments/my-appointments`, { headers });
      
      setAppointments(response.data.appointments || []);
    } catch (error: any) {
      console.error('Error loading appointments:', error);
      if (error.response?.status === 401) {
        router.replace('/client/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAvailableSlots = async (professionalType: string) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get(
        `${API_URL}/appointments/available-slots?professional_type=${professionalType}`, 
        { headers }
      );
      
      setAvailableSlots(response.data.available_slots || []);
      setQuotaInfo({
        used: response.data.quota_used,
        limit: response.data.quota_limit,
        professionalType: professionalType
      });
      
    } catch (error: any) {
      console.error('Error loading slots:', error);
      if (error.response?.status === 403) {
        Alert.alert('Plano Insuficiente', 'Agendamentos estão disponíveis apenas para clientes Premium e VIP');
      } else if (error.response?.status === 400) {
        Alert.alert('Limite Alcançado', error.response.data.detail);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar horários disponíveis');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  const openScheduleModal = (professionalType: string) => {
    setSelectedProfessionalType(professionalType);
    setShowScheduleModal(true);
    loadAvailableSlots(professionalType);
  };

  const selectSlot = (slot: AppointmentSlot) => {
    setSelectedSlot(slot);
  };

  const confirmSchedule = async () => {
    if (!selectedSlot) {
      Alert.alert('Erro', 'Por favor, selecione um horário');
      return;
    }

    setScheduling(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const requestData = {
        professional_id: selectedSlot.professional_id,
        appointment_datetime: selectedSlot.datetime,
        professional_type: selectedProfessionalType,
        notes: notes.trim()
      };
      
      const response = await axios.post(
        `${API_URL}/appointments/schedule`,
        requestData,
        { headers }
      );
      
      if (response.data.success) {
        Alert.alert(
          '✅ Agendamento Confirmado!',
          response.data.message,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowScheduleModal(false);
                setSelectedSlot(null);
                setNotes('');
                loadAppointments();
              }
            }
          ]
        );
      }
      
    } catch (error: any) {
      console.error('Error scheduling appointment:', error);
      Alert.alert('Erro', error.response?.data?.detail || 'Não foi possível agendar a consulta');
    } finally {
      setScheduling(false);
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
        return '#22C55E';
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Agendamentos</Text>
        <Text style={styles.subtitle}>Marque suas consultas</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Schedule Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Agendar Nova Consulta</Text>
          
          <View style={styles.scheduleButtons}>
            <TouchableOpacity 
              style={styles.scheduleButton}
              onPress={() => openScheduleModal('nutritionist')}
            >
              <View style={styles.scheduleButtonIcon}>
                <Ionicons name="restaurant" size={24} color="#22C55E" />
              </View>
              <Text style={styles.scheduleButtonTitle}>Nutricionista</Text>
              <Text style={styles.scheduleButtonSubtitle}>2 consultas/mês</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.scheduleButton}
              onPress={() => openScheduleModal('personal')}
            >
              <View style={styles.scheduleButtonIcon}>
                <Ionicons name="fitness" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.scheduleButtonTitle}>Personal Trainer</Text>
              <Text style={styles.scheduleButtonSubtitle}>1 consulta/mês</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* My Appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Meus Agendamentos</Text>
          
          {appointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#64748B" />
              <Text style={styles.emptyTitle}>Nenhum Agendamento</Text>
              <Text style={styles.emptyText}>
                Você ainda não tem consultas agendadas. Agende uma consulta acima.
              </Text>
            </View>
          ) : (
            appointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentProfessional}>
                      {appointment.professional_name}
                    </Text>
                    <Text style={styles.appointmentType}>
                      {appointment.professional_type === 'nutritionist' ? 'Nutricionista' : 'Personal Trainer'} • {appointment.professional_cref}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(appointment.status) }
                  ]}>
                    <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
                  </View>
                </View>

                <View style={styles.appointmentDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar" size={16} color="#3B82F6" />
                    <Text style={styles.detailText}>
                      {formatDate(appointment.date)}
                    </Text>
                  </View>
                  
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
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Schedule Modal */}
      <Modal
        visible={showScheduleModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowScheduleModal(false)}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Agendar {selectedProfessionalType === 'nutritionist' ? 'Nutricionista' : 'Personal Trainer'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {quotaInfo && (
            <View style={styles.quotaInfo}>
              <Text style={styles.quotaText}>
                Utilizadas: {quotaInfo.used}/{quotaInfo.limit} consultas neste mês
              </Text>
            </View>
          )}

          <ScrollView style={styles.modalContent}>
            {loading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.modalLoadingText}>Carregando horários...</Text>
              </View>
            ) : availableSlots.length === 0 ? (
              <View style={styles.modalEmptyState}>
                <Ionicons name="calendar-outline" size={48} color="#64748B" />
                <Text style={styles.modalEmptyTitle}>Nenhum Horário Disponível</Text>
                <Text style={styles.modalEmptyText}>
                  Não há horários disponíveis no momento ou você atingiu o limite mensal.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.slotsTitle}>Horários Disponíveis</Text>
                
                {availableSlots.map((slot) => (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.slotCard,
                      selectedSlot?.id === slot.id && styles.selectedSlotCard
                    ]}
                    onPress={() => selectSlot(slot)}
                  >
                    <View style={styles.slotInfo}>
                      <Text style={styles.slotProfessional}>{slot.professional_name}</Text>
                      <Text style={styles.slotCref}>{slot.professional_cref}</Text>
                      <Text style={styles.slotDateTime}>
                        {formatDate(slot.date)} • {slot.time}
                      </Text>
                      <Text style={styles.slotDuration}>{slot.duration}</Text>
                    </View>
                    {selectedSlot?.id === slot.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                    )}
                  </TouchableOpacity>
                ))}

                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Observações (opcional)</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Adicione observações sobre a consulta..."
                    placeholderTextColor="#64748B"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (!selectedSlot || scheduling) && styles.confirmButtonDisabled
                  ]}
                  onPress={confirmSchedule}
                  disabled={!selectedSlot || scheduling}
                >
                  {scheduling ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="calendar" size={20} color="#FFFFFF" />
                      <Text style={styles.confirmButtonText}>Confirmar Agendamento</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 16,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  scheduleButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  scheduleButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scheduleButtonIcon: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleButtonTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scheduleButtonSubtitle: {
    color: '#64748B',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
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
  appointmentProfessional: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appointmentType: {
    color: '#64748B',
    fontSize: 12,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#0B0D17',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quotaInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  quotaText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  modalLoadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  modalEmptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  modalEmptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  modalEmptyText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  slotsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  slotCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedSlotCard: {
    borderColor: '#22C55E',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  slotInfo: {
    flex: 1,
  },
  slotProfessional: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  slotCref: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 8,
  },
  slotDateTime: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 4,
  },
  slotDuration: {
    color: '#64748B',
    fontSize: 12,
  },
  notesContainer: {
    marginVertical: 20,
  },
  notesLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    marginBottom: 40,
  },
  confirmButtonDisabled: {
    backgroundColor: '#64748B',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});