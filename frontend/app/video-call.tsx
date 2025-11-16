import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AgoraVideoCall from '@/components/AgoraVideoCall.native';
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

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    maxWidth: 300,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    width: '100%',
    maxWidth: 300,
  },
  cancelButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
  camera: {
    flex: 1,
  },
  videoOff: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  videoOffText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 16,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  callInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  callDuration: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  clientName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  controlsContainer: {
    backgroundColor: '#1E293B',
    paddingTop: 16,
    paddingBottom: 32,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#334155',
    minWidth: 80,
  },
  controlButtonActive: {
    backgroundColor: '#EF4444',
  },
  controlLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  endCallButton: {
    backgroundColor: '#EF4444',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '135deg' }],
  },
  infoSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    color: '#64748B',
    fontSize: 14,
    marginLeft: 8,
  },
});
