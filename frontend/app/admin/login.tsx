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

export default function AdminLogin() {
  const [email, setEmail] = useState('admin@luxepass.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Animação de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Animação contínua de rotação para elementos decorativos
    const createRotateAnimation = () => {
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      }).start(() => {
        rotateAnim.setValue(0);
        createRotateAnimation();
      });
    };
    createRotateAnimation();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });

      const { access_token } = response.data;
      
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('userType', 'admin');
      
      router.replace('/admin/(tabs)');
    } catch (error: any) {
      console.error('Admin login error:', error);
      Alert.alert(
        'Erro no Login', 
        error.response?.data?.detail || 'Erro ao fazer login. Tente novamente.'
      );
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
                  colors={['rgba(245, 158, 11, 0.3)', 'rgba(245, 158, 11, 0.1)']}
                  style={styles.backButtonGradient}
                >
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>

              {/* Logo with Admin Badge */}
              <Animated.View 
                style={[
                  styles.logoContainer,
                  { transform: [{ scale: scaleAnim }] }
                ]}
              >
                <LinearGradient
                  colors={['#F59E0B', '#F97316', '#EF4444']}
                  style={styles.logoGradient}
                >
                  <Image 
                    source={{ uri: 'https://customer-assets.emergentagent.com/job_fitness-token-app/artifacts/8gnzidak_IMG_0187.png' }}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                  <View style={styles.adminBadge}>
                    <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
                  </View>
                </LinearGradient>
                <View style={styles.logoGlow} />
              </Animated.View>

              <Text style={styles.title}>
                🔐 Painel Administrativo
              </Text>
              <Text style={styles.subtitle}>
                Acesso restrito - LuxePass Admin
              </Text>

              {/* Security indicators */}
              <View style={styles.securityBadges}>
                <View style={styles.securityBadge}>
                  <Ionicons name="lock-closed" size={12} color="#22C55E" />
                  <Text style={styles.securityText}>Criptografado</Text>
                </View>
                <View style={styles.securityBadge}>
                  <Ionicons name="shield" size={12} color="#3B82F6" />
                  <Text style={styles.securityText}>Autenticado</Text>
                </View>
              </View>
            </Animated.View>

            {/* Admin Form Card */}
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
                colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.08)']}
                style={styles.formGradient}
              >
                {/* Form Header */}
                <View style={styles.formHeader}>
                  <Ionicons name="person-circle" size={32} color="#F59E0B" />
                  <Text style={styles.formTitle}>Login Administrativo</Text>
                </View>

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    <Ionicons name="mail" size={16} color="#F59E0B" /> Email Administrativo
                  </Text>
                  <View style={styles.inputContainer}>
                    <LinearGradient
                      colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.08)']}
                      style={styles.inputGradient}
                    >
                      <Ionicons name="shield-outline" size={20} color="#F59E0B" />
                      <TextInput
                        style={styles.input}
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
                  <Text style={styles.label}>
                    <Ionicons name="key" size={16} color="#F59E0B" /> Senha Mestre
                  </Text>
                  <View style={styles.inputContainer}>
                    <LinearGradient
                      colors={['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.08)']}
                      style={styles.inputGradient}
                    >
                      <Ionicons name="lock-closed-outline" size={20} color="#F59E0B" />
                      <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Digite sua senha administrativa"
                        placeholderTextColor="#64748B"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons 
                          name={showPassword ? "eye-off-outline" : "eye-outline"} 
                          size={20} 
                          color="#F59E0B" 
                        />
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                </View>

                {/* Admin Login Button */}
                <TouchableOpacity 
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={loading ? ['#64748B', '#475569'] : ['#F59E0B', '#F97316', '#EF4444']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.loginButtonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="rocket-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.loginButtonText}>Acessar Painel</Text>
                        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                      </>
                    )}
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
                colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.1)']}
                style={styles.demoGradient}
              >
                <View style={styles.demoHeader}>
                  <Ionicons name="key" size={24} color="#F59E0B" />
                  <Text style={styles.demoTitle}>🔑 Credenciais de Acesso</Text>
                </View>
                <View style={styles.demoRow}>
                  <Text style={styles.demoLabel}>Email:</Text>
                  <Text style={styles.demoValue}>admin@luxepass.com</Text>
                </View>
                <View style={styles.demoRow}>
                  <Text style={styles.demoLabel}>Senha:</Text>
                  <Text style={styles.demoValue}>admin123</Text>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Admin Features */}
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
                <View style={styles.featureItem}>
                  <LinearGradient
                    colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Ionicons name="people" size={24} color="#22C55E" />
                  </LinearGradient>
                  <Text style={styles.featureText}>Gestão de Usuários</Text>
                </View>
                <View style={styles.featureItem}>
                  <LinearGradient
                    colors={['rgba(59, 130, 246, 0.2)', 'rgba(59, 130, 246, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Ionicons name="business" size={24} color="#3B82F6" />
                  </LinearGradient>
                  <Text style={styles.featureText}>Controle de Academias</Text>
                </View>
                <View style={styles.featureItem}>
                  <LinearGradient
                    colors={['rgba(168, 85, 247, 0.2)', 'rgba(168, 85, 247, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Ionicons name="analytics" size={24} color="#A855F7" />
                  </LinearGradient>
                  <Text style={styles.featureText}>Analytics Avançado</Text>
                </View>
                <View style={styles.featureItem}>
                  <LinearGradient
                    colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.1)']}
                    style={styles.featureIconContainer}
                  >
                    <Ionicons name="card" size={24} color="#F59E0B" />
                  </LinearGradient>
                  <Text style={styles.featureText}>Relatórios Financeiros</Text>
                </View>
              </View>
            </Animated.View>

            {/* Security Notice */}
            <Animated.View 
              style={[
                styles.securityNotice,
                {
                  opacity: fadeAnim,
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.08)']}
                style={styles.securityGradient}
              >
                <Ionicons name="warning" size={20} color="#EF4444" />
                <Text style={styles.securityNoticeText}>
                  Acesso monitorado e registrado para segurança
                </Text>
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
  // Elementos animados de fundo
  backgroundShape1: {
    position: 'absolute',
    top: 120,
    right: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    opacity: 0.6,
  },
  backgroundShape2: {
    position: 'absolute',
    top: 300,
    left: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    opacity: 0.4,
  },
  backgroundShape3: {
    position: 'absolute',
    bottom: 200,
    right: 30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
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
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    top: -15,
    left: -15,
    zIndex: -1,
  },
  logoImage: {
    width: 65,
    height: 65,
  },
  adminBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
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
    marginBottom: 16,
  },
  securityBadges: {
    flexDirection: 'row',
    gap: 12,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  securityText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
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
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
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
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
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
    borderColor: 'rgba(245, 158, 11, 0.3)',
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
    color: '#F59E0B',
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  featureItem: {
    alignItems: 'center',
    width: '48%',
  },
  featureIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '500',
  },
  securityNotice: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  securityGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  securityNoticeText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});