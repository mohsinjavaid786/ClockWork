# Clockwork — Production Deployment Guide

> How to get Clockwork running for a real team: API on Railway, admin portal on Vercel, desktop app distributed via GitHub Releases.

---

## Branch Strategy

```
feature/xyz ──► dev ──► production
                 │            │
                 │            └─ Vercel production URL
                 │            └─ Railway production API
                 │            └─ git tag v* → GitHub Releases (desktop)
                 │
                 └─ Vercel preview URL (per push)
                 └─ Railway staging API (optional)
```

| Branch | Purpose | Auto-deploys to |
|---|---|---|
| `production` | Stable releases | Vercel production · Railway production · GitHub Releases (on tag) |
| `dev` | Integration / staging | Vercel preview · Railway staging (optional) |
| `main` | Historical / reference | Vercel preview |
| `feature/*` | Work-in-progress | PR → `dev` |

### Day-to-day workflow

```bash
# 1. Work on a feature branch
git checkout dev
git checkout -b feature/my-feature
# ... make changes ...
git push origin feature/my-feature
# → open PR → dev (CI runs, must pass)

# 2. When dev is stable, merge to production
git checkout production
git merge dev
git push origin production
# → Vercel re-deploys production portal
# → Railway re-deploys production API

# 3. Tag to release the desktop app
git tag v1.2.0
git push origin production --tags
# → GitHub Actions builds .dmg + .exe + creates GitHub Release
```

### CI/CD at a glance

```
Push to dev / main / production
    └─ .github/workflows/ci.yml
       Builds API + admin portal + desktop renderer
       Must pass before merging

Push a v*.*.* tag (from production)
    └─ .github/workflows/release.yml
       macOS runner → Clockwork-*.dmg + .zip
       Windows runner → Clockwork Setup *.exe
       Creates GitHub Release → employees download here
       electron-updater auto-updates existing installs
```

---

## Architecture

```
Employees                 Admins
    │                        │
    │ downloads from         │ opens browser
    │ GitHub Releases        │ (Vercel URL)
    ▼                        ▼
┌──────────────┐      ┌──────────────────┐
│  Desktop App │      │  Admin Portal    │
│  (Electron)  │      │  (Next.js/Vercel)│
└──────┬───────┘      └────────┬─────────┘
       │                       │
       │  HTTPS REST           │  HTTPS REST
       └───────────┬───────────┘
                   ▼
         ┌──────────────────┐
         │  NestJS API      │
         │  (Railway/Render)│
         └────────┬─────────┘
                  │  Supabase JS
                  ▼
         ┌──────────────────┐
         │  Supabase        │
         │  (PostgreSQL +   │
         │   Auth + Storage)│
         └──────────────────┘
```

---

## Step 1 — Supabase (database + auth)

