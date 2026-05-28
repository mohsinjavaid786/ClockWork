/** @type {import('electron-builder').Configuration} */
const config = {
  appId: 'com.yourcompany.trackdesk',
  productName: 'TrackDesk',
  copyright: 'Copyright © 2024',
  directories: {
    output: 'release',
    buildResources: 'resources',
  },
  files: [
    'dist-electron/**/*',
    'dist-renderer/**/*',
    'resources/**/*',
  ],
  extraResources: [
    {
      from: 'node_modules/sharp',
      to: 'sharp',
      filter: ['**/*'],
    },
    {
      from: 'node_modules/uiohook-napi',
      to: 'uiohook-napi',
      filter: ['**/*'],
    },
  ],
  mac: {
    target: [
      { target: 'dmg', arch: ['x64', 'arm64'] },
      { target: 'zip', arch: ['x64', 'arm64'] },
    ],
    category: 'public.app-category.productivity',
    hardenedRuntime: true,
    gatekeeperAssess: false,
  },
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
  },
  publish: {
    provider: 'github',
    releaseType: 'release',
  },
};

module.exports = config;
