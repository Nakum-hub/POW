# SkillOS

SkillOS turns GitHub activity into a proof-of-work talent profile. Developers connect repositories, SkillOS analyzes code signals into verified skills, and recruiters search public profiles by evidence-backed confidence instead of keyword padding.

## What ships

- GitHub-backed sign-in with a demo fallback for offline or preview use
- Developer dashboard, skill graph, repository explorer, public profile, recruiter search, and project explainer
- Recruiter pipeline workspace, shortlist management, and revenue-oriented billing surface
- Supabase schema plus edge functions for repository analysis, project explanations, and account deletion
- Production build, lint, TypeScript checks, and unit coverage for revenue logic

## Local setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env`
3. Choose one mode:
   - Demo mode: set `VITE_FORCE_DEMO_MODE=true`
   - Live mode: set `VITE_FORCE_DEMO_MODE=false` and provide working Supabase values
4. Start the app with `npm run dev`

## Environment variables

Frontend:

- `VITE_FORCE_DEMO_MODE`: forces the UI to stay in seeded preview mode
- `VITE_SUPABASE_URL`: live Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: live Supabase anon key

Supabase Edge Functions:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SITE_URL`
- `ALLOWED_ORIGIN`
- `ANTHROPIC_API_KEY` optional
- `ANTHROPIC_MODEL` optional

If the Anthropic variables are missing, the project explainer still works using a deterministic fallback summary.

## Quality gates

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Production notes

- Demo mode is intentionally buyer-safe: the product remains usable even without a live backend.
- Live mode expects a working Supabase project, the included SQL migrations, and deployed edge functions.
- The repository now includes a unit test suite for plan entitlements and go-live readiness. Browser smoke testing is still required for critical user flows.
