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
import axios from 'axios';

const { width, height } = Dimensions.get('window');
const API_URL = '/api';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

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
      Animated.spring(bounceAnim, {
        toValue: 1,
        tension: 80,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous rotation animation
    const startRotation = () => {
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      }).start(() => {
        rotateAnim.setValue(0);
        startRotation();
      });
    };
    startRotation();
  }, []);

  const handleLogin = async () => {
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
        'Por favor, digite um email válido (exemplo: admin@luxepass.com).'
      );
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      const { access_token } = response.data;
      
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('userType', 'admin');
      
      router.replace('/admin/(tabs)');
    } catch (error: any) {
      console.error('Admin login error:', error);
      
      let title = 'Erro no Login ❌';
      let message = 'Não foi possível realizar o login.';

      if (error.response?.status === 401) {
        title = 'Credenciais Inválidas ❌';
        message = 'Email ou senha incorretos. Verifique seus dados e tente novamente.\n\n💡 Credenciais padrão:\nEmail: admin@luxepass.com\nSenha: admin123';
      } else if (error.response?.status === 400) {
        title = 'Dados Inválidos ❌';
        message = 'Email e senha são obrigatórios. Verifique se preencheu todos os campos corretamente.';
      } else if (error.response?.status === 403) {
        title = 'Acesso Negado ❌';
        message = 'Você não tem permissão de administrador. Entre em contato com o suporte.';
      } else if (error.code === 'ECONNABORTED') {
        title = 'Timeout ❌';
        message = 'A conexão demorou muito. Verifique sua internet e tente novamente.';
      } else if (error.response?.status >= 500) {
        title = 'Erro do Servidor ❌';
        message = 'Erro interno do servidor. Tente novamente em alguns minutos.';
      } else {
        message = error.response?.data?.detail || error.message || 'Erro desconhecido ao fazer login.';
      }
      
      Alert.alert(title, message);
    } finally {
      setLoading(false);
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0B0D17', '#1A103C', '#2D1655']}
        style={styles.backgroundGradient}
      >
        {/* Animated Background Elements */}
        <Animated.View style={[styles.backgroundShape1, { transform: [{ rotate: spin }] }]} />
        <Animated.View style={[styles.backgroundShape2, { transform: [{ rotate: spin }] }]} />
        <View style={styles.backgroundShape3} />

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
                    { scale: bounceAnim }
                  ]
                }
              ]}
            >
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7', '#C084FC']}
                  style={styles.logoGradient}
                >
                  <Ionicons name="shield-checkmark" size={40} color="#FFFFFF" />
                  <View style={styles.adminBadge}>
                    <Ionicons name="star" size={16} color="#FFFFFF" />
                  </View>
                </LinearGradient>
                <Animated.View style={[styles.logoGlow, { opacity: fadeAnim }]} />
              </View>

              <Text style={styles.title}>🛡️ LuxePass Admin</Text>
              <Text style={styles.subtitle}>Painel de Controle Executivo</Text>

              {/* Status Indicators */}
              <View style={styles.statusIndicators}>
                <View style={styles.statusItem}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Sistema Online</Text>
                </View>
                <View style={styles.statusItem}>
                  <Ionicons name="shield-checkmark" size={12} color="#22C55E" />
                  <Text style={styles.statusText}>Seguro</Text>
                </View>
                <View style={styles.statusItem}>
                  <Ionicons name="flash" size={12} color="#F59E0B" />
                  <Text style={styles.statusText}>Rápido</Text>
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
                    colors={['#8B5CF6', '#A855F7']}
                    style={styles.formHeaderIcon}
                  >
                    <Ionicons name="key" size={24} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.formTitle}>Acesso Administrativo</Text>
                </View>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="mail-outline" size={16} color="#8B5CF6" /> Email Administrativo
                  </Text>
                  <View style={styles.inputContainer}>
                    <LinearGradient
                      colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.08)']}
                      style={styles.inputGradient}
                    >
                      <View style={styles.inputIconContainer}>
                        <Ionicons name="mail" size={20} color="#8B5CF6" />
                      </View>
                      <TextInput
                        style={styles.textInput}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="admin@luxepass.com"
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
                    <Ionicons name="key-outline" size={16} color="#8B5CF6" /> Senha de Acesso
                  </Text>
                  <View style={styles.inputContainer}>
                    <LinearGradient
                      colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.08)']}
                      style={styles.inputGradient}
                    >
                      <View style={styles.inputIconContainer}>
                        <Ionicons name="key" size={20} color="#8B5CF6" />
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
                          color="#8B5CF6" 
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
                    colors={loading ? ['#64748B', '#475569'] : ['#8B5CF6', '#A855F7', '#C084FC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.loginButtonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                        <Text style={styles.loginButtonText}>Acessar Painel</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>

            {/* Features Card */}
            <Animated.View 
              style={[
                styles.featuresContainer,
                {
                  opacity: fadeAnim,
                }
              ]}
            >
              <Text style={styles.featuresTitle}>Recursos Administrativos</Text>
              <View style={styles.featuresGrid}>
                <View style={styles.feature}>
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Text style={styles.featureEmoji}>👥</Text>
                  </LinearGradient>
                  <Text style={styles.featureText}>Gestão de Usuários</Text>
                </View>
                <View style={styles.feature}>
                  <LinearGradient
                    colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Text style={styles.featureEmoji}>🏋️</Text>
                  </LinearGradient>
                  <Text style={styles.featureText}>Controle Academias</Text>
                </View>
                <View style={styles.feature}>
                  <LinearGradient
                    colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Text style={styles.featureEmoji}>💰</Text>
                  </LinearGradient>
                  <Text style={styles.featureText}>Financeiro</Text>
                </View>
                <View style={styles.feature}>
                  <LinearGradient
                    colors={['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Text style={styles.featureEmoji}>🎫</Text>
                  </LinearGradient>
                  <Text style={styles.featureText}>Tokens</Text>
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
                    <Text style={styles.credentialsLabel}>Email:</Text> admin@luxepass.com
                  </Text>
                  <Text style={styles.credentialsText}>
                    <Text style={styles.credentialsLabel}>Senha:</Text> admin123
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
  backgroundShape1: {
    position: 'absolute',
    top: 150,
    right: 30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  backgroundShape2: {
    position: 'absolute',
    bottom: 300,
    left: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
  },
  backgroundShape3: {
    position: 'absolute',
    top: 300,
    right: 60,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(192, 132, 252, 0.06)',
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
    shadowColor: '#8B5CF6',
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
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    top: -20,
    left: -20,
    zIndex: -1,
  },
  adminBadge: {
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
    borderColor: 'rgba(139, 92, 246, 0.2)',
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
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  inputIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
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
    shadowColor: '#8B5CF6',
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  feature: {
    alignItems: 'center',
    width: '22%',
    marginBottom: 16,
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