import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface Appointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
}

interface AppointmentStats {
  total_appointments_month: number;
  completed_appointments: number;
  scheduled_appointments: number;
  total_clients_served: number;
  monthly_hours: number;
}

export default function PersonalTrainerSchedule() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showDayModal, setShowDayModal] = useState(false);
  const [availabilityModal, setAvailabilityModal] = useState(false);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState<Appointment[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadAppointments();
    loadStats();
  }, []);

  const loadAppointments = async () => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) {
        router.replace('/professional/personal/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/professionals/appointments`, { headers });
      
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

  const loadStats = async () => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/professionals/appointments/stats`, { headers });
      
      setStats(response.data);
    } catch (error: any) {
      console.error('Error loading stats:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
    loadStats();
  };

  const markAppointmentComplete = async (appointmentId: string) => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.put(`${API_URL}/appointments/${appointmentId}/complete`, {}, { headers });
      
      Alert.alert('Sucesso', 'Consulta marcada como concluída');
      loadAppointments();
      loadStats();
    } catch (error: any) {
      console.error('Error completing appointment:', error);
      Alert.alert('Erro', 'Não foi possível marcar como concluída');
    }
  };

  const setAvailability = async (date: string) => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      const headers = { Authorization: `Bearer ${token}` };
      
      const professionalData = await AsyncStorage.getItem('professional');
      const professional = JSON.parse(professionalData || '{}');
      
      const availabilityData = {
        professional_id: professional.id,
        professional_type: "personal",
        date: date,
        start_time: "08:00",
        end_time: "19:00",
        break_times: ["12:00", "13:00"], // Lunch break
        slot_duration: 60
      };
      
      await axios.post(`${API_URL}/professionals/availability`, availabilityData, { headers });
      
      Alert.alert('Sucesso', `Horários disponibilizados para ${date}`);
      setAvailabilityModal(false);
    } catch (error: any) {
      console.error('Error setting availability:', error);
      Alert.alert('Erro', error.response?.data?.detail || 'Não foi possível definir disponibilidade');
    }
  };

  const onDayPress = (day: any) => {
    const dayAppointments = appointments.filter(apt => apt.appointment_date === day.dateString);
    setSelectedDate(day.dateString);
    setSelectedDayAppointments(dayAppointments);
    setShowDayModal(true);
  };

  const getMarkedDates = () => {
    const marked: any = {};
    
    appointments.forEach(apt => {
      if (!marked[apt.appointment_date]) {
        marked[apt.appointment_date] = {
          marked: true,
          dotColor: apt.status === 'completed' ? '#22C55E' : '#F59E0B',
          activeOpacity: 0.7
        };
      }
    });
    
    return marked;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Carregando agenda...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Agenda Personal Trainer</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setAvailabilityModal(true)}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.total_appointments_month}</Text>
              <Text style={styles.statLabel}>Treinos/Mês</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.total_clients_served}</Text>
              <Text style={styles.statLabel}>Clientes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.monthly_hours.toFixed(0)}h</Text>
              <Text style={styles.statLabel}>Horas/Mês</Text>
            </View>
          </View>
        )}

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={onDayPress}
            markedDates={getMarkedDates()}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'rgba(255, 255, 255, 0.1)',
              textSectionTitleColor: '#FFFFFF',
              selectedDayBackgroundColor: '#F59E0B',
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: '#F59E0B',
              dayTextColor: '#FFFFFF',
              textDisabledColor: 'rgba(255, 255, 255, 0.3)',
              dotColor: '#F59E0B',
              selectedDotColor: '#FFFFFF',
              arrowColor: '#F59E0B',
              monthTextColor: '#FFFFFF',
              indicatorColor: '#F59E0B',
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '500',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 13
            }}
            style={styles.calendar}
          />
        </View>

        {/* Today's Appointments */}
        <View style={styles.todaySection}>
          <Text style={styles.sectionTitle}>Treinos de Hoje</Text>
          {appointments.filter(apt => apt.appointment_date === new Date().toISOString().split('T')[0]).length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>Nenhum treino agendado para hoje</Text>
            </View>
          ) : (
            appointments
              .filter(apt => apt.appointment_date === new Date().toISOString().split('T')[0])
              .map((appointment) => (
                <View key={appointment.id} style={styles.appointmentCard}>
                  <View style={styles.appointmentHeader}>
                    <View style={styles.timeContainer}>
                      <Ionicons name="time" size={16} color="#F59E0B" />
                      <Text style={styles.appointmentTime}>{appointment.appointment_time}</Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: appointment.status === 'completed' ? '#22C55E' : '#F59E0B' }
                    ]}>
                      <Text style={styles.statusText}>
                        {appointment.status === 'completed' ? 'Concluído' : 'Agendado'}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.clientName}>{appointment.client_name}</Text>
                  <Text style={styles.clientContact}>{appointment.client_email}</Text>
                  <Text style={styles.clientContact}>{appointment.client_phone}</Text>
                  
                  {appointment.notes && (
                    <Text style={styles.appointmentNotes}>{appointment.notes}</Text>
                  )}
                  
                  {appointment.status !== 'completed' && (
                    <TouchableOpacity 
                      style={styles.completeButton}
                      onPress={() => markAppointmentComplete(appointment.id)}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.completeButtonText}>Marcar como Concluído</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
          )}
        </View>
      </ScrollView>

      {/* Day Modal */}
      <Modal
        visible={showDayModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Treinos - {new Date(selectedDate).toLocaleDateString('pt-BR')}
              </Text>
              <TouchableOpacity onPress={() => setShowDayModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              {selectedDayAppointments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="fitness-outline" size={48} color="#64748B" />
                  <Text style={styles.emptyText}>Nenhum treino neste dia</Text>
                </View>
              ) : (
                selectedDayAppointments.map((appointment) => (
                  <View key={appointment.id} style={styles.appointmentCard}>
                    <View style={styles.appointmentHeader}>
                      <View style={styles.timeContainer}>
                        <Ionicons name="time" size={16} color="#F59E0B" />
                        <Text style={styles.appointmentTime}>{appointment.appointment_time}</Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: appointment.status === 'completed' ? '#22C55E' : '#F59E0B' }
                      ]}>
                        <Text style={styles.statusText}>
                          {appointment.status === 'completed' ? 'Concluído' : 'Agendado'}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={styles.clientName}>{appointment.client_name}</Text>
                    <Text style={styles.clientContact}>{appointment.client_email}</Text>
                    <Text style={styles.clientContact}>{appointment.client_phone}</Text>
                    
                    {appointment.status !== 'completed' && (
                      <TouchableOpacity 
                        style={styles.completeButton}
                        onPress={() => {
                          markAppointmentComplete(appointment.id);
                          setShowDayModal(false);
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                        <Text style={styles.completeButtonText}>Marcar como Concluído</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Availability Modal */}
      <Modal
        visible={availabilityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAvailabilityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Disponibilizar Horários</Text>
              <TouchableOpacity onPress={() => setAvailabilityModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalDescription}>
                Selecione as datas que deseja disponibilizar horários (Segunda a Sexta, 8h às 19h):
              </Text>
              
              <Calendar
                onDayPress={(day) => {
                  Alert.alert(
                    'Disponibilizar Horários',
                    `Deseja disponibilizar horários para ${new Date(day.dateString).toLocaleDateString('pt-BR')}?\n\nHorários: 8h às 19h (exceto 12h-13h - almoço)`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Confirmar', onPress: () => setAvailability(day.dateString) }
                    ]
                  );
                }}
                theme={{
                  backgroundColor: 'transparent',
                  calendarBackground: 'rgba(255, 255, 255, 0.1)',
                  textSectionTitleColor: '#FFFFFF',
                  selectedDayBackgroundColor: '#F59E0B',
                  selectedDayTextColor: '#FFFFFF',
                  todayTextColor: '#F59E0B',
                  dayTextColor: '#FFFFFF',
                  textDisabledColor: 'rgba(255, 255, 255, 0.3)',
                  arrowColor: '#F59E0B',
                  monthTextColor: '#FFFFFF',
                  textDayFontWeight: '300',
                  textMonthFontWeight: 'bold',
                  textDayHeaderFontWeight: '500',
                  textDayFontSize: 14,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 12
                }}
                minDate={new Date().toISOString().split('T')[0]}
                maxDate={new Date(2028, 11, 31).toISOString().split('T')[0]}
              />
            </ScrollView>
          </View>
        </View>
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
  addButton: {
    backgroundColor: '#F59E0B',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statNumber: {
    color: '#F59E0B',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  calendarContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  calendar: {
    borderRadius: 12,
    padding: 10,
  },
  todaySection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  appointmentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentTime: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  clientName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clientContact: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 2,
  },
  appointmentNotes: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#0B0D17',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalScroll: {
    padding: 20,
  },
  modalDescription: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
});