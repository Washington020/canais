import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Peer from 'peerjs';

interface AgoraVideoCallProps {
  visible: boolean;
  channelName: string;
  userName: string;
  onClose: () => void;
  onCallEnded?: () => void;
}

// VIDEOCHAMADA REAL COM PEERJS
export default function AgoraVideoCall({ visible, channelName, userName, onClose, onCallEnded }: AgoraVideoCallProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerConnected, setRemotePeerConnected] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const currentCallRef = useRef<any>(null);

  useEffect(() => {
    if (visible && isConnected) {
      // Verificar a cada 5 segundos se há outro peer no canal
      const checkInterval = setInterval(() => {
        if (peerRef.current && !remotePeerConnected) {
          tryConnectToRemotePeer();
        }
      }, 5000);

      return () => clearInterval(checkInterval);
    }
  }, [visible, isConnected, remotePeerConnected]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);
  
  const cleanup = () => {
    console.log('🧹 Limpando recursos...');
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    if (currentCallRef.current) {
      currentCallRef.current.close();
      currentCallRef.current = null;
    }
    
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    
    setRemoteStream(null);
    setIsConnected(false);
    setRemotePeerConnected(false);
  };

  const tryConnectToRemotePeer = () => {
    if (!peerRef.current || !localStream) return;
    
    // Gerar ID do outro peer baseado no canal
    // Se meu ID termina com -1, o outro termina com -2 e vice-versa
    const myNumber = peerId.endsWith('-1') ? '1' : '2';
    const otherNumber = myNumber === '1' ? '2' : '1';
    const remotePeerId = channelName.replace(/[^a-zA-Z0-9]/g, '_') + '-' + otherNumber;
    
    console.log(`🔄 Tentando conectar com peer: ${remotePeerId}`);
    
    try {
      const call = peerRef.current.call(remotePeerId, localStream);
      
      if (call) {
        currentCallRef.current = call;
        
        call.on('stream', (remoteStreamReceived) => {
          console.log('✅ Stream remoto recebido!');
          setRemoteStream(remoteStreamReceived);
          setRemotePeerConnected(true);
          
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamReceived;
            remoteVideoRef.current.play();
          }
        });
        
        call.on('close', () => {
          console.log('❌ Chamada encerrada pelo outro peer');
          setRemoteStream(null);
          setRemotePeerConnected(false);
        });
      }
    } catch (err) {
      console.log('⚠️ Peer ainda não está disponível, tentando novamente...');
    }
  };

  const handleConnect = async () => {
    try {
      setError('');
      console.log(`🎥 Conectando ao canal: ${channelName}`);
      
      // Solicitar câmera e microfone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 },
        audio: true 
      });
      
      setLocalStream(stream);
      
      // Exibir vídeo local
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play();
      }
      
      // Criar Peer com ID baseado no canal + timestamp
      const cleanChannelName = channelName.replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = Date.now();
      const myPeerId = `${cleanChannelName}-${timestamp % 2 === 0 ? '1' : '2'}`;
      
      console.log(`🆔 Meu Peer ID: ${myPeerId}`);
      setPeerId(myPeerId);
      
      // Inicializar PeerJS (usando servidor público)
      const peer = new Peer(myPeerId, {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        debug: 2
      });
      
      peerRef.current = peer;
      
      peer.on('open', (id) => {
        console.log('✅ Peer conectado! ID:', id);
        setIsConnected(true);
        
        // Tentar conectar ao outro peer imediatamente
        setTimeout(() => {
          tryConnectToRemotePeer();
        }, 2000);
      });
      
      // Receber chamadas de outros peers
      peer.on('call', (call) => {
        console.log('📞 Recebendo chamada de:', call.peer);
        
        // Responder com meu stream
        call.answer(stream);
        currentCallRef.current = call;
        
        call.on('stream', (remoteStreamReceived) => {
          console.log('✅ Stream remoto recebido (chamada recebida)!');
          setRemoteStream(remoteStreamReceived);
          setRemotePeerConnected(true);
          
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamReceived;
            remoteVideoRef.current.play();
          }
        });
        
        call.on('close', () => {
          console.log('❌ Chamada encerrada');
          setRemoteStream(null);
          setRemotePeerConnected(false);
        });
      });
      
      peer.on('error', (err) => {
        console.error('❌ Erro no Peer:', err);
        setError(`Erro de conexão: ${err.type}`);
      });
      
    } catch (err: any) {
      console.error('❌ Erro ao acessar câmera/microfone:', err);
      setError(`Erro: ${err.message || 'Não foi possível acessar câmera/microfone. Verifique as permissões do navegador.'}`);
    }
  };

  const handleDisconnect = () => {
    cleanup();
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

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.channelName}>Consulta Online: {userName}</Text>
          <TouchableOpacity onPress={handleDisconnect} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Video Area */}
        <View style={styles.videoContainer}>
          {!isConnected ? (
            <View style={styles.waitingContainer}>
              <Ionicons name="videocam-off" size={64} color="#64748B" />
              <Text style={styles.waitingTitle}>Pronto para Consulta Online</Text>
              <Text style={styles.waitingText}>
                Permita acesso à câmera e microfone para iniciar
              </Text>
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <Text style={styles.infoText}>
                🎥 Videochamada Real com WebRTC
              </Text>
              <Text style={styles.infoSubtext}>
                Você e o profissional vão se ver em tempo real
              </Text>
            </View>
          ) : (
            <View style={styles.videoArea}>
              {/* Remote Video (Maior) */}
              <View style={styles.remoteVideoWrapper}>
                {remoteStream ? (
                  <>
                    <video 
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        backgroundColor: '#0F172A'
                      }}
                    />
                    <View style={styles.videoLabel}>
                      <Text style={styles.videoLabelText}>Profissional</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.waitingRemote}>
                    <Ionicons name="person" size={48} color="#64748B" />
                    <Text style={styles.waitingRemoteText}>
                      Aguardando profissional entrar...
                    </Text>
                    <Text style={styles.peerId}>Canal: {channelName}</Text>
                  </View>
                )}
              </View>
              
              {/* Local Video (Menor - PiP) */}
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
                <View style={styles.videoLabelLocal}>
                  <Text style={styles.videoLabelText}>Você</Text>
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
              <Text style={styles.buttonText}>Conectar e Entrar</Text>
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
                    {isMuted ? "Ativar Mic" : "Mutar"}
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
                    {isVideoOff ? "Ligar Vídeo" : "Desligar"}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {remotePeerConnected && (
                <View style={styles.connectedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={styles.connectedText}>Conectado com profissional!</Text>
                </View>
              )}
              
              <TouchableOpacity style={styles.endButton} onPress={handleDisconnect}>
                <Ionicons name="call" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Encerrar Consulta</Text>
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
    flex: 1,
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
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    maxWidth: 350,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  infoText: {
    color: '#22C55E',
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
  videoArea: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  remoteVideoWrapper: {
    flex: 1,
    width: '100%',
    position: 'relative',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    overflow: 'hidden',
  },
  localVideoWrapper: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 150,
    height: 200,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#334155',
  },
  videoLabel: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  videoLabelLocal: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  videoLabelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  waitingRemote: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  waitingRemoteText: {
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  peerId: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
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
    marginBottom: 16,
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    minWidth: 80,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  controlLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  connectedText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
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
