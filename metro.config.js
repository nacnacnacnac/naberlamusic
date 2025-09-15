const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Production'da console.log'ları kaldır (babel.config.js ile hallediliyor)

// Web için Expo Vector Icons font'larını devre dışı bırak
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Web build için font asset'lerini filtrele
if (process.env.EXPO_PLATFORM === 'web') {
  config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'ttf');
}

module.exports = config;
