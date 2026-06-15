const { execSync } = require('node:child_process');
const path = require('node:path');

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.clockwork.app',
  productName: 'Clockwork',
  copyright: 'Copyright © 2026 Clockwork',

  // No paid Apple Developer cert, so electron-builder skips signing (identity:null).
  // An unsigned app is rejected by Gatekeeper as "damaged" on Apple Silicon, so
  // ad-hoc sign the bundle (incl. unpacked native .node files) after packaging.
  // Users still see an "unidentified developer" prompt (right-click → Open) but the
  // app is no longer reported as damaged.
  afterPack: async (context) => {
    if (context.electronPlatformName !== 'darwin') return;
    const appName = context.packager.appInfo.productFilename;
    const appPath = path.join(context.appOutDir, `${appName}.app`);
    // Sign nested native addons first, then the app bundle (deep, ad-hoc).
    execSync(
      `find "${appPath}" -name '*.node' -exec codesign --force --sign - {} \\; ; ` +
        `codesign --force --deep --sign - "${appPath}"`,
      { stdio: 'inherit', shell: '/bin/bash' },
    );
  },

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
    // Tray icon (loaded at runtime via app.getAppPath()).
    'resources/tray-icon.png',
  ],

  // Bake the API URL into the packaged app.json at build time (read back at
  // runtime by src/main/config.ts). Set API_URL in CI (a repo variable) or
  // locally before running `pnpm package`; it is NOT hardcoded in source.
  extraMetadata: {
    main: 'dist-electron/apps/desktop/src/main/index.js',
    ...(process.env.API_URL ? { apiUrl: process.env.API_URL } : {}),
  },

  mac: {
    // Apple Silicon only — keeps the download small. The .zip is required by
    // electron-updater for auto-updates; the .dmg is the user-facing installer.
    target: [
      { target: 'dmg', arch: ['arm64'] },
      { target: 'zip', arch: ['arm64'] },
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
    // No custom installer icon shipped — electron-builder uses its default.
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
