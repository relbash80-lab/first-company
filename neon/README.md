# Neon database

The production database uses Neon Postgres, Neon Auth, and the Neon Data API.

## Identity compatibility

The original application tables use UUID user IDs created by Supabase Auth. Neon Auth also owns its own user IDs, so `20260829001000_auth_compatibility.sql` keeps the original UUIDs stable and maps each Neon Auth user to the matching application identity.

RLS policies call `app_auth.uid()`. New authenticated users are initialized through `public.ensure_current_user_mapping()` before application data is loaded.

## Migration order

1. Enable Neon Auth and the Data API on the target branch.
2. Apply `20260829001000_auth_compatibility.sql`.
3. Restore the existing `public` schema and data.
4. Apply indexes, constraints, triggers, grants, and RLS policies.
5. Refresh the Data API schema cache and test an authenticated and unauthenticated request.

The historical SQL under `supabase/migrations` remains the record of how the current public schema evolved. New database changes should be portable PostgreSQL migrations under this directory and must preserve the `app_auth` mapping layer.

The frontend file `src/config/supabase.js` intentionally keeps its old export name during the incremental migration; the exported client is Neon's official SDK.
