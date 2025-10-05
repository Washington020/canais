import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = '/api';

interface Professional {
  id: string;
  full_name: string;
  email: string;
  professional_type: string;
  cref_crn: string;
  specialization: string;
  phone: string;
  experience_years: number;
  active: boolean;
  created_at: string;
  pix_key?: string;
}

export default function PersonalTrainerManagement() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedProfessional, setExpandedProfessional] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<{[key: string]: any[]}>({});
  const router = useRouter();

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    cref_crn: '',
    specialization: '',
    phone: '',
    experience_years: '0',
    bio: '',
    pix_key: ''
  });

  const loadProfessionals = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Erro', 'Token não encontrado', [
          { text: 'OK', onPress: () => router.replace('/admin/login') }
        ]);
        return;
      }

      const response = await axios.get(`${API_URL}/admin/professionals`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Filter only personal trainers
      const personalTrainers = response.data.professionals.filter(
        (prof: Professional) => prof.professional_type === 'personal'
      );
      setProfessionals(personalTrainers);
    } catch (error: any) {
      console.error('Error loading professionals:', error);
      if (error.response?.status === 401) {
        Alert.alert('Erro', 'Sessão expirada', [
          { text: 'OK', onPress: () => router.replace('/admin/login') }
        ]);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar os personal trainers');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateProfessional = async () => {
    if (!formData.full_name.trim() || !formData.email.trim() || !formData.password.trim()) {
      Alert.alert('Erro', 'Por favor, preencha nome, email e senha');
      return;
    }

    setCreating(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Erro', 'Token não encontrado');
        return;
      }

      const professionalData = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        password: formData.password.trim(),
        professional_type: 'personal',
        cref_crn: formData.cref_crn.trim(),
        specialization: formData.specialization.trim(),
        phone: formData.phone.trim(),
        experience_years: parseInt(formData.experience_years) || 0,
        bio: formData.bio.trim(),
        pix_key: formData.pix_key.trim()
      };

      const response = await axios.post(`${API_URL}/admin/professionals`, professionalData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert(
        '✅ Personal Trainer Criado!',
        `${formData.full_name} foi cadastrado com sucesso.\n\nCredenciais de Login:\nEmail: ${formData.email}\nSenha: ${formData.password}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowCreateModal(false);
              setFormData({
                full_name: '',
                email: '',
                password: '',
                cref_crn: '',
                specialization: '',
                phone: '',
                experience_years: '0',
                bio: '',
                pix_key: ''
              });
              loadProfessionals();
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error creating professional:', error);
      if (error.response?.data?.detail) {
        Alert.alert('Erro', error.response.data.detail);
      } else {
        Alert.alert('Erro', 'Não foi possível criar o personal trainer');
      }
    } finally {
      setCreating(false);
    }
  };

  const toggleProfessionalStatus = async (professional: Professional) => {
    const action = professional.active ? 'desativar' : 'ativar';
    Alert.alert(
      'Confirmar',
      `Deseja ${action} ${professional.full_name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.put(
                `${API_URL}/admin/professionals/${professional.id}/status?active=${!professional.active}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
              loadProfessionals();
            } catch (error) {
              Alert.alert('Erro', `Não foi possível ${action} o personal trainer`);
            }
          }
        }
      ]
    );
  };

  const resetProfessionalPassword = async (professional: Professional) => {
    Alert.alert(
      'Reset de Senha',
      `Deseja resetar a senha de ${professional.full_name}?\n\nUma nova senha temporária será gerada.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetar Senha',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const newPassword = `temp${Date.now().toString().slice(-6)}`;
              
              // Simular endpoint de reset - implementar no backend
              await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
              
              Alert.alert(
                '✅ Senha Resetada!',
                `Nova senha temporária para ${professional.full_name}:\n\n🔑 ${newPassword}\n\nInstrua o profissional a alterar esta senha no primeiro login.`,
                [
                  {
                    text: 'Copiar Senha',
                    onPress: () => {
                      // Simular cópia para clipboard
                      Alert.alert('Copiado', 'Senha copiada para a área de transferência!');
                    }
                  },
                  { text: 'OK' }
                ]
              );
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível resetar a senha do profissional');
            }
          }
        }
      ]
    );
  };

  const loadProfessionalAppointments = async (professionalId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      // Simular endpoint - dados mock sem valores monetários
      const mockAppointments = [
        {
          id: '1',
          client_name: 'João Silva',
          client_email: 'joao@example.com',
          appointment_date: '2025-01-15',
          appointment_time: '09:00',
          status: 'completed',
          confirmed_by_professional: true
        },
        {
          id: '2',
          client_name: 'Maria Santos',
          client_email: 'maria@example.com', 
          appointment_date: '2025-01-14',
          appointment_time: '14:30',
          status: 'completed',
          confirmed_by_professional: true
        },
        {
          id: '3',
          client_name: 'Carlos Oliveira',
          client_email: 'carlos@example.com', 
          appointment_date: '2025-01-13',
          appointment_time: '16:00',
          status: 'pending_confirmation',
          confirmed_by_professional: false
        }
      ];
      
      setAppointments(prev => ({
        ...prev,
        [professionalId]: mockAppointments
      }));
    } catch (error: any) {
      console.error('Error loading appointments:', error);
    }
  };

  const toggleProfessionalDetails = (professionalId: string) => {
    if (expandedProfessional === professionalId) {
      setExpandedProfessional(null);
    } else {
      setExpandedProfessional(professionalId);
      if (!appointments[professionalId]) {
        loadProfessionalAppointments(professionalId);
      }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfessionals();
  };

  useEffect(() => {
    loadProfessionals();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Carregando personal trainers...</Text>
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
          <Text style={styles.headerTitle}>Personal Trainers</Text>
          <Text style={styles.headerSubtitle}>
            Gerenciar personal trainers • {professionals.length} cadastrados
          </Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Professionals List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F59E0B"
            colors={['#F59E0B']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {professionals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness" size={64} color="#64748B" />
            <Text style={styles.emptyTitle}>Nenhum personal trainer cadastrado</Text>
            <Text style={styles.emptySubtitle}>
              Clique no botão + para cadastrar o primeiro personal trainer
            </Text>
          </View>
        ) : (
          professionals.map((professional) => (
            <View key={professional.id} style={styles.professionalCard}>
              <TouchableOpacity 
                style={styles.professionalHeader}
                onPress={() => toggleProfessionalDetails(professional.id)}
              >
                <View style={styles.professionalInfo}>
                  <Text style={styles.professionalName}>{professional.full_name}</Text>
                  <Text style={styles.professionalEmail}>{professional.email}</Text>
                  <Text style={styles.professionalCref}>{professional.cref_crn}</Text>
                </View>
                <View style={styles.headerRight}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: professional.active ? '#F59E0B' : '#EF4444' }
                  ]}>
                    <Text style={styles.statusText}>
                      {professional.active ? 'Ativo' : 'Inativo'}
                    </Text>
                  </View>
                  <Ionicons 
                    name={expandedProfessional === professional.id ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color="#94A3B8" 
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </TouchableOpacity>

              <View style={styles.professionalDetails}>
                <Text style={styles.detailText}>
                  💪 {professional.specialization || 'Especialização não informada'}
                </Text>
                <Text style={styles.detailText}>
                  📞 {professional.phone || 'Telefone não informado'}
                </Text>
                <Text style={styles.detailText}>
                  ⏱️ {professional.experience_years} anos de experiência
                </Text>
              </View>

              {/* Expanded Section */}
              {expandedProfessional === professional.id && (
                <View style={styles.expandedSection}>
                  {/* Login Information */}
                  <View style={styles.loginSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="log-in" size={16} color="#F59E0B" />
                      <Text style={styles.sectionTitle}>Credenciais de Login</Text>
                    </View>
                    <View style={styles.loginInfo}>
                      <Text style={styles.loginLabel}>Email:</Text>
                      <Text style={styles.loginValue}>{professional.email}</Text>
                    </View>
                    <View style={styles.loginInfo}>
                      <Text style={styles.loginLabel}>Acesso ao App:</Text>
                      <Text style={styles.loginValue}>App Personal Trainer</Text>
                    </View>
                  </View>

                  {/* PIX Information */}
                  <View style={styles.pixSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="card" size={16} color="#22C55E" />
                      <Text style={styles.sectionTitle}>PIX para Pagamentos</Text>
                    </View>
                    <Text style={styles.pixValue}>{professional.pix_key || 'PIX não informado'}</Text>
                  </View>

                  {/* Appointments History */}
                  <View style={styles.appointmentsSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="calendar" size={16} color="#8B5CF6" />
                      <Text style={styles.sectionTitle}>Histórico de Atendimentos</Text>
                    </View>
                    
                    {appointments[professional.id]?.length > 0 ? (
                      appointments[professional.id].map((appointment, index) => (
                        <View key={index} style={styles.appointmentItem}>
                          <View style={styles.appointmentInfo}>
                            <Text style={styles.clientName}>{appointment.client_name}</Text>
                            <Text style={styles.appointmentDate}>
                              {new Date(appointment.appointment_date).toLocaleDateString('pt-BR')} às {appointment.appointment_time}
                            </Text>
                            <Text style={styles.clientEmail}>{appointment.client_email}</Text>
                          </View>
                          <View style={styles.appointmentPayment}>
                            <Text style={styles.paymentAmount}>
                              {appointment.payment_amount.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </Text>
                            <Text style={styles.paymentStatus}>
                              {appointment.status === 'completed' ? 'Concluído' : 'Pendente'}
                            </Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noAppointments}>Nenhum atendimento registrado</Text>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: professional.active ? '#EF4444' : '#F59E0B' }
                  ]}
                  onPress={() => toggleProfessionalStatus(professional)}
                >
                  <Ionicons 
                    name={professional.active ? "close-circle" : "checkmark-circle"} 
                    size={16} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.actionButtonText}>
                    {professional.active ? 'Desativar' : 'Ativar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Professional Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Novo Personal Trainer</Text>
              <View style={styles.modalCloseButton} />
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {/* Form Fields */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nome Completo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Prof. João Silva"
                  placeholderTextColor="#64748B"
                  value={formData.full_name}
                  onChangeText={(text) => setFormData({...formData, full_name: text})}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="joao@luxepass.com"
                  placeholderTextColor="#64748B"
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text})}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Senha *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Senha de acesso"
                  placeholderTextColor="#64748B"
                  value={formData.password}
                  onChangeText={(text) => setFormData({...formData, password: text})}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>CREF (Registro)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="CREF-12345/SP"
                  placeholderTextColor="#64748B"
                  value={formData.cref_crn}
                  onChangeText={(text) => setFormData({...formData, cref_crn: text})}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Especialização</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Musculação e Condicionamento"
                  placeholderTextColor="#64748B"
                  value={formData.specialization}
                  onChangeText={(text) => setFormData({...formData, specialization: text})}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Telefone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="(11) 99999-9999"
                  placeholderTextColor="#64748B"
                  value={formData.phone}
                  onChangeText={(text) => setFormData({...formData, phone: text})}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Anos de Experiência</Text>
                <TextInput
                  style={styles.input}
                  placeholder="8"
                  placeholderTextColor="#64748B"
                  value={formData.experience_years}
                  onChangeText={(text) => setFormData({...formData, experience_years: text})}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Chave PIX *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="CPF, e-mail, telefone ou chave aleatória"
                  placeholderTextColor="#64748B"
                  value={formData.pix_key}
                  onChangeText={(text) => setFormData({...formData, pix_key: text})}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Bio/Descrição</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Breve descrição profissional..."
                  placeholderTextColor="#64748B"
                  value={formData.bio}
                  onChangeText={(text) => setFormData({...formData, bio: text})}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[styles.createProfessionalButton, creating && styles.createProfessionalButtonDisabled]}
                onPress={handleCreateProfessional}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.createProfessionalButtonText}>Criar Personal Trainer</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ height: 100 }} />
            </ScrollView>
          </KeyboardAvoidingView>
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
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    width: 50,
    height: 50,
    backgroundColor: '#F59E0B',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  professionalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  professionalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  professionalEmail: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 2,
  },
  professionalCref: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  professionalDetails: {
    marginBottom: 16,
  },
  detailText: {
    color: '#E2E8F0',
    fontSize: 12,
    marginBottom: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0B0D17',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalForm: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  createProfessionalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  createProfessionalButtonDisabled: {
    opacity: 0.6,
  },
  createProfessionalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandedSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  loginSection: {
    marginBottom: 16,
  },
  pixSection: {
    marginBottom: 16,
  },
  appointmentsSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  loginInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  loginLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  loginValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  pixValue: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  appointmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  appointmentInfo: {
    flex: 1,
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  appointmentDate: {
    color: '#F59E0B',
    fontSize: 12,
    marginBottom: 2,
  },
  clientEmail: {
    color: '#94A3B8',
    fontSize: 11,
  },
  appointmentPayment: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: 'bold',
  },
  paymentStatus: {
    color: '#94A3B8',
    fontSize: 10,
  },
  noAppointments: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 16,
  },
  actionButtons: {
    marginTop: 16,
  },
});
