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
import AgoraVideoCall from '@/components/AgoraVideoCall';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

interface AvailableSlot {
  id: string;
  professional_id: string;
  professional_type: string;
  date: string;
  time: string;
  available: boolean;
}

interface MyAppointment {
  id: string;
  professional_type: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes?: string;
  can_cancel: boolean;
}

interface AppointmentLimits {
  plan_type: string;
  limits: { nutritionist: number; personal: number };
  usage: { nutritionist: number; personal: number };
  remaining: { nutritionist: number; personal: number };
}

interface UserProfile {
  plan_type: string;
  full_name: string;
  email: string;
}

export default function ClientSchedule() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [appointments, setAppointments] = useState<MyAppointment[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [appointmentLimits, setAppointmentLimits] = useState<AppointmentLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedProfessionalType, setSelectedProfessionalType] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [videoChannelName, setVideoChannelName] = useState('');
  const [currentAppointmentId, setCurrentAppointmentId] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadUserProfile();
    loadMyAppointments();
    loadAppointmentLimits();
  }, []);

  const loadUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/client/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/users/profile`, { headers });
      
      setUser(response.data);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      if (error.response?.status === 401) {
        router.replace('/client/login');
      }
    }
  };

  const loadMyAppointments = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('❌ Token não encontrado');
        return;
      }

      console.log('🔄 Buscando agendamentos...');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/appointments/my-appointments`, { headers });
      
      console.log('✅ Agendamentos recebidos:', response.data);
      console.log('📊 Total de agendamentos:', response.data.appointments?.length || 0);
      
      setAppointments(response.data.appointments || []);
    } catch (error: any) {
      console.error('❌ Error loading appointments:', error);
      console.error('❌ Error details:', error.response?.data);
      setAppointments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAppointmentLimits = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/appointments/monthly-limits`, { headers });
      
      setAppointmentLimits(response.data);
    } catch (error: any) {
      console.error('Error loading appointment limits:', error);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/appointments/${appointmentId}/cancel`, { headers });
      
      Alert.alert(
        'Agendamento Cancelado',
        'Seu agendamento foi cancelado com sucesso. O horário foi liberado para outros clientes.',
        [{ text: 'OK', onPress: () => {
          loadMyAppointments();
          loadAppointmentLimits();
        }}]
      );
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      Alert.alert('Erro', error.response?.data?.detail || 'Não foi possível cancelar o agendamento');
    }
  };

  const loadAvailableSlots = async (professionalType: string, date: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(
        `${API_URL}/appointments/available-slots?professional_type=${professionalType}&date=${date}`,
        { headers }
      );
      
      setAvailableSlots(response.data.available_slots || []);
    } catch (error: any) {
      console.error('Error loading available slots:', error);
      if (error.response?.status === 403) {
        Alert.alert(
          'Acesso Restrito',
          'Agendamentos disponíveis apenas para planos VIP e Intermediário. Faça upgrade para acessar esta funcionalidade.',
          [
            { text: 'OK' },
            { text: 'Fazer Upgrade', onPress: () => router.push('/client/plans') }
          ]
        );
      }
    }
  };

  const bookAppointment = async (slot: AvailableSlot, notes?: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const appointmentData = {
        professional_id: slot.professional_id,
        professional_type: slot.professional_type,
        appointment_date: slot.date,
        appointment_time: slot.time,
        notes: notes || ''
      };

      await axios.post(`${API_URL}/appointments/book`, appointmentData, { headers });
      
      Alert.alert(
        'Agendamento Confirmado!',
        `Sua ${slot.professional_type === 'nutritionist' ? 'consulta nutricional' : 'sessão de treino'} foi agendada para ${new Date(slot.date).toLocaleDateString('pt-BR')} às ${slot.time}h.`,
        [{ text: 'OK', onPress: () => {
          setShowBookingModal(false);
          loadMyAppointments();
          loadAppointmentLimits();
        }}]
      );
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      Alert.alert('Erro', error.response?.data?.detail || 'Não foi possível agendar a consulta');
    }
  };

  const openBookingModal = (professionalType: string) => {
    if (!user || (user.plan_type !== 'vip' && user.plan_type !== 'intermediario')) {
      Alert.alert(
        'Acesso Restrito',
        'Agendamentos disponíveis apenas para planos VIP e Intermediário. Faça upgrade para acessar esta funcionalidade.',
        [
          { text: 'OK' },
          { text: 'Fazer Upgrade', onPress: () => router.push('/client/plans') }
        ]
      );
      return;
    }

    // Check monthly limits
    if (appointmentLimits && appointmentLimits.remaining) {
      const remaining = appointmentLimits.remaining[professionalType as keyof typeof appointmentLimits.remaining];
      if (remaining !== undefined && remaining <= 0) {
        const serviceType = professionalType === 'nutritionist' ? 'consultas nutricionais' : 'sessões de personal training';
        const planName = user.plan_type === 'vip' ? 'VIP' : 'Intermediário';
        Alert.alert(
          'Limite Atingido',
          `Você atingiu o limite mensal de ${serviceType} para o plano ${planName}. Aguarde o próximo mês ou cancele um agendamento existente.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    setSelectedProfessionalType(professionalType);
    setShowBookingModal(true);
  };

  const generateCalendarDates = () => {
    const dates = [];
    const today = new Date();
    const currentMonth = new Date(selectedYear, selectedMonth, 1);
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      const dateString = date.toISOString().split('T')[0];
      
      dates.push({
        day,
        date: dateString,
        isPast: date < today,
        isToday: dateString === today.toISOString().split('T')[0],
        isWeekend: date.getDay() === 0 || date.getDay() === 6
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

  const onDateSelect = (dateString: string) => {
    setSelectedDate(dateString);
    setAvailableSlots([]); // Clear previous slots
    loadAvailableSlots(selectedProfessionalType, dateString);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserProfile();
    loadMyAppointments();
    loadAppointmentLimits();
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

  // Show upgrade banner for Basic users only
  if (!user || user.plan_type === 'basic' || user.plan_type === 'basico') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        
        <View style={styles.header}>
          <Text style={styles.title}>Agendamentos</Text>
        </View>

        <View style={styles.upgradeContainer}>
          <Ionicons name="calendar-outline" size={64} color="#64748B" />
          <Text style={styles.upgradeTitle}>Agendamentos Premium</Text>
          <Text style={styles.upgradeDescription}>
            Os agendamentos com profissionais estão disponíveis nos planos Intermediário, Premium e VIP.
            Faça upgrade agora e tenha acesso a consultas com nutricionistas e personal trainers.
          </Text>
          
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={() => router.push('/client/plans')}
          >
            <Ionicons name="arrow-up-circle" size={20} color="#FFFFFF" />
            <Text style={styles.upgradeButtonText}>Fazer Upgrade Agora</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Agendamentos</Text>
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>
            {user.plan_type === 'vip' ? 'VIP' : user.plan_type === 'premium' ? 'PREMIUM' : 'INTERMEDIÁRIO'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Service Cards */}
        <View style={styles.servicesContainer}>
          <TouchableOpacity 
            style={[styles.serviceCard, styles.nutritionCard]}
            onPress={() => openBookingModal('nutritionist')}
          >
            <Ionicons name="nutrition" size={32} color="#22C55E" />
            <Text style={styles.serviceTitle}>Consulta Nutricional</Text>
            <Text style={styles.serviceDescription}>
              Planos alimentares personalizados e orientação nutricional
            </Text>
            {appointmentLimits && appointmentLimits.remaining && appointmentLimits.limits && (
              <Text style={styles.limitsText}>
                {appointmentLimits.remaining.nutritionist || 0} de {appointmentLimits.limits.nutritionist || 0} consultas restantes este mês
              </Text>
            )}
            <View style={styles.bookButton}>
              <Ionicons name="calendar" size={16} color="#22C55E" />
              <Text style={styles.bookButtonText}>Agendar</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.serviceCard, styles.trainingCard]}
            onPress={() => openBookingModal('personal')}
          >
            <Ionicons name="fitness" size={32} color="#F59E0B" />
            <Text style={styles.serviceTitle}>Personal Training</Text>
            <Text style={styles.serviceDescription}>
              Treinos personalizados e acompanhamento profissional
            </Text>
            {appointmentLimits && appointmentLimits.remaining && appointmentLimits.limits && (
              <Text style={styles.limitsText}>
                {appointmentLimits.remaining.personal || 0} de {appointmentLimits.limits.personal || 0} sessões restantes este mês
              </Text>
            )}
            <View style={styles.bookButton}>
              <Ionicons name="calendar" size={16} color="#F59E0B" />
              <Text style={styles.bookButtonText}>Agendar</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* My Appointments */}
        <View style={styles.appointmentsSection}>
          <Text style={styles.sectionTitle}>Meus Agendamentos</Text>
          
          {appointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>Você ainda não tem agendamentos</Text>
              <Text style={styles.emptySubtext}>Escolha um serviço acima para agendar</Text>
            </View>
          ) : (
            appointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.serviceIcon}>
                    <Ionicons 
                      name={appointment.professional_type === 'nutritionist' ? 'nutrition' : 'fitness'} 
                      size={20} 
                      color={appointment.professional_type === 'nutritionist' ? '#22C55E' : '#F59E0B'} 
                    />
                  </View>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentService}>
                      {appointment.professional_type === 'nutritionist' ? 'Consulta Nutricional' : 'Personal Training'}
                    </Text>
                    <Text style={styles.appointmentDateTime}>
                      {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')} às {appointment.appointment_time}h
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: appointment.status === 'completed' ? '#22C55E' : '#3B82F6' }
                  ]}>
                    <Text style={styles.statusText}>
                      {appointment.status === 'completed' ? 'Concluído' : 'Agendado'}
                    </Text>
                  </View>
                </View>
                
                {appointment.notes && (
                  <Text style={styles.appointmentNotes}>{appointment.notes}</Text>
                )}
                
                {appointment.status === 'scheduled' && (
                  <View style={styles.appointmentActions}>
                    <TouchableOpacity 
                      style={styles.videoButton}
                      onPress={async () => {
                        try {
                          const token = await AsyncStorage.getItem('token');
                          const response = await axios.post(
                            `${API_URL}/video/create-agora-channel`,
                            { appointment_id: appointment.id },
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          setVideoChannelName(response.data.channel_name);
                          setCurrentAppointmentId(appointment.id);
                          setShowVideoCall(true);
                        } catch (error) {
                          console.error('Erro ao criar canal:', error);
                          Alert.alert('Erro', 'Não foi possível iniciar a videochamada.');
                        }
                      }}
                    >
                      <Ionicons name="videocam" size={16} color="#FFFFFF" />
                      <Text style={styles.videoButtonText}>Entrar em Consulta</Text>
                    </TouchableOpacity>
                    
                    {appointment.can_cancel && (
                      <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={() => {
                          Alert.alert(
                            'Cancelar Agendamento',
                            'Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.',
                            [
                              { text: 'Não', style: 'cancel' },
                              { text: 'Sim, Cancelar', style: 'destructive', onPress: () => cancelAppointment(appointment.id) }
                            ]
                          );
                        }}
                      >
                        <Ionicons name="close-circle" size={16} color="#EF4444" />
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Booking Modal */}
      <Modal
        visible={showBookingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Agendar {selectedProfessionalType === 'nutritionist' ? 'Consulta Nutricional' : 'Personal Training'}
              </Text>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.stepTitle}>1. Selecione a data:</Text>
              
              {/* Calendar Header */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={prevMonth} style={styles.monthButton}>
                  <Ionicons name="chevron-back" size={20} color={selectedProfessionalType === 'nutritionist' ? '#22C55E' : '#F59E0B'} />
                </TouchableOpacity>
                
                <Text style={styles.monthTitle}>
                  {monthNames[selectedMonth]} {selectedYear}
                </Text>
                
                <TouchableOpacity onPress={nextMonth} style={styles.monthButton}>
                  <Ionicons name="chevron-forward" size={20} color={selectedProfessionalType === 'nutritionist' ? '#22C55E' : '#F59E0B'} />
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
                        selectedDate === dateInfo.date && styles.selectedDateCell,
                        (dateInfo.isPast || dateInfo.isWeekend) && styles.disabledDateCell
                      ]}
                      onPress={() => {
                        if (!dateInfo.isPast && !dateInfo.isWeekend) {
                          onDateSelect(dateInfo.date);
                        }
                      }}
                      disabled={dateInfo.isPast || dateInfo.isWeekend}
                    >
                      <Text style={[
                        styles.dateText,
                        dateInfo.isToday && styles.todayText,
                        selectedDate === dateInfo.date && styles.selectedDateText,
                        (dateInfo.isPast || dateInfo.isWeekend) && styles.disabledDateText
                      ]}>
                        {dateInfo.day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {selectedDate && (
                <View style={styles.timeSlotsSection}>
                  <Text style={styles.stepTitle}>
                    2. Horários disponíveis para {new Date(selectedDate).toLocaleDateString('pt-BR')}:
                  </Text>
                  
                  {availableSlots.length === 0 ? (
                    <View style={styles.noSlotsContainer}>
                      <Ionicons name="time-outline" size={32} color="#64748B" />
                      <Text style={styles.noSlotsText}>
                        Nenhum horário disponível nesta data
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.slotsGrid}>
                      {availableSlots.map((slot) => (
                        <TouchableOpacity
                          key={slot.id}
                          style={[
                            styles.timeSlot,
                            selectedSlot?.id === slot.id && styles.selectedTimeSlot
                          ]}
                          onPress={() => setSelectedSlot(slot)}
                        >
                          <Text style={[
                            styles.timeSlotText,
                            selectedSlot?.id === slot.id && styles.selectedTimeSlotText
                          ]}>
                            {slot.time}h
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
              
              {selectedSlot && (
                <TouchableOpacity 
                  style={[
                    styles.confirmButton,
                    { backgroundColor: selectedProfessionalType === 'nutritionist' ? '#22C55E' : '#F59E0B' }
                  ]}
                  onPress={() => bookAppointment(selectedSlot)}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>Confirmar Agendamento</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Video Call Modal */}
      {showVideoCall && videoChannelName && (
        <AgoraVideoCall
          visible={showVideoCall}
          channelName={videoChannelName}
          userName={user?.full_name || 'Cliente'}
          onClose={() => {
            setShowVideoCall(false);
            setVideoChannelName('');
            setCurrentAppointmentId('');
          }}
          onCallEnded={() => {
            loadMyAppointments();
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
  planBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  upgradeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  upgradeTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  upgradeDescription: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 32,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  servicesContainer: {
    padding: 24,
    gap: 16,
  },
  serviceCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  nutritionCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  trainingCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  serviceTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
  },
  serviceDescription: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  appointmentsSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
  },
  appointmentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentService: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  appointmentDateTime: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 2,
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
  appointmentNotes: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 12,
  },
  limitsText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  appointmentActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  videoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#22C55E',
    borderRadius: 6,
  },
  videoButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
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
    maxHeight: '85%',
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
    flex: 1,
  },
  modalScroll: {
    padding: 20,
  },
  stepTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthButton: {
    padding: 8,
  },
  monthTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  calendar: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 12,
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
  },
  todayCell: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 6,
  },
  selectedDateCell: {
    backgroundColor: '#22C55E',
    borderRadius: 6,
  },
  disabledDateCell: {
    opacity: 0.3,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  todayText: {
    color: '#22C55E',
    fontWeight: 'bold',
  },
  selectedDateText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  disabledDateText: {
    color: '#64748B',
  },
  timeSlotsSection: {
    marginTop: 24,
  },
  noSlotsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noSlotsText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeSlot: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedTimeSlot: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  timeSlotText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedTimeSlotText: {
    color: '#FFFFFF',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});