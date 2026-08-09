const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname)

// Bundle the bundled SQLite database as an app asset
config.resolver.assetExts.push('db', 'sqlite')
 
module.exports = withNativeWind(config, { input: './global.css' })