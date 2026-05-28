/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.clockwork.app',
  productName: 'Clockwork',
  copyright: 'Copyright © 2024 Clockwork',
  directories: {
    output: 'release',
    buildResources: 'resources',
  },
  files: ['dist-electron/**/*', 'dist-renderer/**/*'],
  mac: {
    target: ['dmg', 'zip'],
    category: 'public.app-category.productivity',
    darkModeSupport: true,
  },
  win: {
    target: ['nsis'],
  },
  linux: {
    target: ['AppImage'],
  },
  publish: {
    provider: 'github',
    owner: 'mohsinjavaid786',
    repo: 'clockwork',
  },
};
