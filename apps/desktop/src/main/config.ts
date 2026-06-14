// Single source of truth for the API base URL.
//
// Packaged builds have NO environment variables and tsc does not inline
// process.env, so the fallback MUST be the production API — otherwise the app
// silently talks to localhost and every request (login, screenshot upload, …)
// fails with nothing on screen. Dev overrides this with API_URL=... (see the
// desktop dev notes in DEPLOYMENT.md).
export const API_BASE =
  process.env['API_URL'] ?? 'https://api-production-50cc.up.railway.app';
