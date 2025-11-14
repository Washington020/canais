import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NutritionistTabsLayout() {
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Confirmar Logout',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('professionalToken');
              await AsyncStorage.removeItem('professional');
              router.replace('/professional/nutritionist/login');
            } catch (error) {
              console.error('Error during logout:', error);
            }
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
          backgroundColor: '#1E293B',
        },
        headerTintColor: '#FFFFFF',
        headerRight: () => (
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              marginRight: 15,
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              borderRadius: 20,
            }}
          >
            <Ionicons name="log-out" size={20} color="#EF4444" />
          </TouchableOpacity>
        ),
        tabBarStyle: {
          backgroundColor: '#1E293B',
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          height: 60,
        },
        tabBarActiveTintColor: '#22C55E',
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
          headerTitle: 'Nutricionista - Meus Clientes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="new-clients"
        options={{
          title: 'Novos',
          headerTitle: 'Novos Clientes Disponíveis',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-add" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="create-plan"
        options={{
          title: 'Criar Dieta',
          headerTitle: 'Criar Plano Nutricional',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="availability"
        options={{
          title: 'Disponibilidade',
          headerTitle: 'Minha Disponibilidade',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Agenda',
          headerTitle: 'Minha Agenda',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}