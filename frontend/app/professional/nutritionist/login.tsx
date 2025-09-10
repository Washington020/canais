import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '/api';

export default function NutritionistLogin() {
  const [email, setEmail] = useState('nutri@luxepass.com');
  const [password, setPassword] = useState('nutri123');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erro', 'Por favor, preencha email e senha');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/professionals/login`, {
        email: email.trim(),
        password: password.trim(),
      });

      const { access_token, professional } = response.data;

      if (professional.professional_type !== 'nutritionist') {
        Alert.alert('Erro', 'Esta área é exclusiva para nutricionistas');
        return;
      }

      // Save token and professional info
      await AsyncStorage.setItem('professionalToken', access_token);
      await AsyncStorage.setItem('professional', JSON.stringify(professional));

      Alert.alert(
        '✅ Login Realizado!',
        `Bem-vinda, ${professional.full_name}!`,
        [
          {
            text: 'Continuar',
            onPress: () => router.replace('/professional/nutritionist/(tabs)'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response?.status === 401) {
        Alert.alert('Erro', 'Email ou senha incorretos');
      } else {
        Alert.alert('Erro', 'Não foi possível fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Logo and Title */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="restaurant" size={48} color="#22C55E" />
            </View>
            <Text style={styles.title}>Nutricionista</Text>
            <Text style={styles.subtitle}>LuxePass Professional</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email profissional"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

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
                  <Text style={styles.loginButtonText}>Entrar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Test Credentials */}
          <View style={styles.testCredentials}>
            <Text style={styles.testTitle}>🧪 Credenciais de Teste:</Text>
            <Text style={styles.testText}>Email: nutri@luxepass.com</Text>
            <Text style={styles.testText}>Senha: nutri123</Text>
            <Text style={styles.testSubtext}>Dra. Maria Nutricionista - CRN-12345/SP</Text>
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              🥗 Área exclusiva para nutricionistas cadastrados
            </Text>
            <Text style={styles.infoText}>
              📋 Gerencie planos alimentares e suplementação
            </Text>
            <Text style={styles.infoText}>
              👥 Acompanhe seus clientes Premium e VIP
            </Text>
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 20,
    marginBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
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
  testCredentials: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  testTitle: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  testText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 2,
  },
  testSubtext: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 4,
  },
  infoContainer: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  infoText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
});