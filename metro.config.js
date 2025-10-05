const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure that all file extensions are supported
config.resolver.assetExts.push(
  // Adds support for `.db` files for SQLite databases
  'db',
  'mp3',
  'ttf',
  'obj',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg'
);

module.exports = config;
