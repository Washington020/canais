import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Platform,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://gymaccess-1.preview.emergentagent.com';

interface Gym {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    number: string;
    city: string;
    state: string;
    zip_code: string;
  };
  capacity: number;
  operating_hours: {
    [key: string]: string;
  };
  commission_rate: number;
  amenities: string[];
  description?: string;
  status: 'pending' | 'active' | 'inactive';
  created_at: string;
  login_credentials?: {
    username: string;
    password?: string;
  };
  stats?: {
    total_checkins: number;
    monthly_checkins: number;
    total_revenue: number;
    monthly_revenue: number;
  };
}

interface GymForm {
  // Informações básicas da academia
  name: string;
  cnpj: string;
  razao_social: string;
  
  // Informações do proprietário
  owner_name: string;
  owner_cpf: string;
  owner_email: string;
  owner_phone: string;
  
  // Endereço completo
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  
  // Contato da academia
  email: string;
  phone: string;
  
  // Informações financeiras
  pix_key: string;
  bank_account: {
    bank: string;
    agency: string;
    account: string;
    account_type: 'corrente' | 'poupanca';
  };
  
  // Tipo de academia e valores
  gym_type: 'simples' | 'intermediario' | 'vip';
  monthly_fee: string;
  check_in_value: string;
  
  // Operação
  capacity: string;
  operating_hours: {
    weekdays: string;
    saturday: string;
    sunday: string;
  };
  amenities: string[];
  description: string;
}

