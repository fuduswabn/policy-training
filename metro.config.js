const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.alias = {
  '@': path.resolve(__dirname),
};

config.resolver.extraNodeModules = {
  convex: path.resolve(__dirname, 'node_modules/convex'),
};

module.exports = config;