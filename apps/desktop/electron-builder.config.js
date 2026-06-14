/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.clockwork.app',
  productName: 'Clockwork',
  copyright: 'Copyright © 2026 Clockwork',

  // uiohook-napi and active-win ship prebuilt N-API binaries (ABI-stable across
  // Node/Electron), so skip electron-builder's source rebuild — it otherwise runs
  // `npm rebuild` and fails (active-win needs Xcode/CLT to compile from source).
  npmRebuild: false,
  // Native .node addons must live outside the asar so they can be loaded at runtime.
  asarUnpack: ['**/*.node'],

  directories: {
    output: 'release',
    buildResources: 'resources',
  },

  // Files included in the packaged app
  files: [
    'dist-electron/**/*',
    'dist-renderer/**/*',
    // Bundle the native trackers' prebuilt binaries explicitly (optionalDependencies).
    'node_modules/uiohook-napi/**/*',
    'node_modules/active-win/**/*',
  ],

  // Inject production API URL via env var at build time.
  // Set API_URL in CI secrets or locally before running `pnpm package`.
  extraMetadata: {
    main: 'dist-electron/apps/desktop/src/main/index.js',
  },

  mac: {
    target: [
      { target: 'dmg', arch: ['x64', 'arm64'] },
      { target: 'zip', arch: ['x64', 'arm64'] },
    ],
    category: 'public.app-category.productivity',
    darkModeSupport: true,
    // Code signing — set CSC_LINK + CSC_KEY_PASSWORD env vars to enable.
    // Without these the app still works; macOS shows an unsigned-app warning.
    identity: null,
  },

  dmg: {
    title: '${productName} ${version}',
    contents: [
      { x: 410, y: 150, type: 'link', path: '/Applications' },
      { x: 130, y: 150, type: 'file' },
    ],
  },

  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
    ],
    // Code signing — set WIN_CSC_LINK + WIN_CSC_KEY_PASSWORD env vars to enable.
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'resources/tray-icon.ico',
    uninstallerIcon: 'resources/tray-icon.ico',
  },

  linux: {
    target: ['AppImage'],
    category: 'Utility',
  },

  // GitHub Releases publisher — used by electron-updater for auto-updates.
  // Requires GH_TOKEN env var. The release workflow passes GITHUB_TOKEN automatically.
  publish: {
    provider: 'github',
    owner: 'mohsinjavaid786',
    repo: 'clockwork',
    releaseType: 'release',
  },
};
