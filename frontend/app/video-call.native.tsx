import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AgoraVideoCall from '@/components/AgoraVideoCall';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VideoCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { roomId, appointmentId, clientName } = params;

  const [showVideoCall, setShowVideoCall] = useState(true);

  const handleCallEnd = async () => {
    setShowVideoCall(false);
    router.back();
  };

  const getUserName = async () => {
    // Try to get from AsyncStorage
    const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('professionalToken');
    return clientName as string || 'Usuário';
  };

  return (
    <SafeAreaView style={styles.container}>
      <AgoraVideoCall
        visible={showVideoCall}
        channelName={roomId as string}
        userName={clientName as string || 'Usuário'}
        onClose={handleCallEnd}
        onCallEnded={handleCallEnd}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});
