import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function PersonalTrainerTabsLayout() {
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Deseja sair da conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          onPress: async () => {
            await AsyncStorage.multiRemove(['professionalToken', 'professional']);
            router.replace('/professional/personal/login');
          }
        }
      ]
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#0B0D17',
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        },
        headerTintColor: '#FFFFFF',
        headerRight: () => (
          <TouchableOpacity 
            onPress={handleLogout}
            style={{ marginRight: 16, padding: 8 }}
          >
            <Ionicons name="log-out" size={20} color="#EF4444" />
          </TouchableOpacity>
        ),
        tabBarStyle: {
          backgroundColor: '#1E293B',
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          height: 60,
        },
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Meus Clientes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="new-clients"
        options={{
          title: 'Novos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-add" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="create-plan"
        options={{
          title: 'Criar Plano',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}