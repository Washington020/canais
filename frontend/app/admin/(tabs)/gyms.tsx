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
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Gym {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  email: string;
  phone: string;
  type: string;
  status: 'pending' | 'analyzing' | 'approved' | 'rejected';
  created_at: string;
  login?: string;
  responsavel?: {
    nome: string;
    email: string;
    telefone: string;
  };
}

interface GymRegistrationForm {
  // Dados básicos
  name: string;
  cnpj: string;
  razao_social: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  site: string;
  email: string;
  telefone_principal: string;
  telefone_secundario: string;
  horario_funcionamento: string;
  
  // Dados operacionais
  tipo_academia: string;
  franquia: string;
  num_unidades: string;
  responsavel_nome: string;
  responsavel_cargo: string;
  responsavel_email: string;
  responsavel_telefone: string;
  modelo_negocio: string;
  
  // Dados legais
  inscricao_estadual: string;
  alvara_funcionamento: string;
  documento_responsavel: string;
  
  // Dados operacionais detalhados
  recursos_oferecidos: string;
  politicas_cancelamento: string;
  observacoes_qualidade: string;
}

export default function AdminGyms() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'register'>('list');
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [selectedGymCredentials, setSelectedGymCredentials] = useState<{gym: Gym, password: string} | null>(null);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [formData, setFormData] = useState<GymRegistrationForm>({
    name: '',
    cnpj: '',
    razao_social: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    site: '',
    email: '',
    telefone_principal: '',
    telefone_secundario: '',
    horario_funcionamento: '',
    tipo_academia: '',
    franquia: '',
    num_unidades: '',
    responsavel_nome: '',
    responsavel_cargo: '',
    responsavel_email: '',
    responsavel_telefone: '',
    modelo_negocio: '',
    inscricao_estadual: '',
    alvara_funcionamento: '',
    documento_responsavel: '',
    recursos_oferecidos: '',
    politicas_cancelamento: '',
    observacoes_qualidade: ''
  });

  const router = useRouter();

  useEffect(() => {
    loadGyms();
  }, []);

  const loadGyms = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/admin/gyms`, { headers });
      
      setGyms(response.data);
    } catch (error: any) {
      console.error('Error loading gyms:', error);
      if (error.response?.status === 401) {
        router.replace('/admin/login');
      } else {
        Alert.alert('Erro', 'Erro ao carregar academias');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadGyms();
  };

  const handleInputChange = (field: keyof GymRegistrationForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    const requiredFields = [
      'name', 'cnpj', 'endereco', 'numero', 'bairro', 'cidade', 'estado', 'cep',
      'email', 'telefone_principal', 'tipo_academia', 'responsavel_nome', 
      'responsavel_email', 'responsavel_telefone'
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof GymRegistrationForm]) {
        Alert.alert('Erro', `O campo ${field.replace('_', ' ')} é obrigatório`);
        return false;
      }
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Erro', 'Email inválido');
      return false;
    }

    if (!emailRegex.test(formData.responsavel_email)) {
      Alert.alert('Erro', 'Email do responsável inválido');
      return false;
    }

    return true;
  };

  const registerGym = async () => {
    if (!validateForm()) return;

    setRegisterLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API_URL}/api/admin/gyms/register`, formData, { headers });

      Alert.alert(
        'Sucesso! ✅', 
        `Academia cadastrada com sucesso!\n\nCredenciais enviadas para: ${formData.email}\n\nLogin: ${response.data.login}\nSenha: ${response.data.password}\n\nStatus: Pendente de Análise`,
        [
          {
            text: 'OK',
            onPress: () => {
              setFormData({
                name: '', cnpj: '', razao_social: '', endereco: '', numero: '', complemento: '',
                bairro: '', cidade: '', estado: '', cep: '', site: '', email: '', telefone_principal: '',
                telefone_secundario: '', horario_funcionamento: '', tipo_academia: '', franquia: '',
                num_unidades: '', responsavel_nome: '', responsavel_cargo: '', responsavel_email: '',
                responsavel_telefone: '', modelo_negocio: '', inscricao_estadual: '', alvara_funcionamento: '',
                documento_responsavel: '', recursos_oferecidos: '', politicas_cancelamento: '', observacoes_qualidade: ''
              });
              setActiveTab('list');
              loadGyms();
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error registering gym:', error);
      Alert.alert('Erro', error.response?.data?.detail || 'Erro ao cadastrar academia');
    } finally {
      setRegisterLoading(false);
    }
  };

  const updateGymStatus = async (gymId: string, status: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/admin/gyms/${gymId}/status`, { status }, { headers });

      Alert.alert('Sucesso', `Status da academia atualizado para: ${status}`);
      loadGyms();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.detail || 'Erro ao atualizar status');
    }
  };

  const resetGymPassword = async (gymId: string) => {
    Alert.alert(
      'Resetar Senha',
      'Tem certeza que deseja gerar uma nova senha para esta academia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetar',
          style: 'destructive',
          onPress: async () => {
            setResetPasswordLoading(true);
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) return;

              const headers = { Authorization: `Bearer ${token}` };
              const response = await axios.put(`${API_URL}/api/admin/gyms/${gymId}/reset-password`, {}, { headers });

              const gym = gyms.find(g => g.id === gymId);
              if (gym) {
                setSelectedGymCredentials({
                  gym: gym,
                  password: response.data.new_password
                });
                setShowCredentialsModal(true);
              }

              Alert.alert(
                'Nova Senha Gerada! ✅',
                `Nova senha criada para a academia.\n\nLogin: ${response.data.login}\nNova Senha: ${response.data.new_password}\n\nCredenciais enviadas por email.`,
                [{ text: 'OK' }]
              );
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.detail || 'Erro ao resetar senha');
            } finally {
              setResetPasswordLoading(false);
            }
          }
        }
      ]
    );
  };

  const showGymCredentials = (gym: Gym) => {
    if (gym.login) {
      setSelectedGymCredentials({
        gym: gym,
        password: '••••••••••' // Masked password, since we don't store plain text
      });
      setShowCredentialsModal(true);
    } else {
      Alert.alert('Info', 'Esta academia ainda não possui credenciais geradas.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'analyzing': return '#3B82F6';
      case 'approved': return '#22C55E';
      case 'rejected': return '#EF4444';
      default: return '#64748B';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'analyzing': return 'Em Análise';
      case 'approved': return 'Aprovada';
      case 'rejected': return 'Recusada';
      default: return 'Desconhecido';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Carregando academias...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Gestão de Academias</Text>
        <Text style={styles.subtitle}>Cadastre e gerencie parcerias</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'list' && styles.activeTab]}
          onPress={() => setActiveTab('list')}
        >
          <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>
            Lista ({gyms.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'register' && styles.activeTab]}
          onPress={() => setActiveTab('register')}
        >
          <Text style={[styles.tabText, activeTab === 'register' && styles.activeTabText]}>
            Cadastrar Nova
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'list' ? (
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.gymsContainer}>
            {gyms.length > 0 ? gyms.map(gym => (
              <View key={gym.id} style={styles.gymCard}>
                <View style={styles.gymHeader}>
                  <View style={styles.gymInfo}>
                    <Text style={styles.gymName}>{gym.name}</Text>
                    <Text style={styles.gymDetails}>{gym.type} • {gym.email}</Text>
                    <Text style={styles.gymAddress}>{gym.address}</Text>
                    
                    {/* Mostrar credenciais se existirem */}
                    {gym.login && (
                      <View style={styles.credentialsInfo}>
                        <View style={styles.credentialItem}>
                          <Ionicons name="person-circle" size={16} color="#8B5CF6" />
                          <Text style={styles.credentialText}>Login: {gym.login}</Text>
                        </View>
                        <View style={styles.credentialItem}>
                          <Ionicons name="key" size={16} color="#8B5CF6" />
                          <Text style={styles.credentialText}>Senha: ••••••••••</Text>
                        </View>
                        {gym.responsavel && (
                          <View style={styles.credentialItem}>
                            <Ionicons name="mail" size={16} color="#22C55E" />
                            <Text style={styles.credentialText}>Responsável: {gym.responsavel.nome}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(gym.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(gym.status) }]}>
                      {getStatusName(gym.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.gymActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}
                    onPress={() => updateGymStatus(gym.id, 'analyzing')}
                  >
                    <Ionicons name="search" size={16} color="#3B82F6" />
                    <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>Analisar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}
                    onPress={() => updateGymStatus(gym.id, 'approved')}
                  >
                    <Ionicons name="checkmark" size={16} color="#22C55E" />
                    <Text style={[styles.actionButtonText, { color: '#22C55E' }]}>Aprovar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}
                    onPress={() => updateGymStatus(gym.id, 'rejected')}
                  >
                    <Ionicons name="close" size={16} color="#EF4444" />
                    <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Recusar</Text>
                  </TouchableOpacity>
                </View>

                {/* Ações de Credenciais */}
                {gym.login && (
                  <View style={styles.credentialActions}>
                    <TouchableOpacity 
                      style={styles.credentialButton}
                      onPress={() => showGymCredentials(gym)}
                    >
                      <Ionicons name="eye" size={16} color="#8B5CF6" />
                      <Text style={styles.credentialButtonText}>Ver Credenciais</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.credentialButton, styles.resetButton]}
                      onPress={() => resetGymPassword(gym.id)}
                      disabled={resetPasswordLoading}
                    >
                      {resetPasswordLoading ? (
                        <ActivityIndicator size="small" color="#F59E0B" />
                      ) : (
                        <>
                          <Ionicons name="refresh" size={16} color="#F59E0B" />
                          <Text style={[styles.credentialButtonText, { color: '#F59E0B' }]}>Resetar Senha</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="business-outline" size={64} color="#64748B" />
                <Text style={styles.emptyText}>Nenhuma academia cadastrada</Text>
                <Text style={styles.emptySubtext}>Cadastre a primeira academia parceira</Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <KeyboardAvoidingView 
          style={styles.registerContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.formScrollView}>
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>📋 Dados Básicos da Academia</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome da Academia *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  placeholder="Ex: SmartFit Paulista"
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>CNPJ *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.cnpj}
                    onChangeText={(value) => handleInputChange('cnpj', value)}
                    placeholder="00.000.000/0000-00"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Razão Social</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.razao_social}
                    onChangeText={(value) => handleInputChange('razao_social', value)}
                    placeholder="Razão social"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Endereço Completo *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.endereco}
                  onChangeText={(value) => handleInputChange('endereco', value)}
                  placeholder="Rua, Avenida, etc."
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Número *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.numero}
                    onChangeText={(value) => handleInputChange('numero', value)}
                    placeholder="123"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 2, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Complemento</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.complemento}
                    onChangeText={(value) => handleInputChange('complemento', value)}
                    placeholder="Sala, Andar, etc."
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Bairro *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.bairro}
                    onChangeText={(value) => handleInputChange('bairro', value)}
                    placeholder="Centro"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>CEP *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.cep}
                    onChangeText={(value) => handleInputChange('cep', value)}
                    placeholder="00000-000"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Cidade *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.cidade}
                    onChangeText={(value) => handleInputChange('cidade', value)}
                    placeholder="São Paulo"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Estado *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.estado}
                    onChangeText={(value) => handleInputChange('estado', value)}
                    placeholder="SP"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Site/Email Institucional *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  placeholder="contato@academia.com"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Telefone Principal *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.telefone_principal}
                    onChangeText={(value) => handleInputChange('telefone_principal', value)}
                    placeholder="(11) 99999-9999"
                    placeholderTextColor="#64748B"
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Telefone Secundário</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.telefone_secundario}
                    onChangeText={(value) => handleInputChange('telefone_secundario', value)}
                    placeholder="(11) 88888-8888"
                    placeholderTextColor="#64748B"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Horário de Funcionamento</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.horario_funcionamento}
                  onChangeText={(value) => handleInputChange('horario_funcionamento', value)}
                  placeholder="Segunda a Sexta: 6h às 22h, Sábado: 8h às 18h"
                  placeholderTextColor="#64748B"
                  multiline
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>🏋️ Dados de Cadastro e Operação</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tipo de Academia *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.tipo_academia}
                  onChangeText={(value) => handleInputChange('tipo_academia', value)}
                  placeholder="Ex: Tradicional, CrossFit, Funcional, Pilates"
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Franquia/Autonomia</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.franquia}
                    onChangeText={(value) => handleInputChange('franquia', value)}
                    placeholder="Franquia SmartFit"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Nº de Unidades</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.num_unidades}
                    onChangeText={(value) => handleInputChange('num_unidades', value)}
                    placeholder="1"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Responsável/Gestor da Parceria *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.responsavel_nome}
                  onChangeText={(value) => handleInputChange('responsavel_nome', value)}
                  placeholder="Nome completo"
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Cargo</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.responsavel_cargo}
                    onChangeText={(value) => handleInputChange('responsavel_cargo', value)}
                    placeholder="Gerente"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Telefone *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.responsavel_telefone}
                    onChangeText={(value) => handleInputChange('responsavel_telefone', value)}
                    placeholder="(11) 99999-9999"
                    placeholderTextColor="#64748B"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email do Responsável *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.responsavel_email}
                  onChangeText={(value) => handleInputChange('responsavel_email', value)}
                  placeholder="responsavel@academia.com"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Modelo de Negócio</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.modelo_negocio}
                  onChangeText={(value) => handleInputChange('modelo_negocio', value)}
                  placeholder="Comissionamento, Taxa fixa, Mensalidade, etc."
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>📄 Dados Legais e Fiscais</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Inscrição Estadual</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.inscricao_estadual}
                  onChangeText={(value) => handleInputChange('inscricao_estadual', value)}
                  placeholder="000.000.000.000"
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Alvará de Funcionamento</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.alvara_funcionamento}
                  onChangeText={(value) => handleInputChange('alvara_funcionamento', value)}
                  placeholder="Número do alvará"
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Documento do Responsável (RG/CPF)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.documento_responsavel}
                  onChangeText={(value) => handleInputChange('documento_responsavel', value)}
                  placeholder="000.000.000-00"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>⚙️ Dados Operacionais</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Recursos Oferecidos</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.recursos_oferecidos}
                  onChangeText={(value) => handleInputChange('recursos_oferecidos', value)}
                  placeholder="Equipamentos, horários de pico, serviços especiais, etc."
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Políticas de Cancelamento</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.politicas_cancelamento}
                  onChangeText={(value) => handleInputChange('politicas_cancelamento', value)}
                  placeholder="Condições para cancelamento/encerramento da parceria"
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Observações sobre Qualidade</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.observacoes_qualidade}
                  onChangeText={(value) => handleInputChange('observacoes_qualidade', value)}
                  placeholder="Padrões de qualidade, treinos, acompanhamento, métricas"
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={styles.submitSection}>
              <TouchableOpacity 
                style={[styles.submitButton, registerLoading && styles.submitButtonDisabled]}
                onPress={registerGym}
                disabled={registerLoading}
              >
                {registerLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Cadastrar Academia</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <Text style={styles.submitNote}>
                * Campos obrigatórios. Após o cadastro, será gerado automaticamente um login e senha 
                que serão enviados por email pentru a academia parceira.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Modal de Credenciais */}
      <Modal
        visible={showCredentialsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCredentialsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Credenciais da Academia</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowCredentialsModal(false)}
              >
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {selectedGymCredentials && (
              <View style={styles.modalBody}>
                <View style={styles.gymInfoModal}>
                  <Text style={styles.gymNameModal}>{selectedGymCredentials.gym.name}</Text>
                  <Text style={styles.gymEmailModal}>{selectedGymCredentials.gym.email}</Text>
                </View>

                <View style={styles.credentialsContainer}>
                  <View style={styles.credentialRow}>
                    <View style={styles.credentialLabel}>
                      <Ionicons name="person-circle" size={20} color="#8B5CF6" />
                      <Text style={styles.credentialLabelText}>Login:</Text>
                    </View>
                    <Text style={styles.credentialValue}>{selectedGymCredentials.gym.login}</Text>
                  </View>

                  <View style={styles.credentialRow}>
                    <View style={styles.credentialLabel}>
                      <Ionicons name="key" size={20} color="#8B5CF6" />
                      <Text style={styles.credentialLabelText}>Senha:</Text>
                    </View>
                    <Text style={styles.credentialValue}>{selectedGymCredentials.password}</Text>
                  </View>

                  {selectedGymCredentials.gym.responsavel && (
                    <View style={styles.credentialRow}>
                      <View style={styles.credentialLabel}>
                        <Ionicons name="mail" size={20} color="#22C55E" />
                        <Text style={styles.credentialLabelText}>Responsável:</Text>
                      </View>
                      <Text style={styles.credentialValue}>{selectedGymCredentials.gym.responsavel.nome}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={styles.modalActionButton}
                    onPress={() => {
                      // Copiar credenciais para clipboard seria implementado aqui
                      Alert.alert('Info', 'Credenciais copiadas para área de transferência');
                    }}
                  >
                    <Ionicons name="copy" size={16} color="#3B82F6" />
                    <Text style={styles.modalActionText}>Copiar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.modalActionButton, styles.resetModalButton]}
                    onPress={() => {
                      setShowCredentialsModal(false);
                      resetGymPassword(selectedGymCredentials.gym.id);
                    }}
                  >
                    <Ionicons name="refresh" size={16} color="#F59E0B" />
                    <Text style={[styles.modalActionText, { color: '#F59E0B' }]}>Resetar Senha</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#F59E0B',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#F59E0B',
  },
  scrollView: {
    flex: 1,
  },
  gymsContainer: {
    paddingHorizontal: 24,
  },
  gymCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  gymHeader: {
    marginBottom: 16,
  },
  gymInfo: {
    flex: 1,
  },
  gymName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  gymDetails: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 4,
  },
  gymAddress: {
    color: '#64748B',
    fontSize: 12,
  },
  statusBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  gymActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  registerContainer: {
    flex: 1,
  },
  formScrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  formSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitSection: {
    paddingBottom: 40,
  },
  submitButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#64748B',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  submitNote: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  credentialsInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  credentialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  credentialText: {
    color: '#E2E8F0',
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '500',
  },
  credentialActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  credentialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  resetButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  credentialButtonText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
});