1. Create a project at [supabase.com](https://supabase.com) (free tier works)

2. In **SQL Editor**, run both migration files in order:
   ```
   supabase/migrations/001_initial.sql
   supabase/migrations/002_storage.sql
   ```

3. Under **Storage**, confirm a `screenshots` bucket exists. Set it to **Private**.

4. Under **Authentication → Settings**, ensure **Email** provider is enabled.

5. Copy from **Settings → API**:
   - `Project URL` → used as `SUPABASE_URL`
   - `service_role` key (secret) → used as `SUPABASE_SERVICE_ROLE_KEY`

6. Create your admin account via **Authentication → Users → Add user**. Then promote it:
   ```sql
   UPDATE public.users SET role = 'admin' WHERE email = 'you@yourcompany.com';
   ```

---

## Step 2 — Deploy the API (Railway)

The API is a standard Node.js app. Railway is the simplest host.

### Option A — Railway (recommended, free tier available)

1. Go to [railway.app](https://railway.app) → New project → Deploy from GitHub repo
2. Select the `clockwork` repo
3. Leave the **Root Directory** at the repo root (`/` — **do not** set it to `apps/api`).
   The API is a pnpm-workspace package: its `@clockwork/shared` dependency and the
   lockfile live at the repo root, so the build context must be the whole repo.
   The included [`railway.json`](../railway.json) tells Railway to build with
   `apps/api/Dockerfile` (which compiles `@clockwork/shared` then the API) and to
   health-check `/api/v1/config`. No Nixpacks / build-command setup is needed.
4. Under **Settings → Source → Branch**, set the deploy branch to **`production`**
5. Add environment variables under **Variables**:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ADMIN_URL=https://your-admin-portal.vercel.app
   NODE_ENV=production
   ```
   > Do **not** set `PORT` — Railway injects it automatically and the API reads
   > `process.env.PORT`. Hardcoding it can break Railway's port detection.
6. Copy the generated Railway URL (e.g. `https://clockwork-api.up.railway.app`) — you'll need it for the next steps.

### Option B — Docker (any container host)

A `Dockerfile` is included at `apps/api/Dockerfile`.

```bash
# Build the image from the monorepo root
docker build -f apps/api/Dockerfile -t clockwork-api .

# Run it
docker run -p 3001:3001 \
  -e SUPABASE_URL=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  -e ADMIN_URL=https://your-portal.vercel.app \
  clockwork-api
```

Works on Render, Fly.io, DigitalOcean, or any Docker host.

### Option C — Render

1. New Web Service → connect GitHub repo
2. Leave **Root Directory** at the repo root (not `apps/api` — same workspace reason as Railway)
3. Runtime: **Docker**, Dockerfile path: `apps/api/Dockerfile`
4. Add environment variables same as Railway above (no `PORT` — Render injects it)

---

## Step 3 — Deploy the Admin Portal (Vercel)

1. Go to [vercel.com](https://vercel.com) → New Project → Import `clockwork` from GitHub
2. In the **Configure Project** screen:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: set to **`apps/admin`** (Vercel usually auto-detects this).
     `vercel.json` paths (`outputDirectory: .next`) are relative to this root, so
     they must agree — if you instead leave the root at `.`, the build output won't
     be found (`apps/admin/apps/admin/.next` doubling error).
   - Leave **Build & Output Settings** overrides empty — `vercel.json` already sets
     the correct build/install commands and output directory.
3. After the project is created, go to **Settings → Git**:
   - Set **Production Branch** to **`production`**
   - The `dev` branch will auto-get preview deployments
5. Add **Environment Variables** in the Vercel dashboard (Settings → Environment Variables):
   ```
   NEXT_PUBLIC_API_URL = https://your-railway-api-url.up.railway.app
   ```
   Set this for **Production**, **Preview**, and **Development** environments.
   > Do NOT put this in `vercel.json` — the `@secret` syntax in that file requires
   > a Vercel secret to already exist, which causes deployments to fail.

6. Click **Deploy**

The admin portal will be live at `https://your-project.vercel.app` (production from `production` branch).
Preview URLs are auto-generated for every push to `dev` and other branches.

> **Custom domain:** In Vercel → Project → Settings → Domains, add your domain (e.g. `admin.yourcompany.com`).

> **After deploying**, update the API's `ADMIN_URL` variable on Railway to your Vercel URL. This controls the CORS allowed-origin header.

---

## Step 4 — Build and Distribute the Desktop App

Employees need a `.dmg` (macOS) or `.exe` (Windows) to install. These are built automatically via GitHub Actions and published to GitHub Releases.

### 4a — First release (one-time setup)

1. **Set the version** in `apps/desktop/package.json`:
   ```json
   { "version": "1.0.0" }
   ```

2. **Configure the API URL** — edit `apps/desktop/src/main/index.ts`:
   ```typescript
   // Change this line to your production API
   const API_BASE = process.env['API_URL'] ?? 'https://your-railway-api-url.up.railway.app';
   ```

3. Commit and tag:
   ```bash
   git add .
   git commit -m "chore: release v1.0.0"
   git tag v1.0.0
   git push origin main --tags
   ```

4. GitHub Actions automatically:
   - Builds `Clockwork-1.0.0.dmg` on a macOS runner
   - Builds `Clockwork Setup 1.0.0.exe` on a Windows runner
   - Creates a GitHub Release at `https://github.com/mohsinjavaid786/clockwork/releases`
   - Uploads both installers + update manifests (`latest.yml`, `latest-mac.yml`)

### 4b — Share the download link with employees

Send your team this link:
```
https://github.com/mohsinjavaid786/clockwork/releases/latest
```

Or link directly to the assets:
```
macOS:   https://github.com/mohsinjavaid786/clockwork/releases/latest/download/Clockwork-1.0.0.dmg
Windows: https://github.com/mohsinjavaid786/clockwork/releases/latest/download/Clockwork+Setup+1.0.0.exe
```

> **Tip:** Add a `/downloads` page to the admin portal that links to the latest GitHub Release. Or embed the links in an onboarding email.

### 4c — Releasing updates

```bash
# 1. Bump version in apps/desktop/package.json
#    e.g. "version": "1.1.0"

# 2. Commit, tag, and push
git add apps/desktop/package.json
git commit -m "chore: release v1.1.0"
git tag v1.1.0
git push origin main --tags
```

GitHub Actions builds the new installers and publishes the release automatically. Existing users with the app installed will be **notified and updated automatically** on next launch (via `electron-updater`).

---

## Step 5 — Verify everything works

After all three services are deployed:

1. **Admin portal**: open your Vercel URL → log in with your Supabase admin credentials
2. **API**: open `https://your-api.up.railway.app/api/docs` → Swagger UI should load
3. **Desktop**: download and install from the GitHub Release → log in with your Supabase credentials → start a timer → verify it appears in the admin portal

---

## Environment Variables Reference

### API (Railway / Docker)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (server-side only, never expose) |
| `PORT` | — | Listen port (default: `3001`) |
| `ADMIN_URL` | ✅ | Vercel URL for CORS (e.g. `https://your-app.vercel.app`) |
| `NODE_ENV` | — | Set to `production` |

### Admin portal (Vercel)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Full API URL (e.g. `https://clockwork-api.up.railway.app`) |

### Desktop app (hardcoded in build)

The desktop app's API URL is compiled into the binary. Update `API_BASE` in `src/main/index.ts` before building:
```typescript
const API_BASE = process.env['API_URL'] ?? 'https://your-api-url.up.railway.app';
```

---

## CI / CD Summary

```
Every push to main
        │
        └─ .github/workflows/ci.yml
           Builds API + admin + desktop renderer
           Fails fast if any build breaks

Push a version tag (v*.*.*)
        │
        └─ .github/workflows/release.yml
           ├─ macOS runner → builds .dmg + .zip
           ├─ Windows runner → builds .exe
           └─ Creates GitHub Release with all installers
              └─ electron-updater detects new release on next app launch
```

---

## Code Signing (optional but recommended for production)

Without code signing, users see OS security warnings on first install. For a polished experience:

### macOS code signing

1. Enrol in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
2. Create a **Developer ID Application** certificate in Xcode
3. Export the certificate as `.p12` and base64-encode it:
   ```bash
   base64 -i certificate.p12 | pbcopy
   ```
4. Add to GitHub Secrets:
   - `CSC_LINK` — the base64-encoded `.p12`
   - `CSC_KEY_PASSWORD` — the certificate password
   - `APPLE_ID` — your Apple ID email
   - `APPLE_APP_SPECIFIC_PASSWORD` — app-specific password from [appleid.apple.com](https://appleid.apple.com)
   - `APPLE_TEAM_ID` — your 10-character team ID
5. Update the macOS build step in `.github/workflows/release.yml`:
   ```yaml
   env:
     CSC_LINK: ${{ secrets.CSC_LINK }}
     CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
     APPLE_ID: ${{ secrets.APPLE_ID }}
     APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
     APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
   ```

### Windows code signing

1. Purchase a Code Signing Certificate from DigiCert, Sectigo, or similar CA
2. Export as `.p12`, base64-encode it
3. Add to GitHub Secrets:
   - `WIN_CSC_LINK` — base64-encoded `.p12`
   - `WIN_CSC_KEY_PASSWORD` — password
4. Update the Windows build step in the release workflow:
   ```yaml
   env:
     WIN_CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
     WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
   ```

> Without code signing the app works fine — users just need to click through the OS warning once. Add signing when you're ready to roll out to a larger team.

---

## Updating the production API URL in the desktop app

The desktop app's API URL is baked into the build. When you change hosting:

1. Edit `apps/desktop/src/main/index.ts`:
   ```typescript
   const API_BASE = process.env['API_URL'] ?? 'https://new-api-url.up.railway.app';
   ```
2. Bump the version in `apps/desktop/package.json`
3. Tag and push → GitHub Actions builds and releases the new version
4. Existing users auto-update on next launch

---

## Monitoring

| What to monitor | Where |
|---|---|
| API health | `GET /api/v1/config` — should return 200 |
| API logs | Railway dashboard → Deployments → Logs |
| Admin portal | Vercel dashboard → Deployments |
| Supabase | Supabase dashboard → Logs & Observability |
| Desktop errors | GitHub Releases → download count shows adoption |
