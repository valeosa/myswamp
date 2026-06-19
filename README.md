# mySwamp

A task app built around the moment before you start.

dump your tasks. get your frog.

Built with Next.js, deployed on Vercel.

## Launch setup

1. Copy `.env.example` to `.env.local` and add the five server/environment values.
2. Run `supabase/migrations/202606190001_launch_frog_lifecycle.sql` in the Supabase SQL editor.
3. Add the same environment values in Vercel. Keep `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` server-only (never prefix them with `NEXT_PUBLIC_`).
4. Run `pnpm build` before deploying.

Frog selection, lifecycle events, and history now pass through Clerk-authenticated API routes. Browser clients do not write directly to Supabase.
