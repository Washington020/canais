import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AgoraVideoCallProps {
  visible: boolean;
  channelName: string;
  userName: string;
  onClose: () => void;
  onCallEnded?: () => void;
}

// Web version with WebRTC support
export default function AgoraVideoCall({ visible, channelName, userName, onClose, onCallEnded }: AgoraVideoCallProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (visible) {
      // Cleanup on unmount or when modal closes
      return () => {
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [visible, localStream]);

  if (!visible) return null;

  const handleConnect = async () => {
    try {
      setError('');
      console.log(`🎥 Conectando ao canal: ${channelName} como ${userName}`);
      
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setLocalStream(stream);
      
      // Display local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play();
      }
      
      setIsConnected(true);
      console.log('✅ Câmera e microfone conectados!');
      
    } catch (err: any) {
      console.error('❌ Erro ao acessar câmera/microfone:', err);
      setError(`Erro: ${err.message || 'Não foi possível acessar câmera/microfone'}`);
    }
  };

  const handleDisconnect = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setIsConnected(false);
    if (onCallEnded) onCallEnded();
    onClose();
  };
  
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };
  
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.channelName}>Videochamada: {channelName}</Text>
          <TouchableOpacity onPress={handleDisconnect} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Video Area */}
        <View style={styles.videoContainer}>
          {!isConnected ? (
            <View style={styles.waitingContainer}>
              <Ionicons name="videocam-off" size={64} color="#64748B" />
              <Text style={styles.waitingTitle}>Pronto para Videochamada</Text>
              <Text style={styles.waitingText}>
                Permita acesso à câmera e microfone para iniciar
              </Text>
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                  <Text style={styles.errorSubtext}>
                    Verifique as permissões do navegador
                  </Text>
                </View>
              )}
              <Text style={styles.infoText}>
                🎥 Videochamada Web com WebRTC
              </Text>
              <Text style={styles.infoSubtext}>
                Funciona em qualquer navegador moderno
              </Text>
            </View>
          ) : (
            <View style={styles.videoArea}>
              {/* Local Video */}
              <View style={styles.localVideoWrapper}>
                <video 
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 12,
                    backgroundColor: '#1E293B'
                  }}
                />
                <View style={styles.videoLabel}>
                  <Text style={styles.videoLabelText}>Você</Text>
                </View>
              </View>
              
              {/* Remote Video Placeholder */}
              <View style={styles.remoteVideoWrapper}>
                <video 
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 12,
                    backgroundColor: '#0F172A'
                  }}
                />
                <View style={styles.waitingRemote}>
                  <Ionicons name="person" size={48} color="#64748B" />
                  <Text style={styles.waitingRemoteText}>
                    Aguardando outro participante...
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {!isConnected ? (
            <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
              <Ionicons name="videocam" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Conectar</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.controlsRow}>
                <TouchableOpacity 
                  style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                  onPress={toggleMute}
                >
                  <Ionicons 
                    name={isMuted ? "mic-off" : "mic"} 
                    size={24} 
                    color={isMuted ? "#EF4444" : "#FFFFFF"} 
                  />
                  <Text style={styles.controlLabel}>
                    {isMuted ? "Desmutar" : "Mutar"}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.controlButton, isVideoOff && styles.controlButtonActive]}
                  onPress={toggleVideo}
                >
                  <Ionicons 
                    name={isVideoOff ? "videocam-off" : "videocam"} 
                    size={24} 
                    color={isVideoOff ? "#EF4444" : "#FFFFFF"} 
                  />
                  <Text style={styles.controlLabel}>
                    {isVideoOff ? "Ligar Vídeo" : "Desligar Vídeo"}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity style={styles.endButton} onPress={handleDisconnect}>
                <Ionicons name="call" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Encerrar Chamada</Text>
              </TouchableOpacity>
            </>
          )}
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
    padding: 20,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  channelName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  waitingContainer: {
    alignItems: 'center',
    maxWidth: 400,
  },
  waitingTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  waitingText: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  infoText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 20,
  },
  infoSubtext: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  connectedContainer: {
    alignItems: 'center',
    maxWidth: 500,
  },
  connectedTitle: {
    color: '#22C55E',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 20,
  },
  connectedText: {
    color: '#E2E8F0',
    fontSize: 16,
    marginBottom: 8,
  },
  statusBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginTop: 30,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusText: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusSubtext: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
  },
  controls: {
    padding: 20,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
  },
  controlLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  connectButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
