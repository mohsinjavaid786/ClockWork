# Security

Report vulnerabilities privately through this repository's **Security → Report a vulnerability** page. Do not post credentials, employee screenshots, or personal data in public issues.

## Deployment requirements

Public source code is safe only when credentials stay in deployment secrets and the deployed access controls match the source. A clean secret scan does not prove a running installation is secure.

1. **Apply `supabase/migrations/009_api_only_access.sql` to every hosted database.** Run `supabase db push` from a linked, trusted local checkout, or run that migration in the Supabase SQL editor. This closes direct database access that could bypass the API's role and active-account checks. It also removes direct screenshot storage policies. The browser uses Supabase only for Auth password recovery; application data goes through the API. Existing service-role API access continues to work.
2. Deploy the updated API and admin app. `dev` and `production` were behind `main` at the November 15, 2026 review; ensure your host builds the hardened revision rather than an older branch. The source update alone does not apply SQL migrations.
3. In the **hosted Supabase Auth settings**, disable public signup for this invite-only app, require strong passwords (12 or more characters), enable secure password changes, and restrict redirect URLs to the actual portal's password-reset path. The committed `config.toml` governs local Supabase and is not evidence that hosted settings changed.
4. Set `TRUST_PROXY_HOPS` to the verified number of reverse proxies in front of the API. Leave it at `0` for direct access. Do not blindly trust arbitrary forwarded IP headers. The API's in-memory rate limiter is per process; multiple replicas also need a shared edge rate limit.
5. Verify a signed-in member cannot call admin endpoints or update `public.users` through Supabase REST. A deactivated account must not read application data. Confirm the screenshots bucket is private; only the API should issue signed screenshot URLs. Previously issued URLs remain usable until their expiry (currently one hour).

The database permission test is in `supabase/tests/api_boundary.sql`. Run it after migration with an administrative SQL connection. `bootstrap.sql` is **only** for a disposable test database; never run it in production.

## Secrets

- Only placeholder values belong in `.env.example`. Real `.env` variants, private keys, local settings, logs and build output must stay out of Git and Docker contexts.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, Resend credentials and Slack webhooks on the API server or in GitHub Actions secrets. Never use a `NEXT_PUBLIC_` variable for these values or embed them in Electron installers.
- The Supabase URL and **anon/publishable** key are public configuration, not service credentials. Their safety depends on the database access boundary above.
- If any real secret is ever committed, revoke or rotate it immediately. Removing a file or rewriting Git history does not revoke copies already downloaded.
- CI scans full Git history with Gitleaks and checks production dependency advisories. Dependabot checks npm and Actions updates weekly. GitHub secret scanning and push protection must remain enabled.

## Desktop limitations

The source now uses Electron 45.3.2 and updated desktop packaging tools. Existing published installers still contain their original runtime until a new release is built and distributed. Sign/notarize installers before treating desktop distribution as production hardened; the current configuration uses ad-hoc macOS signing.

The desktop stores its session in a local JSON file; it is not encrypted at rest. Use separate OS accounts and encrypted disks on managed devices. The portal stores a bearer token in browser local storage, so protecting against script injection and keeping dependencies current is essential.

## Review on November 15, 2026

- Gitleaks found no secrets in 147 scanned commits across fetched branches/tags. A separate pattern scan checked 677 historical text blobs. Only `.env.example` files were tracked.
- Public portal bundles fetched during the review contained no Gitleaks findings. The Railway API origin embedded in that portal returned HTTP 404 for health, config, users, screenshots and API docs, so live API authorization could not be verified there.
- API tests cover screenshot ownership, unsafe webhook destinations, redirect handling and password-reset rate limits. A disposable PostgreSQL-compatible database verified the SQL permission boundary.
- Production dependency audit passed with zero reported vulnerabilities after updating the lockfile. The full dependency audit has no high or critical findings. Two moderate tooling advisories (`glob` and `minimatch`) and one low tooling advisory (`deepmerge`, whose advertised fix was not published in the registry during this review) remain for follow-up.
- API/admin/desktop source builds and admin type checking passed. A macOS ARM64 application bundle was built and its active-win/uiohook native modules loaded under Electron 45.3.2. Local signing initially encountered Finder metadata; removing only FinderInfo/ResourceFork metadata from the generated bundle allowed ad-hoc signing. Full timer/screenshot behavior, Windows packaging, published installers, hosted Supabase settings, stored employee data and deployed database policies were not certified.
