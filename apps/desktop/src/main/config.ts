import fs from 'fs';
import path from 'path';
import { app } from 'electron';

// API base URL — resolved dynamically, never hardcoded in source.
//
// Resolution order:
//   1. API_URL environment variable — used in dev (`API_URL=… pnpm --filter desktop dev`).
//   2. Value injected at build time via electron-builder `extraMetadata.apiUrl`
//      (electron-builder reads it from the API_URL env / CI variable when
//      packaging and writes it into the packaged package.json). This is how the
//      production URL reaches a packaged build without living in the codebase.
//   3. localhost dev default — only hit when nothing above is set.
function resolveApiBase(): string {
  const fromEnv = process.env['API_URL'];
  if (fromEnv) return fromEnv;

  try {
    const pkgPath = path.join(app.getAppPath(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { apiUrl?: string };
    if (pkg.apiUrl) return pkg.apiUrl;
  } catch {
    // Not packaged, or no value injected — fall through to the dev default.
  }

  return 'http://localhost:3001';
}

export const API_BASE = resolveApiBase();
