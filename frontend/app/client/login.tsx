import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const API_URL = '/api';

export default function ClientLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for logo
    const createPulseAnimation = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start(() => createPulseAnimation());
    };
    createPulseAnimation();
  }, []);

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        Alert.alert(
          'Campos Obrigatórios ⚠️',
          'Por favor, preencha email e senha para continuar.'
        );
        return;
      }

      if (!email.includes('@')) {
        Alert.alert(
          'Email Inválido ❌',
          'Por favor, digite um email válido (exemplo: cliente@luxepass.com).'
        );
        return;
      }

      console.log('📧 Email:', email);
      console.log('🌐 API_URL:', API_URL);
      
      setLoading(true);
      
      console.log('📡 Fazendo requisição...');
      
      const loginData = {
        email: email.trim(),
        password: password
      };
      
      console.log('📊 Login data:', loginData);
      
      const response = await fetch(`${API_URL}/auth/login`, {
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
        
        let title = 'Erro no Login ❌';
        let message = 'Não foi possível realizar o login.';

        if (response.status === 401) {
          title = 'Credenciais Inválidas ❌';
          message = 'Email ou senha incorretos. Verifique seus dados e tente novamente.\n\n💡 Credenciais padrão:\nEmail: cliente@luxepass.com\nSenha: cliente123';
        } else if (response.status === 400) {
          title = 'Dados Inválidos ❌';
          message = 'Email e senha são obrigatórios. Verifique se preencheu todos os campos corretamente.';
        } else if (response.status === 403) {
          title = 'Acesso Negado ❌';
          message = 'Sua conta pode estar bloqueada. Entre em contato com o suporte.';
        } else if (response.status >= 500) {
          title = 'Erro do Servidor ❌';
          message = 'Erro interno do servidor. Tente novamente em alguns minutos.';
        } else {
          try {
            const errorJson = JSON.parse(errorData);
            message = errorJson.detail || message;
          } catch (e) {
            message = errorData || message;
          }
        }
        
        Alert.alert(title, message);
        return;
      }
      
      const data = await response.json();
      console.log('✅ Response data:', data);
      
      const { access_token } = data;
      
      if (!access_token) {
        Alert.alert(
          'Erro de Resposta ❌',
          'Token de acesso não foi recebido. Tente novamente.'
        );
        return;
      }
      
      console.log('💾 Salvando token...');
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('userType', 'client');
      console.log('✅ Token salvo com sucesso');
      
      console.log('🎯 Iniciando navegação...');
      
      router.replace('/client/(tabs)');
      console.log('🚀 Navegação iniciada');
    } catch (error: any) {
      console.error('❌ Erro geral no login:', error);
      
      let title = 'Erro no Login ❌';
      let message = 'Não foi possível realizar o login.';

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        title = 'Erro de Conexão ❌';
        message = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
      } else {
        message = error.message || 'Erro desconhecido ao fazer login.';
      }
      
      Alert.alert(title, message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0B0D17', '#1E1A3C', '#2A1B4A']}
        style={styles.backgroundGradient}
      >
        {/* Animated Background Elements */}
        <Animated.View style={[styles.backgroundOrb1, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.backgroundOrb2, { opacity: pulseAnim }]} />
        <View style={styles.backgroundOrb3} />

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.replace('/')}
              >
                <LinearGradient
                  colors={['rgba(139, 92, 246, 0.3)', 'rgba(139, 92, 246, 0.1)']}
                  style={styles.backButtonGradient}
                >
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Logo and Title */}
            <Animated.View 
              style={[
                styles.logoSection,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim }
                  ]
                }
              ]}
            >
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#22C55E', '#16A34A', '#15803D']}
                  style={styles.logoGradient}
                >
                  <Ionicons name="fitness" size={40} color="#FFFFFF" />
                  <View style={styles.clientBadge}>
                    <Ionicons name="person" size={16} color="#FFFFFF" />
                  </View>
                </LinearGradient>
                <Animated.View style={[styles.logoGlow, { opacity: pulseAnim }]} />
              </View>

              <Text style={styles.title}>💪 Cliente LuxePass</Text>
              <Text style={styles.subtitle}>Acesso Premium às Academias</Text>

              {/* Status Indicators */}
              <View style={styles.statusIndicators}>
                <View style={styles.statusItem}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Online</Text>
                </View>
                <View style={styles.statusItem}>
                  <Ionicons name="shield-checkmark" size={12} color="#22C55E" />
                  <Text style={styles.statusText}>Seguro</Text>
                </View>
                <View style={styles.statusItem}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.statusText}>Premium</Text>
                </View>
              </View>
            </Animated.View>

            {/* Login Form */}
            <Animated.View 
              style={[
                styles.formContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.06)']}
                style={styles.formGradient}
              >
                {/* Form Header */}
                <View style={styles.formHeader}>
                  <LinearGradient
                    colors={['#22C55E', '#16A34A']}
                    style={styles.formHeaderIcon}
                  >
                    <Ionicons name="person" size={24} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.formTitle}>Login do Cliente</Text>
                </View>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="mail-outline" size={16} color="#22C55E" /> Email do Cliente
                  </Text>
                  <View style={styles.inputContainer}>
                    <LinearGradient
                      colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.08)']}
                      style={styles.inputGradient}
                    >
                      <View style={styles.inputIconContainer}>
                        <Ionicons name="mail" size={20} color="#22C55E" />
                      </View>
                      <TextInput
                        style={styles.textInput}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="cliente@luxepass.com"
                        placeholderTextColor="#64748B"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </LinearGradient>
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="key-outline" size={16} color="#22C55E" /> Senha de Acesso
                  </Text>
                  <View style={styles.inputContainer}>
                    <LinearGradient
                      colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.08)']}
                      style={styles.inputGradient}
                    >
                      <View style={styles.inputIconContainer}>
                        <Ionicons name="key" size={20} color="#22C55E" />
                      </View>
                      <TextInput
                        style={styles.textInput}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Digite sua senha"
                        placeholderTextColor="#64748B"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity 
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeButton}
                      >
                        <Ionicons 
                          name={showPassword ? "eye-off" : "eye"} 
                          size={20} 
                          color="#22C55E" 
                        />
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                </View>

                {/* Login Button */}
                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={loading ? ['#64748B', '#475569'] : ['#22C55E', '#16A34A', '#15803D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.loginButtonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="fitness" size={20} color="#FFFFFF" />
                        <Text style={styles.loginButtonText}>Entrar no LuxePass</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>

            {/* Features */}
            <Animated.View 
              style={[
                styles.featuresContainer,
                {
                  opacity: fadeAnim,
                }
              ]}
            >
              <Text style={styles.featuresTitle}>Recursos Disponíveis</Text>
              <View style={styles.featuresGrid}>
                <View style={styles.feature}>
                  <LinearGradient
                    colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Text style={styles.featureEmoji}>🎫</Text>
                  </LinearGradient>
                  <Text style={styles.featureText}>Tokens</Text>
                </View>
                <View style={styles.feature}>
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Text style={styles.featureEmoji}>🏋️</Text>
                  </LinearGradient>
                  <Text style={styles.featureText}>Academias</Text>
                </View>
                <View style={styles.feature}>
                  <LinearGradient
                    colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Text style={styles.featureEmoji}>💪</Text>
                  </LinearGradient>
                  <Text style={styles.featureText}>Treinos</Text>
                </View>
                <View style={styles.feature}>
                  <LinearGradient
                    colors={['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Text style={styles.featureEmoji}>💰</Text>
                  </LinearGradient>
                  <Text style={styles.featureText}>Financeiro</Text>
                </View>
              </View>
            </Animated.View>

            {/* Credentials Info */}
            <Animated.View 
              style={[
                styles.credentialsContainer,
                {
                  opacity: fadeAnim,
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.08)']}
                style={styles.credentialsGradient}
              >
                <View style={styles.credentialsHeader}>
                  <LinearGradient
                    colors={['#3B82F6', '#1D4ED8']}
                    style={styles.credentialsIcon}
                  >
                    <Ionicons name="information-circle" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.credentialsTitle}>Credenciais de Demonstração</Text>
                </View>
                
                <View style={styles.credentialsContent}>
                  <Text style={styles.credentialsText}>
                    <Text style={styles.credentialsLabel}>Email:</Text> cliente@luxepass.com
                  </Text>
                  <Text style={styles.credentialsText}>
                    <Text style={styles.credentialsLabel}>Senha:</Text> cliente123
                  </Text>
                </View>
              </LinearGradient>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
    position: 'relative',
  },
  backgroundOrb1: {
    position: 'absolute',
    top: 120,
    right: 40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  backgroundOrb2: {
    position: 'absolute',
    bottom: 250,
    left: 30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
  },
  backgroundOrb3: {
    position: 'absolute',
    top: 280,
    right: 70,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(21, 128, 61, 0.06)',
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
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  backButtonGradient: {
    flex: 1,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    top: -20,
    left: -20,
    zIndex: -1,
  },
  clientBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  statusIndicators: {
    flexDirection: 'row',
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  statusText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  formContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  formGradient: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 12,
  },
  formHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  inputContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  inputIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
    marginRight: 12,
  },
  eyeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  featuresContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  featuresTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feature: {
    alignItems: 'center',
    flex: 1,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  credentialsContainer: {
    marginHorizontal: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  credentialsGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  credentialsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  credentialsIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  credentialsTitle: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  credentialsContent: {
    gap: 6,
  },
  credentialsText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  credentialsLabel: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});