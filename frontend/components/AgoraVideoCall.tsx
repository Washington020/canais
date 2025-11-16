import React from 'react';
import { Platform } from 'react-native';

// Platform-specific import
let AgoraVideoCall: any;

if (Platform.OS === 'web') {
  // Web version
  AgoraVideoCall = require('./AgoraVideoCall.web').default;
} else {
  // Native version (iOS/Android)
  AgoraVideoCall = require('./AgoraVideoCall.native').default;
}

export default AgoraVideoCall;
