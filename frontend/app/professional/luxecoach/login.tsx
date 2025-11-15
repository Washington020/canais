import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

export default function LuxeCoachLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [professionalType, setProfessionalType] = useState<string>('');
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    console.log('🔐 Iniciando login LuxeCoach...');
    console.log('📧 Email:', email.toLowerCase().trim());
    console.log('🌐 API URL:', API_URL);
    
    try {
      const loginUrl = `${API_URL}/auth/login-professional`;
      console.log('🔗 URL completa:', loginUrl);
      
      const response = await axios.post(loginUrl, {
        email: email.toLowerCase().trim(),
        password: password,
      });

      console.log('✅ Resposta recebida:', JSON.stringify(response.data, null, 2));

      if (response.data.access_token) {
        const professionalType = response.data.professional?.professional_type || response.data.professional_type;
        console.log('👤 Tipo de profissional detectado:', professionalType);
        
        // Salvar token e informações do profissional
        await AsyncStorage.setItem('professionalToken', response.data.access_token);
        await AsyncStorage.setItem('professionalEmail', email.toLowerCase().trim());
        await AsyncStorage.setItem('professionalType', professionalType || 'nutritionist');
        
        if (response.data.professional) {
          await AsyncStorage.setItem('professionalInfo', JSON.stringify(response.data.professional));
          console.log('💾 Informações salvas no AsyncStorage');
        }
        
        // Mostrar sucesso e forçar navegação direta
        console.log('✅ Login bem-sucedido! Redirecionando...');
        
        // Desabilitar loading imediatamente
        setLoading(false);
        
        // Determinar caminho baseado no tipo
        const isPersonal = professionalType === 'personal' || professionalType === 'personal_trainer';
        const targetPath = isPersonal 
          ? '/professional/personal/(tabs)/' 
          : '/professional/nutritionist/(tabs)/';
        
        console.log(`🎯 Tipo: ${professionalType}, Caminho: ${targetPath}`);
        
        // Tentar múltiplas formas de navegação
        try {
          // Forma 1: href direto
          if (router.push) {
            console.log('Tentando router.push...');
            router.push(targetPath);
          }
        } catch (e1) {
          console.error('router.push falhou:', e1);
          try {
            // Forma 2: replace
            console.log('Tentando router.replace...');
            router.replace(targetPath);
          } catch (e2) {
            console.error('router.replace falhou:', e2);
            // Forma 3: Alert com botão manual
            Alert.alert(
              'Login Realizado!',
              `Você está logado como ${isPersonal ? 'Personal Trainer' : 'Nutricionista'}. Clique OK para continuar.`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    router.push(targetPath);
                  }
                }
              ]
            );
          }
        }
        
        return; // Sair da função para não executar setLoading(false) novamente
      } else {
        console.error('❌ Resposta não contém access_token');
        Alert.alert('Erro', 'Resposta do servidor inválida. Tente novamente.');
      }
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2));
      
      if (error.response) {
        console.error('❌ Status da resposta:', error.response.status);
        console.error('❌ Dados da resposta:', error.response.data);
        
        if (error.response.status === 401) {
          Alert.alert('Erro', 'Email ou senha incorretos');
        } else if (error.response.status === 404) {
          Alert.alert('Erro', 'Endpoint não encontrado. Verifique a configuração.');
        } else {
          Alert.alert('Erro', `Erro ${error.response.status}: ${error.response.data?.detail || 'Erro desconhecido'}`);
        }
      } else if (error.request) {
        console.error('❌ Nenhuma resposta do servidor');
        Alert.alert('Erro', 'Não foi possível conectar ao servidor. Verifique sua conexão.');
      } else {
        console.error('❌ Erro ao configurar requisição:', error.message);
        Alert.alert('Erro', `Erro: ${error.message}`);
      }
    } finally {
      setLoading(false);
      console.log('🔚 Finalizando processo de login');
    }
  };

  // Se login foi bem-sucedido, mostrar tela de sucesso com botões manuais
  if (loginSuccess) {
    const isPersonal = professionalType === 'personal' || professionalType === 'personal_trainer';
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          <Text style={styles.successTitle}>Login Realizado!</Text>
          <Text style={styles.successSubtitle}>
            {isPersonal ? '🏋️ Personal Trainer' : '🥗 Nutricionista'}
          </Text>
          <Text style={styles.successMessage}>
            Clique no botão abaixo para acessar sua área profissional
          </Text>
          
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => {
              const path = isPersonal 
                ? '/professional/personal/(tabs)/' 
                : '/professional/nutritionist/(tabs)/';
              router.push(path);
            }}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setLoginSuccess(false);
              setProfessionalType('');
            }}
          >
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="fitness" size={48} color="#F59E0B" />
            </View>
            <Text style={styles.title}>LuxeCoach</Text>
            <Text style={styles.subtitle}>Plataforma Profissional Unificada</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <Text style={styles.loginButtonText}>Entrando...</Text>
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Entrar</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#F59E0B" />
              <Text style={styles.infoText}>
                Acesse com suas credenciais de profissional. O sistema identificará automaticamente se você é Nutricionista ou Personal Trainer.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#94A3B8" />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D17',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  backButtonText: {
    color: '#94A3B8',
    fontSize: 16,
  },
});
