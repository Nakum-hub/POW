# Deploying SkillOS

SkillOS is a Vite + React 18 + TypeScript single-page app backed by Supabase
(Auth, Postgres, Edge Functions). It runs in one of two modes:

- **Live mode** — talks to a real Supabase project. This is the actual product.
- **Demo mode** — serves seeded, read-only data with no backend. Great for a
  public preview / portfolio link.

This guide covers both. Pick the path that matches what you want online.

---

## 0. Prerequisites

- Node.js 20+
- A GitHub account (the repo already lives at `Nakum-hub/POW`)
- For live mode: a [Supabase](https://supabase.com) project and the
  [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm i -g supabase`)

Install dependencies and confirm the quality gates pass locally:

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build
```

---

## Path A — Host a backend-free public demo (fastest)

This puts a working, clickable SkillOS online in minutes with **no Supabase
project required**. It uses the seeded demo dataset.

The app deliberately refuses to run seeded data in a production build unless you
**explicitly** opt in with `VITE_PUBLIC_DEMO=true`. That guard prevents an
accidental deploy from ever serving fake data as if it were the real product.

### A1. GitHub Pages (one-click, via GitHub Actions)

A workflow is included at `.github/workflows/deploy-pages.yml`. It builds the app
with the public-demo flag and the `/POW/` base path, then publishes to Pages.

1. Go to the repo's **Actions** tab.
2. Select **"Deploy demo to GitHub Pages"** and click **Run workflow** (on `main`).
3. The first run turns Pages on for you (`enablement: true`) and publishes the site to
   `https://nakum-hub.github.io/POW/`. Re-run it any time to refresh the demo.

> The deploy is intentionally **manual** (not on every push) so it never shows up as a
> failing check before you've chosen to publish. Day-to-day commits only run the CI checks.

Deep links work because the workflow copies `index.html` to `404.html` (a standard
SPA fallback for Pages), and the router is mounted at the `/POW/` base path.

### A2. Netlify / Vercel (demo)

Both host SPAs at the domain root, so you do **not** need `VITE_BASE_PATH`.

Set one environment variable in the host's dashboard:

```
VITE_PUBLIC_DEMO=true
```

- **Netlify**: build `npm run build`, publish `dist`. `netlify.toml` (included)
  already adds the SPA redirect.
- **Vercel**: framework "Vite", build `npm run build`, output `dist`.
  `vercel.json` (included) already adds the SPA rewrite.

---

## Path B — Host the real product (live Supabase backend)

### B1. Create the Supabase project

1. Create a project at https://supabase.com. Note the **Project URL** and
   **anon key** (Project Settings → API).

### B2. Apply the database schema

From the repo root, link and push migrations:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This runs everything in `supabase/migrations/`, which creates the `profiles`,
`repositories`, `skills`, `user_skills`, `skill_evidence`, `repo_analysis`, and
revenue-workspace tables, enables Row Level Security, seeds the skill taxonomy,
and adds the case-insensitive `github_id` index.

### B3. Configure GitHub OAuth

1. Create a GitHub OAuth App (GitHub → Settings → Developer settings → OAuth Apps).
   - **Authorization callback URL**:
     `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. In Supabase: **Authentication → Providers → GitHub**, paste the Client ID/Secret.
3. The app requests the `read:user read:org` scope — read-only, no write access to
   code. (If you later need private-repo metadata, widen the scope in
   `src/contexts/AuthContext.tsx` and update the copy on the login screen to match.)

### B4. Deploy the Edge Functions

```bash
supabase functions deploy analyze-repos
supabase functions deploy explain-repo
supabase functions deploy delete-account
```

Set the function secrets (these are **server-side only** — never exposed to the browser):

```bash
supabase secrets set \
  SUPABASE_URL=https://<your-project-ref>.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
  SITE_URL=https://your-production-domain.com \
  ALLOWED_ORIGIN=https://your-production-domain.com
# Optional — enables AI project explanations (falls back to a deterministic summary if unset)
supabase secrets set ANTHROPIC_API_KEY=<key> ANTHROPIC_MODEL=claude-3-5-sonnet-latest
```

`SITE_URL` / `ALLOWED_ORIGIN` must match your deployed frontend origin so the
functions' CORS allow-list accepts browser requests.

### B5. Deploy the frontend

Set the frontend env vars on your host (Vercel/Netlify/Cloudflare Pages):

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
# Do NOT set VITE_PUBLIC_DEMO in live mode.
```

Build command `npm run build`, output directory `dist`. The included
`vercel.json` / `netlify.toml` handle SPA routing.

### B6. Tighten the Content-Security-Policy

`index.html` ships a CSP that allows `https://*.supabase.co`. For a stricter
policy, replace the wildcard with your exact project subdomain.

---

## Environment variable reference

See `.env.example` for the full annotated list. Summary:

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend | Live Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | frontend | Live Supabase anon key |
| `VITE_PUBLIC_DEMO` | frontend (build) | Opt in to a backend-free public demo |
| `VITE_FORCE_DEMO_MODE` / `VITE_ALLOW_SANDBOX_MODE` | frontend (dev only) | Local sandbox data |
| `VITE_BASE_PATH` | frontend (build) | Sub-path hosting (e.g. `/POW/` for Pages) |
| `VITE_SHOW_ENVIRONMENT_BADGE` | frontend | Show the demo badge |
| `SUPABASE_URL` | edge functions | Project URL for the service client |
| `SUPABASE_SERVICE_ROLE_KEY` | edge functions | Privileged server key (never in browser) |
| `SITE_URL` / `ALLOWED_ORIGIN` | edge functions | CORS allow-list |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | edge functions | Optional AI explanations |

---

## CI

`.github/workflows/ci.yml` runs `typecheck`, `lint`, `test`, and `build` on every
push and pull request, so type errors and broken builds are caught before merge.

---

## Troubleshooting

- **Hosted demo shows "Supabase is not configured / unavailable."** You forgot
  `VITE_PUBLIC_DEMO=true` (demo) or the live `VITE_SUPABASE_*` values (live mode).
- **Blank page / 404 on refresh on GitHub Pages.** Confirm `VITE_BASE_PATH=/POW/`
  was set for the build and that `404.html` exists in the published output.
- **OAuth redirect mismatch.** The GitHub OAuth callback URL must point at
  `https://<ref>.supabase.co/auth/v1/callback`, and `SITE_URL` must match your frontend.
- **Edge function CORS errors.** Set `SITE_URL`/`ALLOWED_ORIGIN` to your exact deployed origin.
