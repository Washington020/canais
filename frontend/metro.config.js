const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Optimize for container environment
config.maxWorkers = 2;
config.resolver.platforms = ['native', 'web', 'ios', 'android'];
config.server.port = 8081;

// Fix potential caching issues
config.resolver.assetExts.push('db');

module.exports = config;
