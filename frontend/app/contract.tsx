import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_BACKEND_URL || 'http://localhost:8001';

// Componente Checkbox customizado
const Checkbox = ({ value, onValueChange, color, style }: any) => {
  return (
    <TouchableOpacity
      style={[
        styles.checkbox,
        value && styles.checkboxChecked,
        value && color && { backgroundColor: color, borderColor: color },
        style,
      ]}
      onPress={() => onValueChange(!value)}
    >
      {value && <Text style={styles.checkmark}>✓</Text>}
    </TouchableOpacity>
  );
};

export default function ContractScreen() {
  const router = useRouter();
  const { contractData, userData } = useLocalSearchParams();

  const contract = JSON.parse(contractData as string);
  const user = JSON.parse(userData as string);

  const [isOver18, setIsOver18] = useState(false);
  const [hasRead, setHasRead] = useState(false);
  const [loading, setLoading] = useState(false);

  const canProceed = isOver18 && hasRead;

  const handleAcceptContract = async () => {
    if (!canProceed) {
      Alert.alert('Atenção', 'Você precisa aceitar todos os termos para continuar');
      return;
    }

    setLoading(true);

    try {
      const acceptData = {
        contract_id: contract.contract_id,
        user_email: user.email,
        user_cpf: user.cpf,
        plan_type: user.plan_type,
        contract_text: contract.contract_text,
        is_over_18: isOver18,
      };

      const response = await axios.post(`${API_URL}/api/contract/accept`, acceptData);

      if (response.data.success) {
        // Navegar para tela de pagamento
        router.push({
          pathname: '/payment',
          params: {
            userData: JSON.stringify(user),
            contractId: contract.contract_id,
            planInfo: JSON.stringify(contract.plan_info),
          },
        });
      } else {
        Alert.alert('Erro', 'Erro ao aceitar contrato. Tente novamente.');
      }
    } catch (error: any) {
      console.error('Erro ao aceitar contrato:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.detail || 'Erro ao processar aceite. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contrato de Prestação de Serviços</Text>
        <Text style={styles.headerSubtitle}>LUXEPASS/GUESBET</Text>
        <Text style={styles.cnpj}>CNPJ: 60.357.323/0001-69</Text>
      </View>

      <ScrollView style={styles.contractContainer}>
        <Text style={styles.contractText}>{contract.contract_text}</Text>
      </ScrollView>

      <View style={styles.checkboxContainer}>
        <View style={styles.checkboxRow}>
          <Checkbox
            value={isOver18}
            onValueChange={setIsOver18}
            color={isOver18 ? '#27AE60' : undefined}
            style={styles.checkbox}
          />
          <Text style={styles.checkboxLabel}>
            ✓ Declaro que sou <Text style={styles.bold}>{user.full_name}</Text>, CPF{' '}
            <Text style={styles.bold}>{user.cpf}</Text>, MAIOR DE 18 ANOS
          </Text>
        </View>

        <View style={styles.checkboxRow}>
          <Checkbox
            value={hasRead}
            onValueChange={setHasRead}
            color={hasRead ? '#27AE60' : undefined}
            style={styles.checkbox}
          />
          <Text style={styles.checkboxLabel}>
            ✓ Li e aceito todos os termos deste contrato, incluindo:
            {'\n'}• Fidelidade de {contract.plan_info.fidelity_months} meses
            {'\n'}• Multa por cancelamento antecipado
            {'\n'}• Possibilidade de negativação em caso de inadimplência
            {'\n'}• Cobrança automática mensal
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.acceptButton, !canProceed && styles.buttonDisabled]}
          onPress={handleAcceptContract}
          disabled={!canProceed || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.acceptButtonText}>
              ACEITAR E CONTINUAR PARA PAGAMENTO
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#2C3E50',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ECF0F1',
    marginTop: 4,
  },
  cnpj: {
    fontSize: 14,
    color: '#BDC3C7',
    marginTop: 4,
  },
  contractContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  contractText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#2C3E50',
    fontFamily: 'monospace',
  },
  checkboxContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#BDC3C7',
  },
  checkboxRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#BDC3C7',
  },
  acceptButton: {
    backgroundColor: '#27AE60',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#95A5A6',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3498DB',
  },
});
