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
  Image,
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
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://premium-fitness-4.preview.emergentagent.com';

export default function ClientLogin() {
  const [email, setEmail] = useState('cliente@luxepass.com');
  const [password, setPassword] = useState('cliente123');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animação de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Animação de pulse para o botão
    const createPulseAnimation = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => createPulseAnimation());
    };
    createPulseAnimation();
  }, []);

  const handleLogin = async () => {
    try {
      console.log('🔄 LOGIN INICIADO!');
      
      if (!email || !password) {
        console.error('❌ Credenciais faltando');
        Alert.alert('Erro', 'Por favor, preencha todos os campos');
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
      
      console.log('💾 Salvando token...');
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('userType', 'client');
      console.log('✅ Token salvo com sucesso');
      
      console.log('🎯 Iniciando navegação...');
      
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
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0B0D17', '#1E1B3C', '#2D1B69']}
        style={styles.backgroundGradient}
      >
        {/* Floating Elements */}
        <View style={styles.floatingElement1} />
        <View style={styles.floatingElement2} />
        <View style={styles.floatingElement3} />

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
            <Animated.View 
              style={[
                styles.header,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
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

              {/* Logo with Glow Effect */}
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7', '#C084FC']}
                  style={styles.logoGradient}
                >
                  <Image 
                    source={{ uri: 'https://customer-assets.emergentagent.com/job_fitness-token-app/artifacts/8gnzidak_IMG_0187.png' }}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </LinearGradient>
                <View style={styles.logoGlow} />
              </View>

              <Text style={styles.title}>
                Bem-vindo de volta! 👋
              </Text>
              <Text style={styles.subtitle}>
                Entre na sua conta LuxePass
              </Text>
            </Animated.View>

            {/* Form Card */}
            <Animated.View 
              style={[
                styles.formCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.formGradient}
              >
                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    <Ionicons name="mail" size={16} color="#8B5CF6" /> Email
                  </Text>
                  <View style={styles.inputContainer}>
                    <LinearGradient
                      colors={['rgba(139, 92, 246, 0.1)', 'rgba(139, 92, 246, 0.05)']}
                      style={styles.inputGradient}
                    >
                      <Ionicons name="person-outline" size={20} color="#8B5CF6" />
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
                    </LinearGradient>
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    <Ionicons name="key" size={16} color="#8B5CF6" /> Senha
                  </Text>
                  <View style={styles.inputContainer}>
                    <LinearGradient
                      colors={['rgba(139, 92, 246, 0.1)', 'rgba(139, 92, 246, 0.05)']}
                      style={styles.inputGradient}
                    >
                      <Ionicons name="lock-closed-outline" size={20} color="#8B5CF6" />
                      <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Digite sua senha"
                        placeholderTextColor="#64748B"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons 
                          name={showPassword ? "eye-off-outline" : "eye-outline"} 
                          size={20} 
                          color="#8B5CF6" 
                        />
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                </View>

                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>
                    <Ionicons name="help-circle-outline" size={16} color="#8B5CF6" /> Esqueceu a senha?
                  </Text>
                </TouchableOpacity>

                {/* Login Button with Animation */}
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
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
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Ionicons name="rocket-outline" size={20} color="#FFFFFF" />
                          <Text style={styles.loginButtonText}>Entrar Agora</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Register Button */}
                <TouchableOpacity 
                  style={styles.registerButton}
                  onPress={() => router.push('/client/register')}
                >
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.1)']}
                    style={styles.registerButtonGradient}
                  >
                    <Ionicons name="person-add-outline" size={20} color="#8B5CF6" />
                    <Text style={styles.registerButtonText}>Criar Nova Conta</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>

            {/* Demo Credentials Card */}
            <Animated.View 
              style={[
                styles.demoCard,
                {
                  opacity: fadeAnim,
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.1)']}
                style={styles.demoGradient}
              >
                <View style={styles.demoHeader}>
                  <Ionicons name="play-circle" size={24} color="#22C55E" />
                  <Text style={styles.demoTitle}>🎯 Teste Rápido</Text>
                </View>
                <View style={styles.demoRow}>
                  <Text style={styles.demoLabel}>Email:</Text>
                  <Text style={styles.demoValue}>cliente@luxepass.com</Text>
                </View>
                <View style={styles.demoRow}>
                  <Text style={styles.demoLabel}>Senha:</Text>
                  <Text style={styles.demoValue}>cliente123</Text>
                </View>
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
              <Text style={styles.featuresTitle}>Por que escolher LuxePass?</Text>
              <View style={styles.featuresGrid}>
                <View style={styles.featureItem}>
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Text style={styles.featureIcon}>🏋️</Text>
                  </LinearGradient>
                  <Text style={styles.featureText}>+500 Academias</Text>
                </View>
                <View style={styles.featureItem}>
                  <LinearGradient
                    colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Text style={styles.featureIcon}>🎯</Text>
                  </LinearGradient>
                  <Text style={styles.featureText}>Treinos IA</Text>
                </View>
                <View style={styles.featureItem}>
                  <LinearGradient
                    colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Text style={styles.featureIcon}>🥗</Text>
                  </LinearGradient>
                  <Text style={styles.featureText}>Nutrição Pro</Text>
                </View>
              </View>
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
  // Elementos flutuantes para efeito visual
  floatingElement1: {
    position: 'absolute',
    top: 100,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    opacity: 0.6,
  },
  floatingElement2: {
    position: 'absolute',
    top: 200,
    left: 40,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    opacity: 0.4,
  },
  floatingElement3: {
    position: 'absolute',
    bottom: 150,
    right: 50,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    opacity: 0.3,
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
  logoContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logoGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    top: -10,
    left: -10,
    zIndex: -1,
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#94A3B8',
    textAlign: 'center',
  },
  formCard: {
    marginBottom: 32,
    borderRadius: 24,
    overflow: 'hidden',
  },
  formGradient: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  inputContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    fontWeight: '500',
  },
  registerButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  registerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  registerButtonText: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: '600',
  },
  demoCard: {
    marginBottom: 32,
    borderRadius: 20,
    overflow: 'hidden',
  },
  demoGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  demoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  demoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  demoLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  demoValue: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
  },
  featuresContainer: {
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '500',
  },
});