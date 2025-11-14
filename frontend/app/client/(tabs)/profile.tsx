import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';

const API_URL = '/api';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  plan_type: string;
  status: string;
  avatar?: string;
  created_at: string;
  tokens_available?: number;
  tokens_used?: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
    loadSavedAvatar();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Erro', 'Token não encontrado. Faça login novamente.');
        return;
      }

      const response = await axios.get(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setProfile(response.data);
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error);
      Alert.alert('Erro', 'Não foi possível carregar seu perfil.');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedAvatar = async () => {
    try {
      const savedAvatar = await AsyncStorage.getItem('userAvatar');
      if (savedAvatar) {
        setAvatarUri(savedAvatar);
      }
    } catch (error) {
      console.error('Erro ao carregar avatar salvo:', error);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão Necessária',
          'Precisamos de acesso à sua galeria para você escolher uma foto de perfil.'
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const imageUri = result.assets[0].uri;
        
        // Salvar localmente no AsyncStorage
        await AsyncStorage.setItem('userAvatar', imageUri);
        setAvatarUri(imageUri);
        
        // Aqui você pode adicionar lógica para enviar ao backend se necessário
        // await uploadToBackend(imageUri);
        
        Alert.alert('Sucesso!', 'Foto de perfil atualizada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    Alert.alert(
      'Remover Foto',
      'Deseja remover sua foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('userAvatar');
            setAvatarUri(null);
            Alert.alert('Sucesso', 'Foto removida com sucesso!');
          }
        }
      ]
    );
  };

  const getPlanColor = (planType: string) => {
    switch (planType?.toLowerCase()) {
      case 'basico': return '#22C55E';
      case 'intermediario': return '#8B5CF6';
      case 'premium': return '#3B82F6';
      case 'vip': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getPlanName = (planType: string) => {
    switch (planType?.toLowerCase()) {
      case 'basico': return 'Plano Básico';
      case 'intermediario': return 'Plano Intermediário';
      case 'premium': return 'Plano Premium';
      case 'vip': return 'Plano VIP';
      default: return 'Plano';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return '#22C55E';
      case 'inactive': return '#EF4444';
      case 'pending': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'Ativo';
      case 'inactive': return 'Inativo';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Carregando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Erro ao carregar perfil</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const planColor = getPlanColor(profile.plan_type);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={[planColor, `${planColor}90`]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Meu Perfil</Text>
          <Text style={styles.headerSubtitle}>Informações da sua conta</Text>
        </LinearGradient>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: planColor }]}>
                <Ionicons name="person" size={60} color="#FFFFFF" />
              </View>
            )}
            
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
          </View>

          <View style={styles.avatarButtons}>
            <TouchableOpacity 
              style={[styles.avatarButton, { backgroundColor: planColor }]}
              onPress={pickImage}
              disabled={uploading}
            >
              <Ionicons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.avatarButtonText}>
                {avatarUri ? 'Trocar Foto' : 'Adicionar Foto'}
              </Text>
            </TouchableOpacity>

            {avatarUri && (
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={removeAvatar}
                disabled={uploading}
              >
                <Ionicons name="trash" size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Profile Info */}
        <View style={styles.infoSection}>
          {/* Name Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="person-circle" size={24} color={planColor} />
              <Text style={styles.infoLabel}>Nome Completo</Text>
            </View>
            <Text style={styles.infoValue}>{profile.full_name}</Text>
          </View>

          {/* Email Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="mail" size={24} color={planColor} />
              <Text style={styles.infoLabel}>Email</Text>
            </View>
            <Text style={styles.infoValue}>{profile.email}</Text>
          </View>

          {/* Plan Card */}
          <View style={[styles.infoCard, styles.planCard]}>
            <View style={styles.infoHeader}>
              <Ionicons name="diamond" size={24} color={planColor} />
              <Text style={styles.infoLabel}>Plano Atual</Text>
            </View>
            <View style={styles.planInfo}>
              <Text style={[styles.planName, { color: planColor }]}>
                {getPlanName(profile.plan_type)}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(profile.status)}20` }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(profile.status) }]} />
                <Text style={[styles.statusText, { color: getStatusColor(profile.status) }]}>
                  {getStatusText(profile.status)}
                </Text>
              </View>
            </View>
          </View>

          {/* Tokens Info */}
          {(profile.tokens_available !== undefined || profile.tokens_used !== undefined) && (
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Ionicons name="ticket" size={24} color={planColor} />
                <Text style={styles.infoLabel}>Tokens</Text>
              </View>
              <View style={styles.tokensInfo}>
                <View style={styles.tokenItem}>
                  <Text style={styles.tokenLabel}>Disponíveis</Text>
                  <Text style={[styles.tokenValue, { color: '#22C55E' }]}>
                    {profile.tokens_available || 0}
                  </Text>
                </View>
                <View style={styles.tokenDivider} />
                <View style={styles.tokenItem}>
                  <Text style={styles.tokenLabel}>Utilizados</Text>
                  <Text style={[styles.tokenValue, { color: '#94A3B8' }]}>
                    {profile.tokens_used || 0}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Member Since */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="calendar" size={24} color={planColor} />
              <Text style={styles.infoLabel}>Membro desde</Text>
            </View>
            <Text style={styles.infoValue}>
              {new Date(profile.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </Text>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.tipBox}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <Text style={styles.tipText}>
            Sua foto de perfil fica salva no dispositivo e será mantida até você decidir trocá-la ou removê-la.
          </Text>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={() => {
              Alert.alert(
                'Sair do App',
                'Tem certeza que deseja sair da sua conta?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: async () => {
                      await AsyncStorage.removeItem('token');
                      await AsyncStorage.removeItem('userType');
                      router.replace('/client/auth');
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="log-out" size={20} color="#EF4444" />
            <Text style={styles.logoutButtonText}>Sair do App</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D17',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 80,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: -60,
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  avatarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  infoSection: {
    paddingHorizontal: 24,
    gap: 16,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  planCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  planInfo: {
    gap: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tokensInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenItem: {
    flex: 1,
    alignItems: 'center',
  },
  tokenLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  tokenValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  tokenDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 32,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 20,
  },
});
