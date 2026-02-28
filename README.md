# MiLiga (Supabase migration)

This project has been migrated off **Base44** and now runs fully on **Supabase**:

- **Auth**: Supabase Auth (email/password + magic link)
- **Database**: Supabase Postgres (via PostgREST from the client)
- **API layer**: Supabase JS client, plus Edge Functions for admin actions (invite + delete account)

## 1) Create a Supabase project

1. Go to Supabase and create a new project.
2. In the SQL editor, run the schema in:

`supabase/schema.sql`

This creates the tables used by the app:
- `profiles` (app-specific user fields)
- `players`
- `groups`
- `matches`
- `events`
- `app_logs`

> Note: The included RLS policies are intentionally permissive to keep the migration simple. Tighten them for production.

## 2) Configure environment variables

Create `.env.local` (or copy `.env.example`) and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 3) (Optional, recommended) Deploy Edge Functions

These functions are used for admin-only operations:
- `invite-user` (invite by email)
- `delete-me` (delete the current user)

They live in:

`supabase/functions/*`

If you deploy them, set function secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 4) Install + run

```bash
npm install
npm run dev
```

## Notes on the migration

- The old Base44 SDK interface has been replaced with a Supabase-backed wrapper: `src/api/supabaseClient.js`.
- Auth fields like `activeGroupId`, `nickname`, and `role` are stored in `profiles`.
- Client CRUD calls go directly to PostgREST via `@supabase/supabase-js`.
