import React, { useState, useEffect } from 'react';
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

export default function NutritionistSchedule() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [availabilityModal, setAvailabilityModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const router = useRouter();

  useEffect(() => {
    loadAppointments();
    loadStats();
  }, []);

  const loadAppointments = async () => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) {
        router.replace('/professional/nutritionist/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/professionals/appointments`, { headers });
      
      setAppointments(response.data.appointments || []);
    } catch (error: any) {
      console.error('Error loading appointments:', error);
      if (error.response?.status === 401) {
        router.replace('/professional/nutritionist/login');
      }
      // Set empty array on error to prevent crashes
      setAppointments([]);
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
      // Set default stats on error
      setStats({
        total_appointments_month: 0,
        completed_appointments: 0,
        scheduled_appointments: 0,
        total_clients_served: 0,
        monthly_hours: 0
      });
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
      console.log('🔍 Iniciando disponibilização para data:', date);
      
      const token = await AsyncStorage.getItem('professionalToken');
      const headers = { Authorization: `Bearer ${token}` };
      
      console.log('🔑 Token profissional:', token ? 'Presente' : 'Ausente');
      
      const professionalData = await AsyncStorage.getItem('professional');
      const professional = JSON.parse(professionalData || '{}');
      
      console.log('👤 Dados profissional:', professional);
      
      const availabilityData = {
        professional_id: professional.id,
        professional_type: "nutritionist",
        date: date,
        start_time: "08:00",
        end_time: "19:00",
        break_times: ["12:00", "13:00"], // Lunch break
        slot_duration: 60
      };
      
      console.log('📋 Dados de disponibilidade:', availabilityData);
      console.log('🌐 URL da API:', `${API_URL}/professionals/availability`);
      
      const response = await axios.post(`${API_URL}/professionals/availability`, availabilityData, { headers });
      
      console.log('✅ Resposta da API:', response.data);
      
      Alert.alert(
        '✅ Horários Disponibilizados!',
        `${response.data.slots_created} horários foram disponibilizados para ${new Date(date).toLocaleDateString('pt-BR')}.\n\nOs clientes já podem ver esses horários no app!`,
        [{ text: 'OK' }]
      );
      setAvailabilityModal(false);
      
      // Recarregar os compromissos para mostrar os novos horários
      loadAppointments();
    } catch (error: any) {
      console.error('❌ Erro ao definir disponibilidade:', error);
      console.error('📋 Resposta do erro:', error.response?.data);
      console.error('🔢 Status do erro:', error.response?.status);
      
      let errorMessage = 'Não foi possível definir disponibilidade';
      
      if (error.response?.status === 401) {
        errorMessage = 'Sua sessão expirou. Faça login novamente.';
      } else if (error.response?.status === 422) {
        errorMessage = `Dados inválidos: ${error.response?.data?.detail || 'Verifique os dados enviados'}`;
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      Alert.alert('❌ Erro', errorMessage);
    }
  };

  const checkAvailableSlots = async (date: string) => {
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      if (!token) return 0;
      
      const response = await axios.get(`${API_URL}/professionals/availability/${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data.available_slots || 0;
    } catch (error) {
      return 0;
    }
  };

  const generateCalendarDates = () => {
    const dates = [];
    const today = new Date();
    const currentMonth = new Date(selectedYear, selectedMonth, 1);
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      const dateString = date.toISOString().split('T')[0];
      const appointmentsOnDate = (appointments || []).filter(apt => apt.appointment_date === dateString);
      
      dates.push({
        day,
        date: dateString,
        appointments: appointmentsOnDate,
        isPast: date < today,
        isToday: dateString === today.toISOString().split('T')[0]
      });
    }
    
    return dates;
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      const dateString = date.toISOString().split('T')[0];
      dates.push({
        date: dateString,
        label: date.toLocaleDateString('pt-BR')
      });
    }
    
    return dates;
  };

  const getTodaysAppointments = () => {
    const today = new Date().toISOString().split('T')[0];
    return (appointments || []).filter(apt => apt.appointment_date === today);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
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
        <Text style={styles.title}>Agenda Nutricionista</Text>
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
              <Text style={styles.statNumber}>{stats.total_appointments_month || 0}</Text>
              <Text style={styles.statLabel}>Consultas/Mês</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.total_clients_served || 0}</Text>
              <Text style={styles.statLabel}>Clientes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{(stats.monthly_hours || 0).toFixed(0)}h</Text>
              <Text style={styles.statLabel}>Horas/Mês</Text>
            </View>
          </View>
        )}

        {/* Calendar Header */}
        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={prevMonth} style={styles.monthButton}>
              <Ionicons name="chevron-back" size={24} color="#22C55E" />
            </TouchableOpacity>
            
            <Text style={styles.monthTitle}>
              {monthNames[selectedMonth]} {selectedYear}
            </Text>
            
            <TouchableOpacity onPress={nextMonth} style={styles.monthButton}>
              <Ionicons name="chevron-forward" size={24} color="#22C55E" />
            </TouchableOpacity>
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendar}>
            <View style={styles.weekHeader}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <Text key={day} style={styles.weekDay}>{day}</Text>
              ))}
            </View>
            
            <View style={styles.calendarGrid}>
              {generateCalendarDates().map((dateInfo, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateCell,
                    dateInfo.isToday && styles.todayCell,
                    dateInfo.appointments.length > 0 && styles.appointmentCell
                  ]}
                  onPress={() => {
                    if (dateInfo.appointments.length > 0) {
                      // Mostrar consultas agendadas
                      Alert.alert(
                        `📅 Consultas - ${new Date(dateInfo.date).toLocaleDateString('pt-BR')}`,
                        dateInfo.appointments.map(apt => 
                          `🕒 ${apt.appointment_time}h - ${apt.client_name}`
                        ).join('\n'),
                        [
                          { text: 'Fechar', style: 'cancel' },
                          {
                            text: '+ Disponibilizar Mais Horários',
                            onPress: () => {
                              Alert.alert(
                                '🗓️ Disponibilizar Horários',
                                `Deseja disponibilizar mais horários para ${new Date(dateInfo.date).toLocaleDateString('pt-BR')}?`,
                                [
                                  { text: 'Cancelar', style: 'cancel' },
                                  { text: 'Confirmar', onPress: () => setAvailability(dateInfo.date) }
                                ]
                              );
                            }
                          }
                        ]
                      );
                    } else if (!dateInfo.isPast) {
                      // Data vazia - disponibilizar horários
                      Alert.alert(
                        '🗓️ Disponibilizar Horários',
                        `Deseja disponibilizar horários para ${new Date(dateInfo.date).toLocaleDateString('pt-BR')}?\n\n⏰ Horários: 8h às 19h (pausa 12h-13h)\n⏱️ Duração: 60 minutos cada consulta`,
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Confirmar', onPress: () => setAvailability(dateInfo.date) }
                        ]
                      );
                    } else {
                      // Data passada
                      Alert.alert(
                        '⚠️ Data Passada',
                        'Não é possível disponibilizar horários para datas passadas.',
                        [{ text: 'OK' }]
                      );
                    }
                  }}
                >
                  <Text style={[
                    styles.dateText,
                    dateInfo.isToday && styles.todayText,
                    dateInfo.isPast && styles.pastText
                  ]}>
                    {dateInfo.day}
                  </Text>
                  {dateInfo.appointments.length > 0 && (
                    <View style={styles.appointmentDot} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Today's Appointments */}
        <View style={styles.todaySection}>
          <Text style={styles.sectionTitle}>Consultas de Hoje</Text>
          {getTodaysAppointments().length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>Nenhuma consulta agendada para hoje</Text>
            </View>
          ) : (
            getTodaysAppointments().map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.timeContainer}>
                    <Ionicons name="time" size={16} color="#22C55E" />
                    <Text style={styles.appointmentTime}>{appointment.appointment_time}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: appointment.status === 'completed' ? '#22C55E' : '#3B82F6' }
                  ]}>
                    <Text style={styles.statusText}>
                      {appointment.status === 'completed' ? 'Concluída' : 'Agendada'}
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
                    <Text style={styles.completeButtonText}>Marcar como Concluída</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

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
              
              {generateAvailableDates().map((dateInfo, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.dateOption}
                  onPress={() => {
                    Alert.alert(
                      'Disponibilizar Horários',
                      `Deseja disponibilizar horários para ${dateInfo.label}?\n\nHorários: 8h às 19h (exceto 12h-13h - almoço)`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Confirmar', onPress: () => setAvailability(dateInfo.date) }
                      ]
                    );
                  }}
                >
                  <Ionicons name="calendar" size={20} color="#22C55E" />
                  <Text style={styles.dateOptionText}>{dateInfo.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ))}
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
    backgroundColor: '#22C55E',
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
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statNumber: {
    color: '#22C55E',
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
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthButton: {
    padding: 8,
  },
  monthTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  calendar: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  todayCell: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 8,
  },
  appointmentCell: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 8,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  todayText: {
    color: '#22C55E',
    fontWeight: 'bold',
  },
  pastText: {
    color: '#64748B',
  },
  appointmentDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
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
    color: '#22C55E',
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
    backgroundColor: '#22C55E',
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
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  dateOptionText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
});