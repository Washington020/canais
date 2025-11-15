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
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://fit-scheduler-11.preview.emergentagent.com';

interface WebRTCVideoCallProps {
  visible: boolean;
  appointmentId: string;
  roomId: string;
  userName: string;
  userType: 'client' | 'professional';
  onClose: () => void;
  onCallEnded?: () => void;
}

export default function WebRTCVideoCall({
  visible,
  appointmentId,
  roomId,
  userName,
  userType,
  onClose,
  onCallEnded
}: WebRTCVideoCallProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [callStatus, setCallStatus] = useState<string>('waiting');
  
  // WebRTC refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // WebRTC configuration
  const rtcConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    if (visible && roomId) {
      initializeCall();
    }
    
    return () => {
      cleanup();
    };
  }, [visible, roomId]);

  const initializeCall = async () => {
    try {
      setIsConnecting(true);
      
      // Connect to WebSocket - use the backend URL
      const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
      const socketConnection = io(wsUrl, {
        transports: ['websocket'],
        forceNew: true,
      });

      setSocket(socketConnection);

      // Set up socket event listeners
      socketConnection.on('connected', () => {
        console.log('✅ Connected to WebSocket');
        setIsConnected(true);
        joinRoom();
      });

      socketConnection.on('room_joined', (data) => {
        console.log('✅ Joined room:', data);
        setIsInCall(true);
        setIsConnecting(false);
        initializeWebRTC();
      });

      socketConnection.on('user_joined', (data) => {
        console.log('👤 User joined:', data);
        setParticipantCount(prev => prev + 1);
      });

      socketConnection.on('user_left', (data) => {
        console.log('👋 User left:', data);
        setParticipantCount(prev => Math.max(0, prev - 1));
      });

      socketConnection.on('webrtc_offer', async (data) => {
        console.log('📞 Received offer from:', data.from_sid);
        await handleOffer(data.offer, data.from_sid);
      });

      socketConnection.on('webrtc_answer', async (data) => {
        console.log('📞 Received answer from:', data.from_sid);
        await handleAnswer(data.answer);
      });

      socketConnection.on('webrtc_ice_candidate', async (data) => {
        console.log('🧊 Received ICE candidate from:', data.from_sid);
        await handleIceCandidate(data.candidate);
      });

      socketConnection.on('call_ended', (data) => {
        console.log('📞 Call ended:', data);
        Alert.alert('Chamada Encerrada', data.message);
        handleCallEnd();
      });

      socketConnection.on('call_status_update', (data) => {
        console.log('📊 Call status update:', data);
        setCallStatus(data.status);
      });

      socketConnection.on('error', (error) => {
        console.error('❌ Socket error:', error);
        Alert.alert('Erro', error.message || 'Erro de conexão');
      });

      socketConnection.on('disconnect', () => {
        console.log('🔌 Disconnected from WebSocket');
        setIsConnected(false);
      });

    } catch (error) {
      console.error('❌ Error initializing call:', error);
      Alert.alert('Erro', 'Não foi possível inicializar a videochamada');
      setIsConnecting(false);
      onClose();
    }
  };

  const joinRoom = () => {
    if (socket) {
      socket.emit('join_call', {
        room_id: roomId,
        user_id: userName,
        user_type: userType,
      });
    }
  };

  const initializeWebRTC = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      
      // Display local video (for web)
      if (Platform.OS === 'web' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection(rtcConfiguration);
      peerConnectionRef.current = peerConnection;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('📺 Received remote stream');
        remoteStreamRef.current = event.streams[0];
        
        if (Platform.OS === 'web' && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('webrtc_ice_candidate', {
            room_id: roomId,
            candidate: event.candidate,
          });
        }
      };

      // Connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setCallStatus('connected');
        } else if (peerConnection.connectionState === 'disconnected') {
          setCallStatus('disconnected');
        }
      };

    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
      Alert.alert('Erro', 'Não foi possível acessar câmera e microfone');
    }
  };

  const createOffer = async () => {
    if (peerConnectionRef.current && socket) {
      try {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        
        socket.emit('webrtc_offer', {
          room_id: roomId,
          offer: offer,
        });
      } catch (error) {
        console.error('❌ Error creating offer:', error);
      }
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, fromSid: string) => {
    if (peerConnectionRef.current && socket) {
      try {
        await peerConnectionRef.current.setRemoteDescription(offer);
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        
        socket.emit('webrtc_answer', {
          room_id: roomId,
          answer: answer,
          target_sid: fromSid,
        });
      } catch (error) {
        console.error('❌ Error handling offer:', error);
      }
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (peerConnectionRef.current) {
      try {
        await peerConnectionRef.current.setRemoteDescription(answer);
      } catch (error) {
        console.error('❌ Error handling answer:', error);
      }
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (peerConnectionRef.current) {
      try {
        await peerConnectionRef.current.addIceCandidate(candidate);
      } catch (error) {
        console.error('❌ Error handling ICE candidate:', error);
      }
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
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
          onPress: handleCallEnd
        }
      ]
    );
  };

  const handleCallEnd = async () => {
    try {
      // End call via API
      const response = await fetch(`${BACKEND_URL}/api/video-call/end?appointment_id=${appointmentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${''}`, // TODO: get token
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ Call ended successfully');
      }
    } catch (error) {
      console.error('❌ Error ending call:', error);
    }

    cleanup();
    if (onCallEnded) {
      onCallEnded();
    }
    onClose();
  };

  const cleanup = () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Disconnect socket
    if (socket) {
      socket.emit('leave_call', { room_id: roomId });
      socket.disconnect();
      setSocket(null);
    }

    // Reset states
    setIsConnecting(false);
    setIsConnected(false);
    setIsInCall(false);
    setParticipantCount(0);
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
            <View style={[styles.statusDot, { 
              backgroundColor: isConnected ? '#22C55E' : '#EF4444' 
            }]} />
            <Text style={styles.headerText}>
              {isConnecting ? 'Conectando...' : 
               isInCall ? 'Videochamada Ativa' : 'Aguardando...'}
            </Text>
          </View>
          <Text style={styles.participantCount}>
            👤 {participantCount + 1}
          </Text>
        </View>

        {/* Video Container */}
        <View style={styles.videoContainer}>
          {Platform.OS === 'web' ? (
            <View style={styles.videoWrapper}>
              {/* Remote Video */}
              <video
                ref={remoteVideoRef}
                style={styles.remoteVideo}
                autoPlay
                playsInline
              />
              
              {/* Local Video */}
              <video
                ref={localVideoRef}
                style={styles.localVideo}
                autoPlay
                playsInline
                muted
              />
            </View>
          ) : (
            <View style={styles.videoPlaceholder}>
              <Ionicons name="videocam" size={64} color="#8B5CF6" />
              <Text style={styles.videoPlaceholderText}>
                {isConnecting ? 'Conectando...' : 
                 isInCall ? 'Videochamada Ativa' : 'Aguardando conexão...'}
              </Text>
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

        {/* Status Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.infoText}>
            Videochamada WebRTC P2P - Status: {callStatus}
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
    backgroundColor: '#1E293B',
  },
  videoWrapper: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  localVideo: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 8,
    objectFit: 'cover',
    border: '2px solid #8B5CF6',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  videoPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 24,
    textAlign: 'center',
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