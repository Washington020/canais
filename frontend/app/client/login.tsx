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
  Alert,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://premium-fitness-4.preview.emergentagent.com';

export default function ClientLogin() {
  const [email, setEmail] = useState('cliente@luxepass.com');
  const [password, setPassword] = useState('cliente123');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    try {
      console.log('🔄 LOGIN INICIADO!');
      
      // Check if we have the required data
      if (!email || !password) {
        console.error('❌ Credenciais faltando');
        Alert.alert('Erro', 'Por favor, preencha todos os campos');
        return;
      }

      console.log('📧 Email:', email);
      console.log('🌐 API_URL:', API_URL);
      
      setLoading(true);
      
      // Make the API call with explicit configuration
      console.log('📡 Fazendo requisição...');
      
      const loginData = {
        email: email.trim(),
        password: password
      };
      
      console.log('📊 Login data:', loginData);
      
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)
      });

      console.log('📈 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Response not ok:', errorData);
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }
      
      const data = await response.json();
      console.log('✅ Response data:', data);
      
      const { access_token } = data;
      
      if (!access_token) {
        throw new Error('No access token received');
      }
      
      // Store token and user type
      console.log('💾 Salvando token...');
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('userType', 'client');
      console.log('✅ Token salvo com sucesso');
      
      console.log('🎯 Iniciando navegação...');
      
      // Navigate to client dashboard
      router.replace('/client/(tabs)');
      console.log('🚀 Navegação chamada');
      
    } catch (error) {
      console.error('❌ Login error completo:', error);
      Alert.alert(
        'Erro no Login', 
        error.message || 'Erro ao fazer login. Tente novamente.'
      );
    } finally {
      setLoading(false);
      console.log('🏁 Login process finalizado');
    }
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
            <View style={styles.logo}>
              <Image 
                source={{ uri: 'https://customer-assets.emergentagent.com/job_fitness-token-app/artifacts/8gnzidak_IMG_0187.png' }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Entrar no LuxePass</Text>
            <Text style={styles.subtitle}>Acesse sua conta de cliente</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Sua senha"
                placeholderTextColor="#64748B"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Entrar</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity 
              style={styles.registerButton}
              onPress={() => router.push('/client/register')}
            >
              <Text style={styles.registerButtonText}>Criar Nova Conta</Text>
            </TouchableOpacity>
          </View>

          {/* Demo Credentials */}
          <View style={styles.demoCredentials}>
            <Text style={styles.demoTitle}>🎯 Credenciais de Demonstração</Text>
            <View style={styles.demoItem}>
              <Text style={styles.demoLabel}>Email:</Text>
              <Text style={styles.demoValue}>cliente@luxepass.com</Text>
            </View>
            <View style={styles.demoItem}>
              <Text style={styles.demoLabel}>Senha:</Text>
              <Text style={styles.demoValue}>cliente123</Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.features}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🏋️</Text>
              <Text style={styles.featureText}>Acesso a +500 academias</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🎯</Text>
              <Text style={styles.featureText}>Treinos personalizados</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🥗</Text>
              <Text style={styles.featureText}>Nutrição com IA</Text>
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logo: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  logoText: {
    fontSize: 30,
  },
  logoImage: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#8B5CF6',
    fontSize: 14,
  },
  loginButton: {
    height: 56,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: '#94A3B8',
    fontSize: 14,
    marginHorizontal: 16,
  },
  registerButton: {
    height: 56,
    backgroundColor: 'transparent',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  registerButtonText: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: '600',
  },
  demoCredentials: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  demoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  demoLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  demoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});