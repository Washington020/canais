import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function GymLogin() {
  const [login, setLogin] = useState(''); // Campo vazio - credenciais do admin
  const [password, setPassword] = useState(''); // Campo vazio - credenciais do admin
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!login || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/gym/auth`, {
        login,
        password
      });

      const { access_token, gym_info } = response.data;
      
      // Store gym token and info
      await AsyncStorage.setItem('gymToken', access_token);
      await AsyncStorage.setItem('gymInfo', JSON.stringify(gym_info));
      
      Alert.alert(
        'Login Realizado! ✅',
        `Bem-vindo ao sistema ${gym_info.name}!\n\nVocê agora pode validar tokens de clientes.`,
        [
          {
            text: 'Continuar',
            onPress: () => {
              // Navigate to gym validation system
              router.replace('/gym/validation');
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert(
        'Erro de Login ❌', 
        error.response?.data?.detail || 'Credenciais inválidas. Verifique seu login e senha.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Recuperar Senha',
      'Entre em contato com o administrador do FitPass Brasil para redefinir sua senha.\n\nTelefone: (11) 99999-9999\nEmail: suporte@fitpass.com',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.replace('/')}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Logo and Title */}
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoEmoji}>🏋️</Text>
            </View>
            <Text style={styles.title}>Acesso Academia</Text>
            <Text style={styles.subtitle}>Sistema de Validação de Tokens</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Login da Academia</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="business" size={20} color="#8B5CF6" />
                <TextInput
                  style={styles.textInput}
                  value={login}
                  onChangeText={setLogin}
                  placeholder="Ex: gym_smartfit_paulista_1234"
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Senha</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="key" size={20} color="#8B5CF6" />
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Digite sua senha"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="log-in" size={20} color="#FFFFFF" />
                  <Text style={styles.loginButtonText}>Entrar no Sistema</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Demo Credentials */}
          <View style={styles.demoContainer}>
            <View style={styles.demoHeader}>
              <Ionicons name="information-circle" size={20} color="#22C55E" />
              <Text style={styles.demoTitle}>Credenciais de Demonstração</Text>
            </View>
            <View style={styles.demoCredentials}>
              <Text style={styles.demoText}>Login: gym_academia_teste_2039</Text>
              <Text style={styles.demoText}>Senha: sm7zK4QN</Text>
            </View>
          </View>

          {/* Help Section */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>Precisa de Ajuda?</Text>
            <View style={styles.helpOptions}>
              <TouchableOpacity style={styles.helpOption}>
                <Ionicons name="call" size={16} color="#8B5CF6" />
                <Text style={styles.helpText}>(11) 99999-9999</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.helpOption}>
                <Ionicons name="mail" size={16} color="#8B5CF6" />
                <Text style={styles.helpText}>suporte@fitpass.com</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <View style={styles.feature}>
              <Text style={styles.featureEmoji}>📱</Text>
              <Text style={styles.featureText}>Validação de Tokens</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureEmoji}>📊</Text>
              <Text style={styles.featureText}>Dashboard Completo</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureEmoji}>👥</Text>
              <Text style={styles.featureText}>Controle de Ocupação</Text>
            </View>
          </View>
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 32,
  },
  forgotPasswordText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#64748B',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  demoContainer: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    marginBottom: 24,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  demoTitle: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  demoCredentials: {
    gap: 4,
  },
  demoText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  helpContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  helpTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  helpOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  helpOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  helpText: {
    color: '#8B5CF6',
    fontSize: 14,
    marginLeft: 8,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
  },
  feature: {
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
});