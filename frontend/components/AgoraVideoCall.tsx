import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RtcEngine, {
  RtcLocalView,
  RtcRemoteView,
  VideoRenderMode,
  ChannelProfile,
  ClientRole,
} from 'react-native-agora';

const { width, height } = Dimensions.get('window');

// Agora App ID - você precisará configurar isso
const AGORA_APP_ID = 'luxepass-app-id';

interface AgoraVideoCallProps {
  visible: boolean;
  channelName: string;
  userName: string;
  onClose: () => void;
  onCallEnded?: () => void;
}

export default function AgoraVideoCall({
  visible,
  channelName,
  userName,
  onClose,
  onCallEnded
}: AgoraVideoCallProps) {
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const engineRef = useRef<RtcEngine | null>(null);

  useEffect(() => {
    if (visible) {
      initAgora();
    }

    return () => {
      leaveChannel();
    };
  }, [visible]);

  const initAgora = async () => {
    try {
      // Initialize Agora engine
      const engine = await RtcEngine.create(AGORA_APP_ID);
      engineRef.current = engine;

      // Enable video
      await engine.enableVideo();
      
      // Set channel profile
      await engine.setChannelProfile(ChannelProfile.LiveBroadcasting);
      await engine.setClientRole(ClientRole.Broadcaster);

      // Register event listeners
      engine.addListener('UserJoined', (uid) => {
        console.log('UserJoined:', uid);
        setRemoteUid(uid);
      });

      engine.addListener('UserOffline', (uid) => {
        console.log('UserOffline:', uid);
        setRemoteUid(null);
      });

      engine.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
        console.log('JoinChannelSuccess:', channel, uid);
        setIsJoined(true);
      });

      // Join channel
      await engine.joinChannel(null, channelName, null, 0);

    } catch (error) {
      console.error('Error initializing Agora:', error);
      Alert.alert('Erro', 'Não foi possível iniciar a videochamada.');
      onClose();
    }
  };

  const leaveChannel = async () => {
    try {
      if (engineRef.current) {
        await engineRef.current.leaveChannel();
        await engineRef.current.destroy();
        engineRef.current = null;
        setIsJoined(false);
        setRemoteUid(null);
        if (onCallEnded) {
          onCallEnded();
        }
      }
    } catch (error) {
      console.error('Error leaving channel:', error);
    }
  };

  const toggleMute = async () => {
    if (engineRef.current) {
      await engineRef.current.muteLocalAudioStream(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = async () => {
    if (engineRef.current) {
      await engineRef.current.muteLocalVideoStream(!isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  const switchCamera = async () => {
    if (engineRef.current) {
      await engineRef.current.switchCamera();
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
            await leaveChannel();
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
        {/* Video Views */}
        <View style={styles.videoContainer}>
          {/* Remote Video (if someone joined) */}
          {remoteUid !== null ? (
            <RtcRemoteView.SurfaceView
              style={styles.remoteVideo}
              uid={remoteUid}
              channelId={channelName}
              renderMode={VideoRenderMode.Hidden}
            />
          ) : (
            <View style={styles.waitingContainer}>
              <Ionicons name="person-circle" size={100} color="#8B5CF6" />
              <Text style={styles.waitingText}>Aguardando participante...</Text>
            </View>
          )}

          {/* Local Video (small preview) */}
          {isJoined && !isVideoOff && (
            <View style={styles.localVideoContainer}>
              <RtcLocalView.SurfaceView
                style={styles.localVideo}
                channelId={channelName}
                renderMode={VideoRenderMode.Hidden}
              />
            </View>
          )}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <View style={styles.statusDot} />
            <Text style={styles.headerText}>
              {isJoined ? 'Chamada em Andamento' : 'Conectando...'}
            </Text>
          </View>
          <Text style={styles.channelName}>{channelName}</Text>
        </View>

        {/* Controls */}
        {isJoined && (
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
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.endCallButton}
              onPress={endCall}
            >
              <Ionicons name="call" size={32} color="#FFFFFF" />
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
            </TouchableOpacity>

            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={switchCamera}
              >
                <Ionicons name="camera-reverse" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.infoText}>
            Videochamada em tempo real com áudio e vídeo. Certifique-se de estar em um local tranquilo.
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
  videoContainer: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 24,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(11, 13, 23, 0.8)',
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
  channelName: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  controls: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  infoBox: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: '#E2E8F0',
    lineHeight: 16,
  },
});
