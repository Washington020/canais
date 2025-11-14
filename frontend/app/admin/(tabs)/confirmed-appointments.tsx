import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

const API_URL = '/api';

interface ConfirmedAppointment {
  id: string;
  client_name: string;
  client_email: string;
  professional_name: string;
  professional_type: string;
  appointment_date: string;
  completed_at: string;
  notes: string;
}

export default function ConfirmedAppointmentsScreen() {
  const [appointments, setAppointments] = useState<ConfirmedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const router = useRouter();

  useEffect(() => {
    loadConfirmedAppointments();
  }, [selectedMonth, selectedYear]);

  const loadConfirmedAppointments = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(
        `${API_URL}/admin/confirmed-appointments?month=${selectedMonth}&year=${selectedYear}`,
        { headers }
      );

      setAppointments(response.data.appointments || []);
    } catch (error: any) {
      console.error('Erro ao carregar atendimentos:', error);
      if (error.response?.status === 401) {
        router.replace('/admin/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const changeMonth = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    } else {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    }
  };

  // Group appointments by professional
  const groupedAppointments = appointments.reduce((acc, apt) => {
    const key = apt.professional_name;
    if (!acc[key]) {
      acc[key] = {
        professional: apt.professional_name,
        type: apt.professional_type,
        appointments: []
      };
    }
    acc[key].appointments.push(apt);
    return acc;
  }, {} as Record<string, any>);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando atendimentos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadConfirmedAppointments} tintColor="#8B5CF6" />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={['#8B5CF6', '#6D28D9']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Atendimentos Confirmados</Text>
          <Text style={styles.headerSubtitle}>Relatório Mensal de Pagamentos</Text>
        </LinearGradient>

        {/* Month Selector */}
        <View style={styles.monthSelector}>
          <TouchableOpacity 
            style={styles.monthButton}
            onPress={() => changeMonth('prev')}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.monthText}>
            {monthNames[selectedMonth - 1]} {selectedYear}
          </Text>
          
          <TouchableOpacity 
            style={styles.monthButton}
            onPress={() => changeMonth('next')}
          >
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{appointments.length}</Text>
            <Text style={styles.summaryLabel}>Total de Atendimentos</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{Object.keys(groupedAppointments).length}</Text>
            <Text style={styles.summaryLabel}>Profissionais</Text>
          </View>
        </View>

        {/* Grouped Appointments by Professional */}
        {Object.keys(groupedAppointments).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#64748B" />
            <Text style={styles.emptyText}>
              Nenhum atendimento confirmado em {monthNames[selectedMonth - 1]}
            </Text>
          </View>
        ) : (
          Object.values(groupedAppointments).map((group: any, index: number) => (
            <View key={index} style={styles.professionalSection}>
              <View style={styles.professionalHeader}>
                <View style={styles.professionalInfo}>
                  <Ionicons 
                    name={getProfessionalIcon(group.type)} 
                    size={24} 
                    color={getProfessionalColor(group.type)} 
                  />
                  <View style={styles.professionalText}>
                    <Text style={styles.professionalName}>{group.professional}</Text>
                    <Text style={styles.professionalType}>
                      {getProfessionalLabel(group.type)}
                    </Text>
                  </View>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{group.appointments.length}</Text>
                </View>
              </View>

              {group.appointments.map((apt: ConfirmedAppointment) => (
                <View key={apt.id} style={styles.appointmentCard}>
                  <View style={styles.appointmentHeader}>
                    <Ionicons name="person" size={16} color="#8B5CF6" />
                    <Text style={styles.clientName}>{apt.client_name}</Text>
                  </View>
                  
                  <View style={styles.appointmentDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="mail" size={14} color="#94A3B8" />
                      <Text style={styles.detailText}>{apt.client_email}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={14} color="#94A3B8" />
                      <Text style={styles.detailText}>
                        {new Date(apt.appointment_date).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                      <Text style={styles.detailText}>
                        Confirmado em: {new Date(apt.completed_at).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  </View>

                  {apt.notes && (
                    <Text style={styles.notes}>Obs: {apt.notes}</Text>
                  )}
                </View>
              ))}
            </View>
          ))
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
  },
  monthButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  professionalSection: {
    marginTop: 24,
    marginHorizontal: 20,
  },
  professionalHeader: {
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
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  professionalType: {
    fontSize: 13,
    color: '#94A3B8',
  },
  countBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  appointmentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  appointmentDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  notes: {
    fontSize: 13,
    color: '#E2E8F0',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
