module.exports = function (api) {
  api.cache(true);
  
  const plugins = [];

  // Production'da console.log'ları kaldır
  if (process.env.NODE_ENV === 'production') {
    plugins.push([
      'transform-remove-console',
      {
        exclude: ['error', 'warn'], // error ve warn'ları koru
      },
    ]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
