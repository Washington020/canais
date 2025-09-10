import React, { useState, useEffect } from 'react';
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

interface TimeSlot {
  time: string;
  available: boolean;
  client?: string;
  type?: 'consultation' | 'followup';
}

interface DaySchedule {
  date: string;
  day: string;
  slots: TimeSlot[];
}

export default function NutritionistSchedule() {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      // Simular dados de agenda para demonstração
      const mockSchedule: DaySchedule[] = [
        {
          date: '2025-01-15',
          day: 'Segunda-feira',
          slots: [
            { time: '08:00', available: false, client: 'Isabella Costa VIP', type: 'consultation' },
            { time: '09:00', available: true },
            { time: '10:00', available: true },
            { time: '11:00', available: false, client: 'Ana Silva Premium', type: 'followup' },
            { time: '14:00', available: true },
            { time: '15:00', available: true },
            { time: '16:00', available: true },
            { time: '17:00', available: false, client: 'Carlos Santos VIP', type: 'consultation' },
          ]
        },
        {
          date: '2025-01-16',
          day: 'Terça-feira',
          slots: [
            { time: '08:00', available: true },
            { time: '09:00', available: true },
            { time: '10:00', available: false, client: 'Isabella Costa VIP', type: 'followup' },
            { time: '11:00', available: true },
            { time: '14:00', available: true },
            { time: '15:00', available: true },
            { time: '16:00', available: true },
            { time: '17:00', available: true },
          ]
        },
        {
          date: '2025-01-17',
          day: 'Quarta-feira',
          slots: [
            { time: '08:00', available: true },
            { time: '09:00', available: true },
            { time: '10:00', available: true },
            { time: '11:00', available: true },
            { time: '14:00', available: false, client: 'Maria Oliveira Premium', type: 'consultation' },
            { time: '15:00', available: true },
            { time: '16:00', available: true },
            { time: '17:00', available: true },
          ]
        },
      ];

      setSchedule(mockSchedule);
      setSelectedDay(mockSchedule[0].date);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSlotAvailability = (dayIndex: number, slotIndex: number) => {
    const newSchedule = [...schedule];
    const slot = newSchedule[dayIndex].slots[slotIndex];
    
    if (slot.client) {
      Alert.alert('Aviso', 'Este horário já está ocupado por um cliente');
      return;
    }

    slot.available = !slot.available;
    setSchedule(newSchedule);

    const status = slot.available ? 'disponível' : 'bloqueado';
    Alert.alert('Sucesso', `Horário ${slot.time} marcado como ${status}`);
  };

  const getSlotColor = (slot: TimeSlot) => {
    if (slot.client) return '#EF4444'; // Ocupado - vermelho
    if (slot.available) return '#22C55E'; // Disponível - verde  
    return '#64748B'; // Bloqueado - cinza
  };

  const getSlotText = (slot: TimeSlot) => {
    if (slot.client) return slot.client;
    return slot.available ? 'Disponível' : 'Bloqueado';
  };

  const getSlotIcon = (slot: TimeSlot) => {
    if (slot.client) {
      return slot.type === 'consultation' ? 'person-add' : 'refresh';
    }
    return slot.available ? 'checkmark-circle' : 'close-circle';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Minha Agenda</Text>
          <Text style={styles.headerSubtitle}>
            Horários fixos: Seg-Sex 8h-18h • Consultas de 1h
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="calendar" size={24} color="#22C55E" />
        </View>
      </View>

      {/* Days Navigation */}
      <ScrollView 
        horizontal 
        style={styles.daysNavigation}
        showsHorizontalScrollIndicator={false}
      >
        {schedule.map((day, index) => (
          <TouchableOpacity
            key={day.date}
            style={[
              styles.dayButton,
              selectedDay === day.date && styles.dayButtonActive
            ]}
            onPress={() => setSelectedDay(day.date)}
          >
            <Text style={[
              styles.dayButtonText,
              selectedDay === day.date && styles.dayButtonTextActive
            ]}>
              {day.day}
            </Text>
            <Text style={[
              styles.dayButtonDate,
              selectedDay === day.date && styles.dayButtonDateActive
            ]}>
              {new Date(day.date).getDate()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Schedule Grid */}
      <ScrollView style={styles.scheduleContainer} showsVerticalScrollIndicator={false}>
        {schedule
          .filter(day => day.date === selectedDay)
          .map((day, dayIndex) => (
            <View key={day.date} style={styles.daySchedule}>
              <Text style={styles.dayTitle}>{day.day} - {new Date(day.date).toLocaleDateString('pt-BR')}</Text>
              
              <View style={styles.slotsGrid}>
                {day.slots.map((slot, slotIndex) => (
                  <TouchableOpacity
                    key={slotIndex}
                    style={[
                      styles.timeSlot,
                      { backgroundColor: getSlotColor(slot) + '20', borderColor: getSlotColor(slot) }
                    ]}
                    onPress={() => toggleSlotAvailability(dayIndex, slotIndex)}
                    disabled={!!slot.client}
                  >
                    <View style={styles.slotHeader}>
                      <Text style={styles.slotTime}>{slot.time}</Text>
                      <Ionicons 
                        name={getSlotIcon(slot)} 
                        size={16} 
                        color={getSlotColor(slot)} 
                      />
                    </View>
                    
                    <Text style={[styles.slotText, { color: getSlotColor(slot) }]}>
                      {getSlotText(slot)}
                    </Text>
                    
                    {slot.client && (
                      <View style={styles.appointmentType}>
                        <Text style={styles.appointmentTypeText}>
                          {slot.type === 'consultation' ? '📋 Consulta' : '🔄 Retorno'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Summary */}
              <View style={styles.summary}>
                <View style={styles.summaryItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={styles.summaryText}>
                    {day.slots.filter(s => s.available && !s.client).length} Disponíveis
                  </Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <Ionicons name="person" size={16} color="#EF4444" />
                  <Text style={styles.summaryText}>
                    {day.slots.filter(s => s.client).length} Agendados
                  </Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <Ionicons name="close-circle" size={16} color="#64748B" />
                  <Text style={styles.summaryText}>
                    {day.slots.filter(s => !s.available && !s.client).length} Bloqueados
                  </Text>
                </View>
              </View>
            </View>
          ))}
      </ScrollView>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={20} color="#22C55E" />
        <Text style={styles.infoText}>
          💡 Toque nos horários para marcar como disponível/bloqueado. Clientes VIP/Premium podem agendar consultas através do app.
        </Text>
      </View>
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
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '600',
  },
  headerIcon: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  daysNavigation: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  dayButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  dayButtonActive: {
    backgroundColor: '#22C55E',
  },
  dayButtonText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayButtonTextActive: {
    color: '#FFFFFF',
  },
  dayButtonDate: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dayButtonDateActive: {
    color: '#FFFFFF',
  },
  scheduleContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  daySchedule: {
    marginBottom: 24,
  },
  dayTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeSlot: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    minHeight: 100,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotTime: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  slotText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  appointmentType: {
    marginTop: 8,
  },
  appointmentTypeText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  infoText: {
    color: '#E2E8F0',
    fontSize: 12,
    marginLeft: 12,
    flex: 1,
    lineHeight: 16,
  },
});