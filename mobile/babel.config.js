module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Required by react-native-vision-camera frame processors — transforms the
    // 'worklet' functions. Must be listed last.
    plugins: ['react-native-worklets-core/plugin'],
  };
};
