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
const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function GymLogin() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Animação de entrada
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

    // Animação de brilho contínua
    const createGlowAnimation = () => {
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start(() => createGlowAnimation());
    };
    createGlowAnimation();
  }, []);

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
      
      await AsyncStorage.setItem('gymToken', access_token);
      await AsyncStorage.setItem('gymInfo', JSON.stringify(gym_info));
      
      Alert.alert(
        'Login Realizado! ✅',
        `Bem-vindo ao sistema ${gym_info.name}!\n\nVocê agora pode validar tokens de clientes.`,
        [
          {
            text: 'Continuar',
            onPress: () => {
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
      'Entre em contato com o administrador do LuxePass para redefinir sua senha.\n\nTelefone: (11) 99999-9999\nEmail: suporte@luxepass.com',
      [{ text: 'OK' }]
    );
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
        <Animated.View style={[styles.backgroundOrb1, { opacity: glowAnim }]} />
        <Animated.View style={[styles.backgroundOrb2, { opacity: glowAnim }]} />
        <View style={styles.backgroundPattern} />

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
                  <Image 
                    source={{ uri: 'https://customer-assets.emergentagent.com/job_fitness-token-app/artifacts/8gnzidak_IMG_0187.png' }}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                  <View style={styles.gymBadge}>
                    <Ionicons name="business" size={16} color="#FFFFFF" />
                  </View>
                </LinearGradient>
                <Animated.View style={[styles.logoGlow, { opacity: glowAnim }]} />
              </View>

              <Text style={styles.title}>🏋️ Sistema Academia</Text>
              <Text style={styles.subtitle}>Validação de Tokens LuxePass</Text>

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
                    <Ionicons name="business" size={24} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.formTitle}>Acesso Academia</Text>
                </View>

                {/* Login Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="business-outline" size={16} color="#8B5CF6" /> Login da Academia
                  </Text>
                  <View style={styles.inputContainer}>
                    <LinearGradient
                      colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.08)']}
                      style={styles.inputGradient}
                    >
                      <View style={styles.inputIconContainer}>
                        <Ionicons name="business" size={20} color="#8B5CF6" />
                      </View>
                      <TextInput
                        style={styles.textInput}
                        value={login}
                        onChangeText={setLogin}
                        placeholder="gym_academia_nome_1234"
                        placeholderTextColor="#64748B"
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

                {/* Forgot Password */}
                <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={handleForgotPassword}
                >
                  <Text style={styles.forgotPasswordText}>
                    <Ionicons name="help-circle-outline" size={16} color="#8B5CF6" /> Esqueceu a senha?
                  </Text>
                </TouchableOpacity>

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
                        <Ionicons name="log-in" size={20} color="#FFFFFF" />
                        <Text style={styles.loginButtonText}>Entrar no Sistema</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>

            {/* Instructions Card */}
            <Animated.View 
              style={[
                styles.instructionsContainer,
                {
                  opacity: fadeAnim,
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.08)']}
                style={styles.instructionsGradient}
              >
                <View style={styles.instructionHeader}>
                  <LinearGradient
                    colors={['#3B82F6', '#1D4ED8']}
                    style={styles.instructionIcon}
                  >
                    <Ionicons name="information-circle" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.instructionTitle}>Como Obter suas Credenciais</Text>
                </View>
                
                <View style={styles.instructionSteps}>
                  <View style={styles.instructionStep}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <Text style={styles.instructionText}>
                      Acesse o <Text style={styles.highlightText}>App Administrador</Text> do LuxePass
                    </Text>
                  </View>
                  <View style={styles.instructionStep}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <Text style={styles.instructionText}>
                      Vá em <Text style={styles.highlightText}>Academias</Text> → <Text style={styles.highlightText}>Gerenciar</Text>
                    </Text>
                  </View>
                  <View style={styles.instructionStep}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <Text style={styles.instructionText}>
                      Localize sua academia e visualize as <Text style={styles.highlightText}>credenciais</Text>
                    </Text>
                  </View>
                  <View style={styles.instructionStep}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>4</Text>
                    </View>
                    <Text style={styles.instructionText}>
                      Use o <Text style={styles.highlightText}>Login</Text> e <Text style={styles.highlightText}>Senha</Text> fornecidos
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Help Section */}
            <Animated.View 
              style={[
                styles.helpContainer,
                {
                  opacity: fadeAnim,
                }
              ]}
            >
              <Text style={styles.helpTitle}>Precisa de Ajuda?</Text>
              <View style={styles.helpOptions}>
                <TouchableOpacity style={styles.helpOption}>
                  <LinearGradient
                    colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.1)']}
                    style={styles.helpOptionGradient}
                  >
                    <Ionicons name="call" size={16} color="#22C55E" />
                    <Text style={styles.helpText}>(11) 99999-9999</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.helpOption}>
                  <LinearGradient
                    colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.1)']}
                    style={styles.helpOptionGradient}
                  >
                    <Ionicons name="mail" size={16} color="#F59E0B" />
                    <Text style={styles.helpText}>suporte@luxepass.com</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
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
                    colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Text style={styles.featureEmoji}>📱</Text>
                  </LinearGradient>
                  <Text style={styles.featureText}>Validação QR</Text>
                </View>
                <View style={styles.feature}>
                  <LinearGradient
                    colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Text style={styles.featureEmoji}>📊</Text>
                  </LinearGradient>
                  <Text style={styles.featureText}>Dashboard Pro</Text>
                </View>
                <View style={styles.feature}>
                  <LinearGradient
                    colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Text style={styles.featureEmoji}>👥</Text>
                  </LinearGradient>
                  <Text style={styles.featureText}>Controle Total</Text>
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
  backgroundOrb1: {
    position: 'absolute',
    top: 100,
    right: 50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  backgroundOrb2: {
    position: 'absolute',
    bottom: 200,
    left: 30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 250,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
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
  logoImage: {
    width: 70,
    height: 70,
  },
  gymBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
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
    gap: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  statusText: {
    color: '#94A3B8',
    fontSize: 12,
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
  instructionsContainer: {
    marginHorizontal: 24,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  instructionsGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  instructionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionTitle: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionSteps: {
    gap: 12,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  instructionText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  highlightText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  helpContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  helpTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  helpOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  helpOption: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  helpOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  helpText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  featuresContainer: {
    paddingHorizontal: 24,
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
    justifyContent: 'space-around',
  },
  feature: {
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
  featureEmoji: {
    fontSize: 28,
  },
  featureText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
});