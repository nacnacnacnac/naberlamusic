module.exports = function (api) {
  api.cache(true);
  
  const plugins = [
    'react-native-worklets/plugin', // Must be last
  ];

  // Production'da console.log'ları kaldır
  if (process.env.NODE_ENV === 'production') {
    plugins.unshift([
      'transform-remove-console',
      {
        exclude: ['error', 'warn'], // error ve warn'ları koru
      },
    ]);
  }

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: undefined,
          jsxRuntime: 'automatic',
        },
      ],
    ],
    plugins,
  };
};
