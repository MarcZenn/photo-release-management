# MSU Denver Photo Release Manager

Web Application for MSU Denver's photo release process: 

a public consent form (QR-code entry) plus a staff/admin dashboard for search and access management.

## Prerequisites

- **Node.js 18+** and npm
- **Docker Desktop** (or another local Docker runtime) — the Supabase CLI
  runs Postgres, GoTrue (Supabase Auth), and Studio as local containers
- **Supabase CLI** — `brew install supabase/tap/supabase` (or see the
  [install docs](https://supabase.com/docs/guides/cli/getting-started))
- **psql** — used by the `db:seed` script (`brew install libpq` if you don't
  already have it)

## Initial Setup

```bash
npm install
cp .env.local.example .env.local
```

You'll fill in `.env.local` once the local Supabase stack is running (next
section) — it needs both the server-side vars (used by tooling) and the
`VITE_`-prefixed vars (used by the frontend build).

## Running Supabase locally

From the repo root:

```bash
npm run supabase:start
```

This pulls/starts the local stack and prints a table of URLs and keys.
Docker Desktop must be running first. Local ports (from `supabase/config.toml`):

| Service | Port | Purpose |
|---|---|---|
| API (PostgREST/Auth) | `54321` | `SUPABASE_URL` / `VITE_SUPABASE_URL` |
| Postgres | `54322` | direct DB connection (used by `db:seed`) |
| Studio | `54323` | local Supabase dashboard — browse tables, run SQL |
| Email testing | `54324` | catches magic-link/OTP emails sent locally — see below |

**Changed anything in `supabase/config.toml`?** `supabase db reset` only resets
the database — it does **not** pick up config changes (auth settings, ports,
etc.), since those are read by the other containers (Auth/GoTrue, Studio, …)
only at their own startup. After editing `config.toml`, do a full restart
instead:

```bash
npm run supabase:restart
```

(Confirmed the hard way: a `site_url` fix sat unused through several
`db reset`s until an actual restart picked it up.)

Copy the `API URL` and `anon key` from the `supabase start` output (or
`supabase status` if it's already running) into `.env.local`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<anon key from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase status>

VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<same anon key>
```

`supabase start` applies every migration in `supabase/migrations/` to a
fresh local database automatically. If you ever need to reset back to a
clean state (re-applying all migrations from scratch):

```bash
supabase db reset
```

### Seeding the two bootstrap Admin accounts

The initial Admin allowlist rows (`marcusareulius@gmail.com`,
`aschweng@msudenver.edu`) are **not** part of the tracked migrations —
that's deliberate (see `supabase/seed_admins.sql`), matching the "break-glass
bootstrap" step being a manual, non-self-service action. Both `supabase start`
on a fresh volume and `supabase db reset` wipe it out, so run this
afterward:

```bash
npm run db:seed
```

### Testing magic-link sign-in locally

There's no real SMTP configured for local dev — magic-link/OTP emails sent
by `supabase.auth.signInWithOtp()` land in a local mail catcher instead of a
real inbox (still configured under `[inbucket]` in `config.toml` for
historical reasons, but the current Supabase CLI actually runs
[Mailpit](https://mailpit.axllent.org/) under that setting — same port, a
different UI/API than the name suggests). Open **http://127.0.0.1:54324**,
find the message addressed to the email you signed in with, and click the
link.

Only emails on `staff_allowlist` with `status = 'active'` (the two seeded
above, or anyone you grant via `update_staff_allowlist`) will get a usable
session — the `custom_access_token_hook` rejects everyone else at token
issuance.

## Running the frontend

```bash
npm run dev
```

Opens the Vite dev server (default `http://localhost:5173`). Routes:

- `/` — redirects to `/login`
- `/consent/:token` — public consent form (unauthenticated)
- `/login` — staff magic-link sign-in
- `/dashboard/*` — staff/admin dashboard, gated behind an authenticated
  session by `RouteGuard`

## Building for production

```bash
npm run build
```

Type-checks (`tsc -b`) then produces a static bundle in `dist/`, deployable
as-is to Vercel (or `npm run preview` to smoke-test the build locally).

## Common Supabase workflows

```bash
# Start the local stack
npm run supabase:start

# Full restart — required after any supabase/config.toml change, since
# `db reset` alone won't pick those up (see above)
npm run supabase:restart

# Create a new migration file
supabase migration new <description>

# Apply local migrations against the linked remote (dev) project
supabase db push

# Stop the local stack (containers persist state until you `supabase stop --no-backup`)
supabase stop
```

## Project structure

```
src/
  lib/              Supabase client, auth session hook
  components/        Route guard and other shared components
  routes/             Page-level components (consent form, staff login, dashboard)
supabase/
  migrations/         Version-controlled schema + SQL function migrations
  seed_admins.sql      Manual bootstrap seed (not a migration — see above)
  config.toml           Local Supabase CLI configuration
```
