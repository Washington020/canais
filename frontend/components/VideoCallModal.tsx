import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DailyIframe from '@daily-co/react-native-daily-js';

const { width, height } = Dimensions.get('window');

interface VideoCallModalProps {
  visible: boolean;
  roomUrl: string;
  userName: string;
  onClose: () => void;
  onCallEnded?: () => void;
}

export default function VideoCallModal({
  visible,
  roomUrl,
  userName,
  onClose,
  onCallEnded
}: VideoCallModalProps) {
  const [callObject, setCallObject] = useState<any>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    if (visible && roomUrl) {
      joinCall();
    }
    
    return () => {
      if (callObject) {
        leaveCall();
      }
    };
  }, [visible, roomUrl]);

  const joinCall = async () => {
    try {
      setIsJoining(true);
      
      // Create call object
      const call = DailyIframe.createCallObject({
        url: roomUrl,
        userName: userName,
      });

      setCallObject(call);

      // Set up event listeners
      call
        .on('joined-meeting', handleJoinedMeeting)
        .on('left-meeting', handleLeftMeeting)
        .on('participant-joined', handleParticipantJoined)
        .on('participant-left', handleParticipantLeft)
        .on('error', handleError);

      // Join the call
      await call.join();
      
    } catch (error) {
      console.error('Erro ao entrar na chamada:', error);
      Alert.alert('Erro', 'Não foi possível entrar na videochamada. Tente novamente.');
      setIsJoining(false);
      onClose();
    }
  };

  const leaveCall = async () => {
    try {
      if (callObject) {
        await callObject.leave();
        await callObject.destroy();
        setCallObject(null);
        setIsInCall(false);
        if (onCallEnded) {
          onCallEnded();
        }
      }
    } catch (error) {
      console.error('Erro ao sair da chamada:', error);
    }
  };

  const handleJoinedMeeting = () => {
    console.log('✅ Entrou na reunião');
    setIsJoining(false);
    setIsInCall(true);
  };

  const handleLeftMeeting = () => {
    console.log('👋 Saiu da reunião');
    setIsInCall(false);
    onClose();
  };

  const handleParticipantJoined = (event: any) => {
    console.log('👤 Participante entrou:', event.participant);
    setParticipantCount(prev => prev + 1);
  };

  const handleParticipantLeft = (event: any) => {
    console.log('👋 Participante saiu:', event.participant);
    setParticipantCount(prev => Math.max(0, prev - 1));
  };

  const handleError = (error: any) => {
    console.error('❌ Erro na chamada:', error);
    Alert.alert('Erro', 'Ocorreu um erro durante a chamada.');
  };

  const toggleMute = async () => {
    if (callObject) {
      await callObject.setLocalAudio(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = async () => {
    if (callObject) {
      await callObject.setLocalVideo(!isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  const endCall = () => {
    Alert.alert(
      'Encerrar Chamada',
      'Deseja realmente encerrar a videochamada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Encerrar',
          style: 'destructive',
          onPress: async () => {
            await leaveCall();
            onClose();
          }
        }
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={endCall}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <View style={styles.statusDot} />
            <Text style={styles.headerText}>
              {isJoining ? 'Conectando...' : isInCall ? 'Chamada em Andamento' : 'Aguardando...'}
            </Text>
          </View>
          <Text style={styles.participantCount}>
            👤 {participantCount + 1}
          </Text>
        </View>

        {/* Video Container */}
        <View style={styles.videoContainer}>
          {isJoining && (
            <View style={styles.loadingContainer}>
              <Ionicons name="videocam" size={64} color="#8B5CF6" />
              <Text style={styles.loadingText}>Entrando na videochamada...</Text>
              <Text style={styles.loadingSubtext}>
                Certifique-se de permitir acesso à câmera e microfone
              </Text>
            </View>
          )}
          
          {isInCall && (
            <View style={styles.callInfo}>
              <Ionicons name="person-circle" size={100} color="#8B5CF6" />
              <Text style={styles.callInfoText}>{userName}</Text>
              <Text style={styles.callInfoSubtext}>Conectado</Text>
            </View>
          )}
        </View>

        {/* Controls */}
        {isInCall && (
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={toggleMute}
            >
              <Ionicons 
                name={isMuted ? 'mic-off' : 'mic'} 
                size={28} 
                color={isMuted ? '#EF4444' : '#FFFFFF'} 
              />
              <Text style={styles.controlLabel}>
                {isMuted ? 'Desmutar' : 'Mutar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.endCallButton}
              onPress={endCall}
            >
              <Ionicons name="call" size={32} color="#FFFFFF" />
              <Text style={styles.controlLabel}>Encerrar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, isVideoOff && styles.controlButtonActive]}
              onPress={toggleVideo}
            >
              <Ionicons 
                name={isVideoOff ? 'videocam-off' : 'videocam'} 
                size={28} 
                color={isVideoOff ? '#EF4444' : '#FFFFFF'} 
              />
              <Text style={styles.controlLabel}>
                {isVideoOff ? 'Ligar Vídeo' : 'Desligar Vídeo'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.infoText}>
            A chamada usa sua câmera e microfone. Certifique-se de estar em um local tranquilo.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D17',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.3)',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  participantCount: {
    fontSize: 14,
    color: '#94A3B8',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 24,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
    textAlign: 'center',
  },
  callInfo: {
    alignItems: 'center',
  },
  callInfoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
  },
  callInfoSubtext: {
    fontSize: 14,
    color: '#22C55E',
    marginTop: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 20,
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  endCallButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  controlLabel: {
    fontSize: 11,
    color: '#FFFFFF',
    marginTop: 6,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 18,
  },
});
