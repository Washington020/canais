import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AgoraVideoCallProps {
  visible: boolean;
  channelName: string;
  userName: string;
  onClose: () => void;
  onCallEnded?: () => void;
}

// Web version - not supported
export default function AgoraVideoCall(props: AgoraVideoCallProps) {
  if (!props.visible) return null;
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Videochamada disponível apenas no app móvel
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0D17',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
