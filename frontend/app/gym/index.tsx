import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

export default function GymIndex() {
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const gymToken = await AsyncStorage.getItem('gymToken');
      
      if (gymToken) {
        // User is already logged in, go to validation system
        router.replace('/gym/validation');
      } else {
        // User needs to login
        router.replace('/gym/login');
      }
    } catch (error) {
      // If there's an error, go to login
      router.replace('/gym/login');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0D17' }}>
      <ActivityIndicator size="large" color="#8B5CF6" />
    </View>
  );
}