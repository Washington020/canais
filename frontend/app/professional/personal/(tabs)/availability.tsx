import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = '/api';

const DAYS = [
  { key: 'monday', label: 'Segunda-feira', icon: '📅' },
  { key: 'tuesday', label: 'Terça-feira', icon: '📅' },
  { key: 'wednesday', label: 'Quarta-feira', icon: '📅' },
  { key: 'thursday', label: 'Quinta-feira', icon: '📅' },
  { key: 'friday', label: 'Sexta-feira', icon: '📅' },
];

export default function AvailabilityScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
  });

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('professionalToken');
      
      if (!token) {
        console.log('⚠️ Token não encontrado ao carregar disponibilidade');
        return;
      }
      
      const response = await axios.get(`${API_URL}/professionals/my-availability`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.weekly_schedule) {
        setAvailability(response.data.weekly_schedule);
        console.log('✅ Disponibilidade carregada:', response.data.weekly_schedule);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar disponibilidade:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const saveAvailability = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('professionalToken');
      
      if (!token) {
        Alert.alert('Erro', 'Token não encontrado. Faça login novamente.');
        return;
      }
      
      await axios.post(
        `${API_URL}/professionals/set-weekly-availability`,
        { 
          weekly_schedule: availability,
          start_time: "09:00",
          end_time: "18:00",
          slot_duration: 15
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert(
        '✅ Sucesso!',
        'Sua disponibilidade foi atualizada! Os clientes já podem agendar consultas nos dias selecionados.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Erro ao salvar disponibilidade:', error);
      const errorMsg = error.response?.data?.detail || 'Não foi possível salvar sua disponibilidade. Tente novamente.';
      Alert.alert('❌ Erro', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const getTimeSlots = () => {
    const slots = [];
    const start = 9 * 60; // 9:00 em minutos
    const end = 18 * 60; // 18:00 em minutos
    const interval = 15; // 15 minutos

    for (let time = start; time < end; time += interval) {
      const hours = Math.floor(time / 60);
      const minutes = time % 60;
      slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    }

    return slots;
  };

  const activeDaysCount = Object.values(availability).filter(Boolean).length;
  const totalSlots = activeDaysCount * getTimeSlots().length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Carregando disponibilidade...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.header}
        >
          <Ionicons name="calendar" size={40} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Minha Disponibilidade</Text>
          <Text style={styles.headerSubtitle}>
            Configure os dias e horários que você está disponível
          </Text>
        </LinearGradient>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{activeDaysCount}</Text>
            <Text style={styles.summaryLabel}>Dias Ativos</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalSlots}</Text>
            <Text style={styles.summaryLabel}>Slots/Semana</Text>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#10B981" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Horário de Atendimento</Text>
            <Text style={styles.infoText}>
              • Segunda a Sexta-feira{'\n'}
              • Das 9h às 18h{'\n'}
              • Consultas de 15 minutos{'\n'}
              • {getTimeSlots().length} slots por dia
            </Text>
          </View>
        </View>

        {/* Days List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dias Disponíveis</Text>
          
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day.key}
              style={[
                styles.dayCard,
                availability[day.key] && styles.dayCardActive
              ]}
              onPress={() => toggleDay(day.key)}
              activeOpacity={0.7}
            >
              <View style={styles.dayInfo}>
                <Text style={styles.dayIcon}>{day.icon}</Text>
                <Text style={[
                  styles.dayLabel,
                  availability[day.key] && styles.dayLabelActive
                ]}>
                  {day.label}
                </Text>
              </View>
              
              <View style={styles.dayRight}>
                {availability[day.key] && (
                  <View style={styles.slotsBadge}>
                    <Text style={styles.slotsText}>
                      {getTimeSlots().length} slots
                    </Text>
                  </View>
                )}
                <Switch
                  value={availability[day.key]}
                  onValueChange={() => toggleDay(day.key)}
                  trackColor={{ false: '#374151', true: '#10B981' }}
                  thumbColor={availability[day.key] ? '#FFFFFF' : '#9CA3AF'}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sample Schedule */}
        {activeDaysCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exemplo de Horários</Text>
            <View style={styles.schedulePreview}>
              {getTimeSlots().slice(0, 8).map((time, index) => (
                <View key={index} style={styles.timeSlot}>
                  <Ionicons name="time" size={14} color="#10B981" />
                  <Text style={styles.timeSlotText}>{time}</Text>
                </View>
              ))}
              {getTimeSlots().length > 8 && (
                <View style={styles.timeSlot}>
                  <Text style={styles.timeSlotMore}>
                    +{getTimeSlots().length - 8} mais
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveAvailability}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Salvar Disponibilidade</Text>
            </>
          )}
        </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    textAlign: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: -20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  dayCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dayCardActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayIcon: {
    fontSize: 24,
  },
  dayLabel: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  dayLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dayRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slotsBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  slotsText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  schedulePreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  timeSlotText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  timeSlotMore: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    marginHorizontal: 20,
    marginTop: 32,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
