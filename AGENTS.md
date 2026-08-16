# CaninaMente Content Manager

Monorepo (npm workspaces) with two apps:

- `frontend/` — React 18 + Vite + TypeScript + Tailwind CSS + Framer Motion.
  Runs on `http://localhost:3000`.
- `backend/` — Node.js + Express + TypeScript (ESM). Runs on
  `http://localhost:5000`.

Shared database: **Supabase** (Postgres + Auth). Auth is Google OAuth only
(via Supabase Auth), single operator account. Migrations live in
`supabase/migrations/`.

## Running locally

```bash
npm install                # installs both workspaces
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
# fill in the values (see README.md)
npm run dev                 # starts backend (:5000) + frontend (:3000)
```

## Key conventions

- The backend never trusts the frontend's user id — every route under
  `/api/*` (except `/api/health`, `/api/push/vapid-public-key`, and the
  Canva OAuth callback) goes through `requireAuth`
  (`backend/src/middleware/auth.ts`), which verifies the Supabase access
  token and attaches a request-scoped Supabase client (`req.db`) that
  respects Row Level Security.
- Google Drive/Docs access uses the user's own OAuth token (Supabase's
  `provider_token`, forwarded from the frontend as the `X-Google-Token`
  header) — there is no separate Google login flow. Optional fallback: a
  service account for background reads (see `backend/.env.example`).
- Canva uses its own OAuth (Canva Connect API, 3-legged + PKCE) — tokens are
  stored encrypted (AES-256-GCM) in `integration_tokens`.
- Optional integrations (Claude/Anthropic, Canva, Web Push, Google service
  account) degrade gracefully: check `backend/src/lib/env.ts`'s `features`
  object before assuming a route will fully work, and the routes already
  return clear Spanish error messages when a key is missing.
- The mandatory weekly flow (Grabación → Captions → Diseño → Programar) is
  enforced by `weekly_cycles.flow_step` server-side (`PATCH
  /api/cycles/:id`) and mirrored client-side by `FlowGuard`
  (`frontend/src/components/FlowGuard.tsx`) — don't let the frontend skip
  ahead without the backend state agreeing.