export default function GymsManagement() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{username: string, password: string} | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedGymForPassword, setSelectedGymForPassword] = useState<Gym | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [customLogin, setCustomLogin] = useState('');
  const router = useRouter();
  const loadingRef = useRef(false);

  const [form, setForm] = useState<GymForm>({
    // Informações básicas
    name: '',
    cnpj: '',
    razao_social: '',
    
    // Proprietário
    owner_name: '',
    owner_cpf: '',
    owner_email: '',
    owner_phone: '',
    
    // Endereço
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: 'SP',
    cep: '',
    
    // Contato
    email: '',
    phone: '',
    
    // Financeiro
    pix_key: '',
    bank_account: {
      bank: '',
      agency: '',
      account: '',
      account_type: 'corrente'
    },
    
    // Tipo e valores
    gym_type: 'simples',
    monthly_fee: '',
    check_in_value: '15.00',
    
    // Operação
    capacity: '',
    operating_hours: {
      weekdays: '06:00 - 22:00',
      saturday: '08:00 - 18:00',
      sunday: '08:00 - 16:00'
    },
    amenities: [],
    description: ''
  });

  const availableAmenities = [
    'Estacionamento', 'Vestiário', 'Chuveiro', 'Ar Condicionado',
    'WiFi', 'Música ambiente', 'Personal Trainer', 'Nutricionista',
    'Aulas em grupo', 'Piscina', 'Sauna', 'Massagem'
  ];

  const loadGyms = useCallback(async () => {
    // Previne múltiplas chamadas simultâneas
    if (loadingRef.current) {
      console.log('🔄 loadGyms já está em execução, ignorando...');
      return;
    }

    try {
      loadingRef.current = true;
      console.log('🚀 Iniciando carregamento de academias...');

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('❌ Token não encontrado, redirecionando para login');
        router.replace('/admin/login');
        return;
      }

      console.log('📡 Fazendo requisição para:', `${API_URL}/api/integration/admin/gyms`);
      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axios.get(`/api/admin/gyms`, { 
        headers,
        timeout: 10000 // 10 segundos de timeout
      });
      
      console.log('✅ Resposta recebida:', response.status, response.data);

      if (response.data && Array.isArray(response.data.gyms)) {
        setGyms(response.data.gyms);
        console.log(`📊 ${response.data.gyms.length} academias carregadas`);
      } else {
        console.log('⚠️ Formato de resposta inesperado:', response.data);
        setGyms([]);
      }

    } catch (error: any) {
      console.error('❌ Erro ao carregar academias:', error);
      
      if (error.code === 'ECONNABORTED') {
        Alert.alert('Timeout', 'A requisição demorou muito para responder. Tente novamente.');
      } else if (error.response?.status === 401) {
        console.log('🔒 Token inválido, redirecionando para login');
        Alert.alert('Sessão Expirada', 'Faça login novamente.');
        router.replace('/admin/login');
      } else if (error.response?.status >= 500) {
        Alert.alert('Erro do Servidor', 'Erro interno do servidor. Tente novamente mais tarde.');
      } else {
        Alert.alert('Erro', error.response?.data?.detail || 'Não foi possível carregar as academias.');
      }
      
      setGyms([]);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      console.log('🏁 Carregamento finalizado');
    }
  }, [router]);

  useEffect(() => {
    loadGyms();
  }, [loadGyms]);

  const validateForm = () => {
    // Validações básicas da academia
    if (!form.name.trim()) {
      Alert.alert('Erro', 'Nome da academia é obrigatório');
      return false;
    }
    if (!form.cnpj.trim()) {
      Alert.alert('Erro', 'CNPJ é obrigatório');
      return false;
    }
    if (!form.razao_social.trim()) {
      Alert.alert('Erro', 'Razão social é obrigatória');
      return false;
    }
    
    // Validações do proprietário
    if (!form.owner_name.trim()) {
      Alert.alert('Erro', 'Nome do proprietário é obrigatório');
      return false;
    }
    if (!form.owner_cpf.trim()) {
      Alert.alert('Erro', 'CPF do proprietário é obrigatório');
      return false;
    }
    if (!form.owner_email.trim() || !form.owner_email.includes('@')) {
      Alert.alert('Erro', 'Email válido do proprietário é obrigatório');
      return false;
    }
    if (!form.owner_phone.trim()) {
      Alert.alert('Erro', 'Telefone do proprietário é obrigatório');
      return false;
    }
    
    // Validações de endereço
    if (!form.endereco.trim() || !form.numero.trim()) {
      Alert.alert('Erro', 'Endereço completo é obrigatório');
      return false;
    }
    if (!form.bairro.trim()) {
      Alert.alert('Erro', 'Bairro é obrigatório');
      return false;
    }
    if (!form.cidade.trim()) {
      Alert.alert('Erro', 'Cidade é obrigatória');
      return false;
    }
    if (!form.estado.trim()) {
      Alert.alert('Erro', 'Estado é obrigatório');
      return false;
    }
    if (!form.cep.trim()) {
      Alert.alert('Erro', 'CEP é obrigatório');
      return false;
    }
    
    // Validações de contato
    if (!form.email.trim() || !form.email.includes('@')) {
      Alert.alert('Erro', 'Email válido da academia é obrigatório');
      return false;
    }
    if (!form.phone.trim()) {
      Alert.alert('Erro', 'Telefone da academia é obrigatório');
      return false;
    }
    
    return true;
  };

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    if (modalLoading) {
      console.log('🚫 Submit já em andamento, ignorando...');
      return;
    }

    setModalLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const gymData = {
        // Informações básicas da academia
        name: form.name,
        cnpj: form.cnpj,
        razao_social: form.razao_social,
        
        // Informações do proprietário
        responsavel_nome: form.owner_name,
        responsavel_cpf: form.owner_cpf,
        responsavel_email: form.owner_email,
        responsavel_telefone: form.owner_phone,
        
        // Endereço completo
        endereco: form.endereco,
        numero: form.numero,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.estado,
        cep: form.cep,
        
        // Contato da academia
        email: form.email,
        telefone_principal: form.phone,
        
        // Informações financeiras
        pix_key: form.pix_key,
        bank_account: form.bank_account,
        
        // Tipo de academia e valores
        gym_type: form.gym_type,
        monthly_fee: form.monthly_fee,
        check_in_value: form.check_in_value,
        
        // Operação
        capacity: form.capacity,
        operating_hours: form.operating_hours,
        amenities: form.amenities,
        description: form.description,
        
        // Credenciais personalizadas se fornecidas
        custom_login: customLogin.trim() || undefined,
        custom_password: customPassword.trim() || undefined
      };

      console.log('🚀 Cadastrando academia:', gymData);

      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axios.post(`/api/admin/gyms/register`, gymData, { 
        headers,
        timeout: 15000 // 15 segundos para cadastro
      });
      
      console.log('✅ Academia cadastrada:', response.data);

      // Mostrar mensagem de sucesso com parceiro cadastrado
      Alert.alert(
        '🎉 PARCEIRO CADASTRADO COM SUCESSO!',
        `✅ A academia "${form.name}" foi cadastrada e aprovada automaticamente!\n\n` +
        `🔑 Credenciais geradas:\n` +
        `• Login: ${response.data.login}\n` +
        `• Senha: ${response.data.password}\n\n` +
        `📧 Email de notificação enviado para: ${form.email}\n\n` +
        `🏢 Academia pronta para validar tokens!`,
        [
          {
            text: 'Ver Credenciais',
            onPress: () => {
              setGeneratedCredentials({
                username: response.data.login,
                password: response.data.password
              });
              setShowCredentials(true);
            }
          }
        ]
      );

      // Reset form
      setForm({
        // Informações básicas
        name: '',
        cnpj: '',
        razao_social: '',
        
        // Proprietário
        owner_name: '',
        owner_cpf: '',
        owner_email: '',
        owner_phone: '',
        
        // Endereço
        endereco: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: 'SP',
        cep: '',
        
        // Contato
        email: '',
        phone: '',
        
        // Financeiro
        pix_key: '',
        bank_account: {
          bank: '',
          agency: '',
          account: '',
          account_type: 'corrente'
        },
        
        // Tipo e valores
        gym_type: 'simples',
        monthly_fee: '',
        check_in_value: '15.00',
        
        // Operação
        capacity: '',
        operating_hours: {
          weekdays: '06:00 - 22:00',
          saturday: '08:00 - 18:00',
          sunday: '08:00 - 16:00'
        },
        amenities: [],
        description: ''
      });

      // Reset custom credentials fields
      setCustomLogin('');
      setCustomPassword('');

      // Reload gyms
      await loadGyms();

    } catch (error: any) {
      console.error('❌ Erro ao cadastrar academia:', error);
      
      let errorTitle = 'Erro no Cadastro';
      let errorMessage = 'Não foi possível cadastrar a academia.';
      
      if (error.response) {
        const status = error.response.status;
        const detail = error.response.data?.detail || '';
        
        switch (status) {
          case 400:
            errorTitle = 'Dados Inválidos ❌';
            errorMessage = `Verifique os dados informados:\n\n${detail}\n\nCampos obrigatórios:\n• Nome da academia\n• CNPJ\n• Email válido\n• Endereço completo`;
            break;
          case 401:
            errorTitle = 'Não Autorizado ❌';
            errorMessage = 'Sua sessão expirou. Faça login novamente no sistema de administração.';
            break;
          case 403:
            errorTitle = 'Sem Permissão ❌';
            errorMessage = 'Você não tem permissão para cadastrar academias. Verifique se você é um administrador.';
            break;
          case 409:
            errorTitle = 'Academia já Existe ❌';
            errorMessage = `Uma academia com este CNPJ ou email já está cadastrada:\n\n${detail}\n\nVerifique os dados e tente novamente.`;
            break;
          case 422:
            errorTitle = 'Dados Inválidos ❌';
            errorMessage = `Erro de validação nos dados fornecidos:\n\n${detail}\n\nVerifique:\n• CNPJ válido\n• Email com formato correto\n• CEP válido\n• Telefones válidos`;
            break;
          case 500:
            errorTitle = 'Erro do Servidor ❌';
            errorMessage = `Erro interno do servidor. Tente novamente em alguns minutos.\n\nSe o problema persistir, contate o suporte técnico.\n\nCódigo: ${status}`;
            break;
          default:
            errorTitle = 'Erro Desconhecido ❌';
            errorMessage = `Erro inesperado (${status}): ${detail || error.message}`;
        }
      } else if (error.code === 'ECONNABORTED') {
        errorTitle = 'Timeout ❌';
        errorMessage = 'A operação demorou muito para completar. Verifique sua conexão com a internet e tente novamente.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorTitle = 'Erro de Conexão ❌';
        errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
      } else {
        errorMessage = error.message || 'Erro desconhecido ao cadastrar academia.';
      }
      
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setModalLoading(false);
    }
  }, [form, modalLoading, router, loadGyms]);

  const handleAmenityToggle = (amenity: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const updateGymStatus = useCallback(async (gymId: string, status: 'active' | 'inactive' | 'approved') => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      console.log(`🔄 Atualizando status da academia ${gymId} para ${status}`);

      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Usar o endpoint correto com MongoDB ID e status no body
      const response = await axios.put(
        `/api/admin/gyms/${gymId}/status`, 
        { status: status === 'active' ? 'approved' : status }, // Mapear active -> approved
        { headers, timeout: 10000 }
      );
      
      console.log('✅ Status atualizado com sucesso:', response.data);
      Alert.alert('Sucesso', `Academia ${status === 'active' ? 'aprovada' : status === 'inactive' ? 'suspensa' : 'ativada'} com sucesso!`);
      
      // Aguardar um pouco antes de recarregar
      setTimeout(async () => {
        await loadGyms();
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ Erro ao atualizar status:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      Alert.alert('Erro', error.response?.data?.detail || 'Não foi possível atualizar o status');
    }
  }, [loadGyms, router]);

  const resetGymPassword = useCallback(async (gymId: string, gymName: string) => {
    try {
      Alert.alert(
        'Confirmar Ação',
        `Deseja realmente gerar uma nova senha para ${gymName}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Gerar Nova Senha',
            style: 'destructive',
            onPress: async () => {
              try {
                const token = await AsyncStorage.getItem('token');
                if (!token) {
                  router.replace('/admin/login');
                  return;
                }

                console.log(`🔑 Gerando nova senha para academia ${gymName}...`);

                const headers = { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                };
                
                const response = await axios.post(
                  `/api/admin/gyms/${gymId}/reset-password`, 
                  {}, 
                  { headers, timeout: 10000 }
                );
                
                console.log('✅ Nova senha gerada:', response.data);

                if (response.data.success && response.data.password) {
                  // Mostrar as credenciais no modal
                  setGeneratedCredentials({
                    username: response.data.login || `gym_${gymName.toLowerCase().replace(/\s+/g, '_')}`,
                    password: response.data.password
                  });
                  setShowCredentials(true);
                  
                  // Mostrar alert de sucesso
                  Alert.alert(
                    '🔄 Senha Resetada com Sucesso!',
                    `✅ Nova senha gerada para "${gymName}"!\n\n` +
                    `🔑 Novas credenciais:\n` +
                    `• Login: ${response.data.login}\n` +
                    `• Senha: ${response.data.password}\n\n` +
                    `📧 Informe as novas credenciais à academia.`,
                    [{ text: 'OK' }]
                  );
                  
                  // Recarregar a lista
                  setTimeout(async () => {
                    await loadGyms();
                  }, 1000);
                  
                } else {
                  Alert.alert('Erro', 'Não foi possível gerar nova senha');
                }
              } catch (error: any) {
                console.error('❌ Erro ao resetar senha:', error);
                if (error.response) {
                  console.error('Response data:', error.response.data);
                }
                Alert.alert('Erro', error.response?.data?.detail || 'Não foi possível gerar nova senha');
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('❌ Erro ao resetar senha:', error);
      Alert.alert('Erro', 'Não foi possível gerar nova senha');
    }
  }, [loadGyms, router]);

  const setCustomGymPassword = useCallback(async () => {
    if (!selectedGymForPassword || !customPassword.trim()) {
      Alert.alert('Erro', 'Por favor, defina uma senha para a academia');
      return;
    }

    if (customPassword.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      console.log(`🔑 Definindo senha customizada para academia ${selectedGymForPassword.name}...`);

      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axios.put(
        `${API_URL}/api/admin/gyms/${selectedGymForPassword._id}/set-password`, 
        { 
          password: customPassword,
          login: customLogin.trim() || undefined
        }, 
        { headers, timeout: 10000 }
      );
      
      console.log('✅ Senha customizada definida:', response.data);

      if (response.data.success) {
        // Show success with credentials
        setGeneratedCredentials({
          username: response.data.login || selectedGymForPassword.login_credentials?.username || 'gym_user',
          password: customPassword
        });
        setShowCredentials(true);
        setShowPasswordModal(false);
        
        // Clear form
        setCustomPassword('');
        setCustomLogin('');
        setSelectedGymForPassword(null);
        
        // Reload data
        setTimeout(async () => {
          await loadGyms();
        }, 1000);
        
      } else {
        Alert.alert('Erro', 'Não foi possível definir a senha');
      }
    } catch (error: any) {
      console.error('❌ Erro ao definir senha customizada:', error);
      Alert.alert('Erro', error.response?.data?.detail || 'Não foi possível definir a senha');
    }
  }, [selectedGymForPassword, customPassword, customLogin, loadGyms, router]);

  const openPasswordModal = useCallback((gym: Gym) => {
    setSelectedGymForPassword(gym);
    setCustomLogin(gym.login_credentials?.username || '');
    setCustomPassword('');
    setShowPasswordModal(true);
  }, []);

  const formatAddress = (address: any) => {
    if (typeof address === 'string') return address;
    return `${address.street}, ${address.number} - ${address.city}/${address.state}`;
  };

  const formatOperatingHours = (hours: any) => {
    if (typeof hours === 'string') return hours;
    if (!hours || typeof hours !== 'object') return 'Horários não informados';
    return `Seg-Sex: ${hours['seg-sex'] || hours.weekdays || 'N/I'}`;
  };

  const onRefresh = useCallback(() => {
    console.log('🔄 Iniciando refresh...');
    setRefreshing(true);
    loadGyms();
  }, [loadGyms]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image 
            source={{ uri: 'https://customer-assets.emergentagent.com/job_fitness-token-app/artifacts/8gnzidak_IMG_0187.png' }}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Gestão de Academias</Text>
        </View>
        <TouchableOpacity style={styles.testButton} onPress={async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            const response = await axios.post(`/api/admin/gyms/create-test`, {}, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.data.success) {
              Alert.alert(
                '🎉 Academia de Teste Criada!',
                `✅ Academia criada com sucesso!\n\n` +
                `🔑 Credenciais para login:\n` +
                `• Login: ${response.data.login}\n` +
                `• Senha: ${response.data.password}\n\n` +
                `🏢 Use essas credenciais no App Academia (/academia)`,
                [{ text: 'OK' }]
              );
              loadGyms();
            }
          } catch (error: any) {
            Alert.alert('Erro', error.response?.data?.detail || 'Erro ao criar academia de teste');
          }
        }}>
          <Ionicons name="flask" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{gyms.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{gyms.filter(g => g.status === 'active').length}</Text>
            <Text style={styles.statLabel}>Ativas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{gyms.filter(g => g.status === 'pending').length}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
        </View>

        {/* Gyms List */}
        <View style={styles.gymsContainer}>
          {gyms.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="fitness" size={64} color="#64748B" />
              <Text style={styles.emptyTitle}>Nenhuma academia cadastrada</Text>
              <Text style={styles.emptySubtitle}>
                Cadastre a primeira academia parceira para começar
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => setShowModal(true)}>
                <Text style={styles.emptyButtonText}>Cadastrar Academia</Text>
              </TouchableOpacity>
            </View>
          ) : (
            gyms.map((gym) => (
              <View key={gym._id} style={styles.gymCard}>
                <View style={styles.gymHeader}>
                  <View style={styles.gymMainInfo}>
                    <Text style={styles.gymName}>{gym.name}</Text>
                    <Text style={styles.gymEmail}>{gym.email}</Text>
                    <Text style={styles.gymAddress}>{formatAddress(gym.address)}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    {
                      backgroundColor: gym.status === 'active' ? '#22C55E' : 
                                     gym.status === 'pending' ? '#F59E0B' : '#EF4444'
                    }
                  ]}>
                    <Text style={styles.statusText}>
                      {gym.status === 'active' ? 'Ativa' : 
                       gym.status === 'pending' ? 'Pendente' : 'Inativa'}
                    </Text>
                  </View>
                </View>

                <View style={styles.gymDetails}>
                  <View style={styles.gymDetailItem}>
                    <Ionicons name="people" size={16} color="#8B5CF6" />
                    <Text style={styles.gymDetailText}>Capacidade: {gym.capacity}</Text>
                  </View>
                  <View style={styles.gymDetailItem}>
                    <Ionicons name="time" size={16} color="#8B5CF6" />
                    <Text style={styles.gymDetailText}>{formatOperatingHours(gym.operating_hours)}</Text>
                  </View>
                  <View style={styles.gymDetailItem}>
                    <Ionicons name="card" size={16} color="#8B5CF6" />
                    <Text style={styles.gymDetailText}>Comissão: {gym.commission_rate}%</Text>
                  </View>
                </View>

                {gym.stats && (
                  <View style={styles.gymStats}>
                    <View style={styles.statMini}>
                      <Text style={styles.statMiniNumber}>{gym.stats.monthly_checkins}</Text>
                      <Text style={styles.statMiniLabel}>Check-ins</Text>
                    </View>
                    <View style={styles.statMini}>
                      <Text style={styles.statMiniNumber}>
                        {gym.stats.monthly_revenue.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0
                        })}
                      </Text>
                      <Text style={styles.statMiniLabel}>Receita</Text>
                    </View>
                  </View>
                )}

                {gym.login_credentials && (
                  <View style={styles.credentialsContainer}>
                    <Text style={styles.credentialsTitle}>🔑 Credenciais de Acesso:</Text>
                    <Text style={styles.credentialsText}>Usuário: {gym.login_credentials.username}</Text>
                    <Text style={styles.credentialsNote}>
                      Senha foi enviada para o email da academia
                    </Text>
                  </View>
                )}

                <View style={styles.gymActions}>
                  {gym.status === 'pending' && (
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => updateGymStatus(gym._id, 'active')}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Aprovar</Text>
                    </TouchableOpacity>
                  )}
                  
                  {gym.status === 'active' && (
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.suspendButton]}
                      onPress={() => updateGymStatus(gym._id, 'inactive')}
                    >
                      <Ionicons name="pause" size={16} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Suspender</Text>
                    </TouchableOpacity>
                  )}

                  {gym.status === 'inactive' && (
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.reactivateButton]}
                      onPress={() => updateGymStatus(gym._id, 'active')}
                    >
                      <Ionicons name="play" size={16} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Reativar</Text>
                    </TouchableOpacity>
                  )}

                  {/* Nova Senha - Sempre Visível */}
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.resetButton]}
                    onPress={() => resetGymPassword(gym._id, gym.name)}
                  >
                    <Ionicons name="refresh" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Nova Senha</Text>
                  </TouchableOpacity>

                  {/* Definir Senha - Controle Manual */}
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.customPasswordButton]}
                    onPress={() => openPasswordModal(gym)}
                  >
                    <Ionicons name="key" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Definir Senha</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => {
                      setSelectedGym(gym);
                      setShowEditModal(true);
                    }}
                  >
                    <Ionicons name="create" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.detailsButton]}
                    onPress={() => {
                      setSelectedGym(gym);
                      setShowDetailsModal(true);
                    }}
                  >
                    <Ionicons name="eye" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Detalhes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
        {/* Edit Modal */}
        <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Editar Academia</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowEditModal(false)}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                {selectedGym && (
                  <>
                    <View style={styles.editField}>
                      <Text style={styles.editLabel}>Nome da Academia</Text>
                      <TextInput 
                        style={styles.editInput}
                        value={selectedGym.name}
                        onChangeText={(text) => setSelectedGym({...selectedGym, name: text})}
                        placeholder="Nome da academia"
                      />
                    </View>

                    <View style={styles.editField}>
                      <Text style={styles.editLabel}>Email</Text>
                      <TextInput 
                        style={styles.editInput}
                        value={selectedGym.email}
                        onChangeText={(text) => setSelectedGym({...selectedGym, email: text})}
                        placeholder="email@exemplo.com"
                        keyboardType="email-address"
                      />
                    </View>

                    <View style={styles.editField}>
                      <Text style={styles.editLabel}>Telefone</Text>
                      <TextInput 
                        style={styles.editInput}
                        value={selectedGym.phone}
                        onChangeText={(text) => setSelectedGym({...selectedGym, phone: text})}
                        placeholder="(11) 99999-9999"
                        keyboardType="phone-pad"
                      />
                    </View>

                    <TouchableOpacity 
                      style={styles.saveButtonContainer}
                      onPress={() => {
                        Alert.alert('Sucesso', 'Dados atualizados com sucesso!');
                        setShowEditModal(false);
                        loadGyms();
                      }}
                    >
                      <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Modal>

        {/* Details Modal */}
        <Modal visible={showDetailsModal} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes da Academia</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowDetailsModal(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {selectedGym && (
                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Nome:</Text>
                    <Text style={styles.detailValue}>{selectedGym.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email:</Text>
                    <Text style={styles.detailValue}>{selectedGym.email}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Telefone:</Text>
                    <Text style={styles.detailValue}>{selectedGym.phone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={[styles.detailValue, {color: selectedGym.status === 'active' ? '#22C55E' : '#F59E0B'}]}>
                      {selectedGym.status === 'active' ? 'Ativa' : selectedGym.status === 'pending' ? 'Pendente' : 'Inativa'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Capacidade:</Text>
                    <Text style={styles.detailValue}>{selectedGym.capacity} pessoas</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Comissão:</Text>
                    <Text style={styles.detailValue}>{selectedGym.commission_rate}%</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </ScrollView>

      {/* Registration Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            style={styles.modalKeyboard}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Nova Academia</Text>
              <TouchableOpacity 
                onPress={handleSubmit}
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <ActivityIndicator color="#8B5CF6" />
                ) : (
                  <Text style={styles.saveButton}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Botão para Dados de Exemplo */}
              <View style={styles.exampleDataSection}>
                <TouchableOpacity 
                  style={styles.exampleDataButton}
                  onPress={() => {
                    const exampleData: GymForm = {
                      // Informações básicas
                      name: 'Academia Exemplo Fitness',
                      cnpj: '12.345.678/0001-90',
                      razao_social: 'Academia Exemplo Fitness LTDA',
                      
                      // Proprietário
                      owner_name: 'João Silva Santos',
                      owner_cpf: '123.456.789-00',
                      owner_email: 'joao.silva@email.com',
                      owner_phone: '(11) 99999-8888',
                      
                      // Endereço
                      endereco: 'Rua das Flores',
                      numero: '123',
                      bairro: 'Centro',
                      cidade: 'São Paulo',
                      estado: 'SP',
                      cep: '01234-567',
                      
                      // Contato
                      email: 'contato@academiaexemplo.com',
                      phone: '(11) 3333-4444',
                      
                      // Financeiro
                      pix_key: 'academiaexemplo@pix.com.br',
                      bank_account: {
                        bank: '341 - Itaú',
                        agency: '1234',
                        account: '12345-6',
                        account_type: 'corrente'
                      },
                      
                      // Tipo e valores
                      gym_type: 'intermediario',
                      monthly_fee: '89.90',
                      check_in_value: '15.00',
                      
                      // Operação
                      capacity: '150',
                      operating_hours: {
                        weekdays: '06:00 - 22:00',
                        saturday: '08:00 - 18:00',
                        sunday: '08:00 - 16:00'
                      },
                      amenities: ['Estacionamento', 'Vestiário', 'Chuveiro', 'WiFi', 'Personal Trainer'],
                      description: 'Academia completa com equipamentos modernos, ambiente climatizado e profissionais qualificados. Oferecemos aulas de musculação, funcional e pilates.'
                    };
                    
                    setForm(exampleData);
                    setCustomLogin('academia_exemplo_teste');
                    setCustomPassword('123456');
                    
                    Alert.alert(
                      '📝 Dados de Exemplo Carregados!',
                      'Formulário preenchido com dados de exemplo.\n\n' +
                      '🔑 Credenciais definidas:\n' +
                      '• Login: academia_exemplo_teste\n' +
                      '• Senha: 123456\n\n' +
                      'Você pode editar qualquer campo antes de salvar.',
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Text style={styles.exampleDataButtonText}>
                    📝 Carregar Dados de Exemplo
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Informações Básicas da Academia */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>🏢 Dados da Academia</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nome da Academia *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.name}
                    onChangeText={(text) => setForm({...form, name: text, razao_social: text + ' LTDA'})}
                    placeholder="Ex: Academia Forte e Saúde"
                    placeholderTextColor="#64748B"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CNPJ *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.cnpj}
                    onChangeText={(text) => setForm({...form, cnpj: text})}
                    placeholder="12.345.678/0001-90"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Razão Social *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.razao_social}
                    onChangeText={(text) => setForm({...form, razao_social: text})}
                    placeholder="Academia Forte e Saúde LTDA"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>

              {/* Informações do Proprietário */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>👤 Dados do Proprietário</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nome do Proprietário *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.owner_name}
                    onChangeText={(text) => setForm({...form, owner_name: text})}
                    placeholder="João Silva"
                    placeholderTextColor="#64748B"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CPF do Proprietário *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.owner_cpf}
                    onChangeText={(text) => setForm({...form, owner_cpf: text})}
                    placeholder="123.456.789-00"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email do Proprietário *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.owner_email}
                    onChangeText={(text) => setForm({...form, owner_email: text})}
                    placeholder="joao@email.com"
                    placeholderTextColor="#64748B"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Telefone do Proprietário *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.owner_phone}
                    onChangeText={(text) => setForm({...form, owner_phone: text})}
                    placeholder="(11) 99999-9999"
                    placeholderTextColor="#64748B"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Endereço Completo */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>📍 Endereço da Academia</Text>
                
                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, {flex: 3}]}>
                    <Text style={styles.inputLabel}>Rua/Avenida *</Text>
                    <TextInput
                      style={styles.input}
                      value={form.endereco}
                      onChangeText={(text) => setForm({...form, endereco: text})}
                      placeholder="Rua das Flores"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <View style={[styles.inputGroup, {flex: 1, marginLeft: 12}]}>
                    <Text style={styles.inputLabel}>Número *</Text>
                    <TextInput
                      style={styles.input}
                      value={form.numero}
                      onChangeText={(text) => setForm({...form, numero: text})}
                      placeholder="123"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, {flex: 2}]}>
                    <Text style={styles.inputLabel}>Bairro *</Text>
                    <TextInput
                      style={styles.input}
                      value={form.bairro}
                      onChangeText={(text) => setForm({...form, bairro: text})}
                      placeholder="Centro"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <View style={[styles.inputGroup, {flex: 2, marginLeft: 12}]}>
                    <Text style={styles.inputLabel}>Cidade *</Text>
                    <TextInput
                      style={styles.input}
                      value={form.cidade}
                      onChangeText={(text) => setForm({...form, cidade: text})}
                      placeholder="São Paulo"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, {flex: 1}]}>
                    <Text style={styles.inputLabel}>Estado *</Text>
                    <TextInput
                      style={styles.input}
                      value={form.estado}
                      onChangeText={(text) => setForm({...form, estado: text.toUpperCase()})}
                      placeholder="SP"
                      placeholderTextColor="#64748B"
                      maxLength={2}
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={[styles.inputGroup, {flex: 2, marginLeft: 12}]}>
                    <Text style={styles.inputLabel}>CEP *</Text>
                    <TextInput
                      style={styles.input}
                      value={form.cep}
                      onChangeText={(text) => setForm({...form, cep: text})}
                      placeholder="01234-567"
                      placeholderTextColor="#64748B"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* Contato da Academia */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>📞 Contato da Academia</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>E-mail de Contato *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.email}
                    onChangeText={(text) => setForm({...form, email: text})}
                    placeholder="contato@academia.com"
                    placeholderTextColor="#64748B"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Telefone Principal *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.phone}
                    onChangeText={(text) => setForm({...form, phone: text})}
                    placeholder="(11) 3333-4444"
                    placeholderTextColor="#64748B"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Informações Financeiras */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>💰 Informações Financeiras</Text>
                <Text style={styles.sectionDescription}>
                  Configure os dados para pagamento da parceria
                </Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Chave PIX *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.pix_key}
                    onChangeText={(text) => setForm({...form, pix_key: text})}
                    placeholder="CPF, email, telefone ou chave aleatória"
                    placeholderTextColor="#64748B"
                  />
                  <Text style={styles.inputHint}>Para recebimento dos valores da parceria</Text>
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, {flex: 2}]}>
                    <Text style={styles.inputLabel}>Banco (Opcional)</Text>
                    <TextInput
                      style={styles.input}
                      value={form.bank_account.bank}
                      onChangeText={(text) => setForm({
                        ...form, 
                        bank_account: {...form.bank_account, bank: text}
                      })}
                      placeholder="341 - Itaú"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <View style={[styles.inputGroup, {flex: 1, marginLeft: 12}]}>
                    <Text style={styles.inputLabel}>Agência</Text>
                    <TextInput
                      style={styles.input}
                      value={form.bank_account.agency}
                      onChangeText={(text) => setForm({
                        ...form, 
                        bank_account: {...form.bank_account, agency: text}
                      })}
                      placeholder="1234"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, {flex: 2}]}>
                    <Text style={styles.inputLabel}>Conta</Text>
                    <TextInput
                      style={styles.input}
                      value={form.bank_account.account}
                      onChangeText={(text) => setForm({
                        ...form, 
                        bank_account: {...form.bank_account, account: text}
                      })}
                      placeholder="12345-6"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <View style={[styles.inputGroup, {flex: 1, marginLeft: 12}]}>
                    <Text style={styles.inputLabel}>Tipo</Text>
                    <TouchableOpacity
                      style={[styles.input, styles.pickerButton]}
                      onPress={() => {
                        Alert.alert(
                          'Tipo de Conta',
                          'Selecione o tipo de conta',
                          [
                            {text: 'Corrente', onPress: () => setForm({
                              ...form, 
                              bank_account: {...form.bank_account, account_type: 'corrente'}
                            })},
                            {text: 'Poupança', onPress: () => setForm({
                              ...form, 
                              bank_account: {...form.bank_account, account_type: 'poupanca'}
                            })},
                            {text: 'Cancelar', style: 'cancel'}
                          ]
                        );
                      }}
                    >
                      <Text style={[styles.pickerButtonText, {
                        color: form.bank_account.account_type ? '#FFFFFF' : '#64748B'
                      }]}>
                        {form.bank_account.account_type === 'corrente' ? 'Corrente' : 
                         form.bank_account.account_type === 'poupanca' ? 'Poupança' : 'Tipo'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Tipo de Academia e Valores */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>🏆 Tipo de Academia</Text>
                <Text style={styles.sectionDescription}>
                  Define que clientes podem acessar esta academia
                </Text>

                <View style={styles.gymTypeContainer}>
                  {(['simples', 'intermediario', 'vip'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.gymTypeCard,
                        form.gym_type === type && styles.gymTypeCardSelected
                      ]}
                      onPress={() => setForm({...form, gym_type: type})}
                    >
                      <View style={styles.gymTypeHeader}>
                        <Text style={[
                          styles.gymTypeTitle,
                          form.gym_type === type && styles.gymTypeTextSelected
                        ]}>
                          {type === 'simples' ? '🥉 Simples' : 
                           type === 'intermediario' ? '🥈 Intermediário' : '🥇 VIP'}
                        </Text>
                      </View>
                      <Text style={[
                        styles.gymTypeDescription,
                        form.gym_type === type && styles.gymTypeTextSelected
                      ]}>
                        {type === 'simples' ? 'Clientes Basic podem acessar' : 
                         type === 'intermediario' ? 'Clientes Basic + Intermediário' : 
                         'Todos os clientes podem acessar'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, {flex: 1}]}>
                    <Text style={styles.inputLabel}>Mensalidade (R$)</Text>
                    <TextInput
                      style={styles.input}
                      value={form.monthly_fee}
                      onChangeText={(text) => setForm({...form, monthly_fee: text})}
                      placeholder="89.90"
                      placeholderTextColor="#64748B"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.inputGroup, {flex: 1, marginLeft: 12}]}>
                    <Text style={styles.inputLabel}>Valor por Check-in (R$)</Text>
                    <TextInput
                      style={styles.input}
                      value={form.check_in_value}
                      onChangeText={(text) => setForm({...form, check_in_value: text})}
                      placeholder="15.00"
                      placeholderTextColor="#64748B"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* Operação da Academia */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>⚙️ Operação da Academia</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Capacidade Máxima</Text>
                  <TextInput
                    style={styles.input}
                    value={form.capacity}
                    onChangeText={(text) => setForm({...form, capacity: text})}
                    placeholder="200"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                  <Text style={styles.inputHint}>Número máximo de pessoas simultâneas</Text>
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, {flex: 1}]}>
                    <Text style={styles.inputLabel}>Seg-Sex</Text>
                    <TextInput
                      style={styles.input}
                      value={form.operating_hours.weekdays}
                      onChangeText={(text) => setForm({
                        ...form, 
                        operating_hours: {...form.operating_hours, weekdays: text}
                      })}
                      placeholder="06:00 - 22:00"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <View style={[styles.inputGroup, {flex: 1, marginLeft: 12}]}>
                    <Text style={styles.inputLabel}>Sábado</Text>
                    <TextInput
                      style={styles.input}
                      value={form.operating_hours.saturday}
                      onChangeText={(text) => setForm({
                        ...form, 
                        operating_hours: {...form.operating_hours, saturday: text}
                      })}
                      placeholder="08:00 - 18:00"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Domingo</Text>
                  <TextInput
                    style={styles.input}
                    value={form.operating_hours.sunday}
                    onChangeText={(text) => setForm({
                      ...form, 
                      operating_hours: {...form.operating_hours, sunday: text}
                    })}
                    placeholder="08:00 - 16:00"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>

              {/* Amenities */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>🎯 Comodidades</Text>
                <View style={styles.amenitiesContainer}>
                  {availableAmenities.map((amenity) => (
                    <TouchableOpacity
                      key={amenity}
                      style={[
                        styles.amenityChip,
                        form.amenities.includes(amenity) && styles.amenityChipSelected
                      ]}
                      onPress={() => handleAmenityToggle(amenity)}
                    >
                      <Text style={[
                        styles.amenityChipText,
                        form.amenities.includes(amenity) && styles.amenityChipTextSelected
                      ]}>
                        {amenity}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Access Credentials */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>🔑 Credenciais de Acesso</Text>
                <Text style={styles.sectionDescription}>
                  Defina login e senha personalizados ou deixe em branco para gerar automaticamente
                </Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Login da Academia</Text>
                  <TextInput
                    style={styles.input}
                    value={customLogin}
                    onChangeText={setCustomLogin}
                    placeholder="Ex: academia_centro (deixe vazio para gerar automaticamente)"
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Senha</Text>
                  <TextInput
                    style={styles.input}
                    value={customPassword}
                    onChangeText={setCustomPassword}
                    placeholder="Senha personalizada (deixe vazio para gerar automaticamente)"
                    placeholderTextColor="#64748B"
                    secureTextEntry={false}
                    autoCapitalize="none"
                  />
                  {customPassword.length > 0 && customPassword.length < 6 && (
                    <Text style={styles.errorText}>⚠️ Senha deve ter pelo menos 6 caracteres</Text>
                  )}
                </View>
              </View>

              {/* Description */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>📝 Descrição</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.description}
                  onChangeText={(text) => setForm(prev => ({...prev, description: text}))}
                  placeholder="Descreva a academia, diferenciais, equipamentos..."
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Credentials Modal */}
      <Modal
        visible={showCredentials}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCredentials(false)}
      >
        <View style={styles.credentialsModalOverlay}>
          <View style={styles.credentialsModal}>
            <Text style={styles.credentialsModalTitle}>🔑 Nova Senha Gerada!</Text>
            
            {generatedCredentials && (
              <View style={styles.credentialsDisplay}>
                <Text style={styles.credentialsLabel}>Credenciais da Academia:</Text>
                
                <View style={styles.credentialItem}>
                  <Text style={styles.credentialLabel}>Usuário:</Text>
                  <Text style={styles.credentialValue}>{generatedCredentials.username}</Text>
                </View>
                
                <View style={styles.credentialItem}>
                  <Text style={styles.credentialLabel}>Nova Senha:</Text>
                  <Text style={styles.credentialValue}>{generatedCredentials.password}</Text>
                </View>
                
                <View style={styles.instructionsContainer}>
                  <Text style={styles.instructionsTitle}>📋 Instruções:</Text>
                  <Text style={styles.instructionsText}>1. Copie essas credenciais</Text>
                  <Text style={styles.instructionsText}>2. Envie para o email da academia</Text>
                  <Text style={styles.instructionsText}>3. A academia usa no Sistema Academia</Text>
                  <Text style={styles.instructionsText}>4. URL: {API_URL}/academia</Text>
                </View>
                
                <Text style={styles.credentialsWarning}>
                  ⚠️ IMPORTANTE: Anote essas credenciais! A senha não será mostrada novamente.
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.credentialsCloseButton}
              onPress={() => {
                setShowCredentials(false);
                setShowModal(false);
                setCustomLogin('');
                setCustomPassword('');
                setGeneratedCredentials(null);
              }}
            >
              <Text style={styles.credentialsCloseText}>Credenciais Anotadas</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.credentialsModalOverlay}>
          <View style={styles.credentialsModal}>
            <Text style={styles.credentialsModalTitle}>🔑 Definir Senha Manual</Text>
            
            {selectedGymForPassword && (
              <>
                <Text style={styles.gymNameInModal}>{selectedGymForPassword.name}</Text>
                
                <View style={styles.passwordForm}>
                  <Text style={styles.formLabel}>Login da Academia:</Text>
                  <TextInput
                    style={styles.formInput}
                    value={customLogin}
                    onChangeText={setCustomLogin}
                    placeholder="Ex: gym_minha_academia"
                    placeholderTextColor="#64748B"
                  />
                  
                  <Text style={styles.formLabel}>Nova Senha:</Text>
                  <TextInput
                    style={styles.formInput}
                    value={customPassword}
                    onChangeText={setCustomPassword}
                    placeholder="Digite a senha (mín. 6 caracteres)"
                    placeholderTextColor="#64748B"
                    secureTextEntry={false}
                    autoCapitalize="none"
                  />
                  
                  <View style={styles.passwordTips}>
                    <Text style={styles.tipTitle}>💡 Dicas para senha segura:</Text>
                    <Text style={styles.tipText}>• Use pelo menos 8 caracteres</Text>
                    <Text style={styles.tipText}>• Combine letras, números e símbolos</Text>
                    <Text style={styles.tipText}>• Evite sequências simples (123, abc)</Text>
                  </View>
                </View>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.cancelModalButton}
                    onPress={() => {
                      setShowPasswordModal(false);
                      setCustomPassword('');
                      setCustomLogin('');
                      setSelectedGymForPassword(null);
                    }}
                  >
                    <Text style={styles.cancelModalButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.confirmModalButton, !customPassword.trim() && styles.confirmModalButtonDisabled]}
                    onPress={setCustomGymPassword}
                    disabled={!customPassword.trim()}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.confirmModalButtonText}>Definir Senha</Text>
                  </TouchableOpacity>
                </View>
              </>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginLeft: -40,
  },
  logoImage: {
    width: 32,
    height: 32,
    marginBottom: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
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
  statItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  gymsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  gymCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  gymHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  gymMainInfo: {
    flex: 1,
  },
  gymName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  gymEmail: {
    color: '#8B5CF6',
    fontSize: 14,
    marginBottom: 4,
  },
  gymAddress: {
    color: '#94A3B8',
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  gymDetails: {
    marginBottom: 16,
    gap: 8,
  },
  gymDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gymDetailText: {
    color: '#E2E8F0',
    fontSize: 14,
  },
  gymStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statMini: {
    alignItems: 'center',
  },
  statMiniNumber: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statMiniLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  credentialsContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  credentialsTitle: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  credentialsText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginBottom: 2,
  },
  credentialsNote: {
    color: '#94A3B8',
    fontSize: 11,
    fontStyle: 'italic',
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
    borderRadius: 8,
    gap: 4,
  },
  approveButton: {
    backgroundColor: '#22C55E',
  },
  suspendButton: {
    backgroundColor: '#EF4444',
  },
  reactivateButton: {
    backgroundColor: '#22C55E',
  },
  resetButton: {
    backgroundColor: '#F59E0B',
  },
  customPasswordButton: {
    backgroundColor: '#8B5CF6',
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  detailsButton: {
    backgroundColor: '#64748B',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0B0D17',
  },
  modalKeyboard: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionDescription: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  sectionDescription: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  pickerButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  gymTypeContainer: {
    gap: 12,
    marginBottom: 20,
  },
  gymTypeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  gymTypeCardSelected: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: '#22C55E',
  },
  gymTypeHeader: {
    marginBottom: 8,
  },
  gymTypeTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  gymTypeTextSelected: {
    color: '#22C55E',
  },
  gymTypeDescription: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputRow: {
    flexDirection: 'row',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  amenityChipSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  amenityChipText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  amenityChipTextSelected: {
    color: '#FFFFFF',
  },
  // Credentials Modal
  credentialsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  credentialsModal: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  credentialsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  credentialsDisplay: {
    marginBottom: 20,
  },
  credentialsLabel: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 12,
  },
  credentialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  credentialLabel: {
    color: '#E2E8F0',
    fontSize: 14,
  },
  credentialValue: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  credentialsWarning: {
    color: '#F59E0B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
  instructionsContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  instructionsTitle: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionsText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  credentialsCloseButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  credentialsCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Edit Modal Styles
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editField: {
    marginBottom: 16,
  },
  editLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButtonContainer: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Details Modal Styles
  detailsContainer: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  confirmModalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  gymNameInModal: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  passwordForm: {
    width: '100%',
    marginBottom: 20,
  },
  formLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  formInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  passwordTips: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  tipTitle: {
    color: '#8B5CF6',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipText: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 4,
  },
  confirmModalButtonDisabled: {
    opacity: 0.5,
  },
  // New styles for improved form sections
  sectionDescription: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  inputHint: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
  },
  gymTypeContainer: {
    marginBottom: 20,
  },
  gymTypeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  gymTypeCardSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8B5CF6',
  },
  gymTypeHeader: {
    marginBottom: 8,
  },
  gymTypeTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  gymTypeDescription: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  gymTypeTextSelected: {
    color: '#FFFFFF',
  },
  exampleDataSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  exampleDataButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  exampleDataButtonText: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
});