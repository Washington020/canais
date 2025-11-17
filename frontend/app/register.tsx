import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

export default function RegisterScreen() {
  const router = useRouter();
  const { plan } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    cpf: '',
    birth_date: '',
    email: '',
    phone: '',
    address: '',
    plan_type: plan as string,
    payment_method: 'pix', // padrão PIX
  });

  const planNames = {
    basico: 'Plano Básico',
    intermediario: 'Plano Intermediário',
    vip: 'Plano VIP',
  };

  const validateForm = () => {
    if (!formData.full_name.trim()) {
      Alert.alert('Erro', 'Por favor, informe seu nome completo');
      return false;
    }

    if (!formData.cpf.trim() || formData.cpf.length < 11) {
      Alert.alert('Erro', 'Por favor, informe um CPF válido');
      return false;
    }

    if (!formData.birth_date.trim()) {
      Alert.alert('Erro', 'Por favor, informe sua data de nascimento');
      return false;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      Alert.alert('Erro', 'Por favor, informe um e-mail válido');
      return false;
    }

    if (!formData.phone.trim() || formData.phone.length < 10) {
      Alert.alert('Erro', 'Por favor, informe um telefone válido');
      return false;
    }

    if (!formData.address.trim()) {
      Alert.alert('Erro', 'Por favor, informe seu endereço completo');
      return false;
    }

    return true;
  };

  const formatCPF = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const limited = cleaned.substring(0, 11);
    
    if (limited.length <= 3) return limited;
    if (limited.length <= 6) return `${limited.slice(0, 3)}.${limited.slice(3)}`;
    if (limited.length <= 9) return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`;
  };

  const formatPhone = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const limited = cleaned.substring(0, 11);
    
    if (limited.length <= 2) return `(${limited}`;
    if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  };

  const formatDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const limited = cleaned.substring(0, 8);
    
    if (limited.length <= 2) return limited;
    if (limited.length <= 4) return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
  };

  const handleGenerateContract = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/contract/generate`, formData);

      if (response.data.success) {
        // Navegar para tela de contrato
        router.push({
          pathname: '/contract',
          params: {
            contractData: JSON.stringify(response.data),
            userData: JSON.stringify(formData),
          },
        });
      } else {
        Alert.alert('Erro', 'Erro ao gerar contrato. Tente novamente.');
      }
    } catch (error: any) {
      console.error('Erro ao gerar contrato:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.detail || 'Erro ao gerar contrato. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cadastro</Text>
        <Text style={styles.headerSubtitle}>
          {planNames[formData.plan_type as keyof typeof planNames]}
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Dados Pessoais</Text>

        <Text style={styles.label}>Nome Completo *</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite seu nome completo"
          value={formData.full_name}
          onChangeText={(text) => setFormData({ ...formData, full_name: text })}
        />

        <Text style={styles.label}>CPF *</Text>
        <TextInput
          style={styles.input}
          placeholder="000.000.000-00"
          value={formData.cpf}
          onChangeText={(text) => setFormData({ ...formData, cpf: formatCPF(text) })}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Data de Nascimento *</Text>
        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          value={formData.birth_date}
          onChangeText={(text) => setFormData({ ...formData, birth_date: formatDate(text) })}
          keyboardType="numeric"
        />

        <Text style={styles.label}>E-mail *</Text>
        <TextInput
          style={styles.input}
          placeholder="seu@email.com"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Telefone *</Text>
        <TextInput
          style={styles.input}
          placeholder="(11) 99999-9999"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: formatPhone(text) })}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Endereço Completo *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Rua, número, complemento, bairro, cidade, estado, CEP"
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
          multiline
          numberOfLines={3}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ Após preencher seus dados, você será direcionado para visualizar e aceitar o contrato de prestação de serviços.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGenerateContract}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Gerar Contrato Personalizado</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Voltar aos Planos</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 24,
    backgroundColor: '#2C3E50',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ECF0F1',
  },
  form: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495E',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BDC3C7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2C3E50',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  infoBox: {
    backgroundColor: '#E8F4F8',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3498DB',
  },
  infoText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#27AE60',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: '#95A5A6',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3498DB',
  },
});
