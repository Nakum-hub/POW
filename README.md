# SkillOS

SkillOS turns GitHub activity into a proof-of-work talent profile. Developers connect repositories, SkillOS analyzes code signals into verified skills, and recruiters search public profiles by evidence-backed confidence instead of keyword padding.

## What ships

- GitHub-backed sign-in with a demo fallback for offline or preview use
- Developer dashboard, skill graph, repository explorer, public profile, recruiter search, and project explainer
- Recruiter pipeline workspace, shortlist management, and Razorpay-backed billing for growth/scale plans (starter is free; enterprise is contact-sales)
- Supabase schema plus edge functions for repository analysis, project explanations, billing, and account deletion
- File-level repository analysis: the analyzer opens real source files, matches import/usage patterns, and stores the actual file path, code snippet, and line numbers as evidence
- Production build, lint, TypeScript checks, and unit coverage; GitHub Actions CI runs all four gates on every push

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

## Hosting

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for full instructions. In short:

- **Public demo (no backend):** set `VITE_PUBLIC_DEMO=true` and deploy `dist` to GitHub Pages (workflow included), Netlify, or Vercel.
- **Live product:** create a Supabase project, run the migrations, deploy the edge functions, configure GitHub OAuth, and set the `VITE_SUPABASE_*` variables.

## Billing setup (Razorpay)

1. Create an individual/freelancer Razorpay account (self-serve, no business registration required) and complete KYC.
2. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` as Supabase Edge Function secrets.
3. In the Razorpay Dashboard, create a webhook pointed at `<your-supabase-url>/functions/v1/razorpay-webhook`, subscribed to `payment.captured`. Set the webhook secret you choose there as `RAZORPAY_WEBHOOK_SECRET`.
4. Deploy `create-razorpay-order`, `verify-razorpay-payment`, and `razorpay-webhook` alongside the existing edge functions.
5. Confirm `/*.png`-style screenshots and KYC documents never get committed to the repo -- this product's pitch is evidence over keyword padding, and that includes its own repo hygiene.
6. International (non-India) card payments require a separate "Unlock International" approval from Razorpay (~5 business days) and additional website policy pages (terms, privacy, refund). Domestic INR billing works without this.

List prices in `src/lib/plans.ts` are in USD for display; `create-razorpay-order` charges an INR-equivalent set in that function's `PLAN_PRICING_INR_PAISE` map. These are starting figures, not a researched FX conversion -- confirm them against your actual go-to-market pricing before enabling live billing.

## Production notes

- Demo mode is intentionally buyer-safe: the product remains usable even without a live backend.
- Live mode expects a working Supabase project, the included SQL migrations, and deployed edge functions.
- The repository now includes a unit test suite for plan entitlements, go-live readiness, and the repository analyzer's detection/scoring logic (`supabase/functions/analyze-repos/analyzer-core.ts` -- the pure logic is separated from the Deno I/O handler specifically so it's testable). The Razorpay billing functions do not yet have automated test coverage -- a good candidate for the next pass. Browser smoke testing is still required for critical user flows.
- `npm run typecheck` only checks `src/` (see `tsconfig.app.json`'s `include`). It has never checked anything under `supabase/functions/`. The `validate-edge-functions` CI job runs `deno check` / `deno lint` against the edge functions specifically to close that gap -- don't remove it under the assumption the main `validate` job already covers this.
- `subscriptions.plan_key` can only be set to a paid tier by the service role (Razorpay verification/webhook). RLS only allows an authenticated user to self-serve the free `starter` plan -- do not loosen this without an equivalent payment-verification step replacing it.
