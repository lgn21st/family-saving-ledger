# Family Saving Ledger Agent Guide

## Scope

- Applies to the entire repository.
- This guide is for agentic coding assistants working on this Vue 3 rewrite.

## Project Summary

- Vue 3 + Vite + TypeScript + Tailwind implementation of the Home Bank app.
- Supabase is the backend (local or cloud); schema mirrors `home_bank`.
- The UI is a PWA with offline-ready assets via `vite-plugin-pwa`.

## Quick Start Checklist

- Confirm the repo is checked out and dependencies are installed.
- Ensure Supabase env vars are set (`.env.local`).
- Review `supabase/schema.sql` before touching data-layer code.
- Check existing tests for expected UI behaviors.

## Build / Lint / Test Commands

### Install

- Install dependencies: `npm install`

### Dev & Build

- Dev server: `npm run dev`
- Production build: `npm run build`
- Preview build: `npm run preview`

### Lint

- Lint all: `npm run lint`

### Tests

- Run all tests: `npm run test`
- Watch mode: `npm run test:watch`
- Interest schedule tests: `npx vitest run src/__tests__/interestScheduler.test.ts`

### Single Test Execution

- Single test file: `npx vitest run src/__tests__/App.test.ts`
- Single test case: `npx vitest run src/__tests__/App.test.ts -t "renders parent view"`

---

## Project Summary

- Vue 3 + Vite + TypeScript + Tailwind implementation of the Home Bank app.
- Supabase is the backend (local or cloud); schema mirrors `home_bank`.
- The UI is a PWA with offline-ready assets via `vite-plugin-pwa`.
- Monthly interest is settled by a Supabase cron job that runs at 09:00 Asia/Singapore time on the 1st of each month (configured as `0 1 1 * *` UTC). The settlement logic lives in `run_monthly_interest()` inside `supabase/schema.sql` and uses a `settings` table for annual rate and timezone.

### Manual Trigger

Execute monthly interest settlement locally:

```bash
# Execute SQL function directly
npx supabase db shell -c "SELECT run_monthly_interest();"
```

## Supabase Usage

- Use shared client from `src/supabaseClient.ts`.
- Prefer explicit `.select()` when inserts need returned rows.
- Do not expose service role secrets in the client.
- Keep table/column names aligned with `supabase/schema.sql`.
- Interest settlement runs via `run_monthly_interest()` and a Supabase cron job.

## Project Structure

- `src/App.vue`: main UI and business logic.
- `src/main.ts`: app entry and service worker registration.
- `src/supabaseClient.ts`: Supabase client setup.
- `src/__tests__/App.test.ts`: UI tests.
- `src/__tests__/interestScheduler.test.ts`: interest scheduling tests.
- `scripts/settle-interest.mjs`: local interest settlement task.
- `supabase/schema.sql`: database schema.
- `supabase/migrations/`: database migrations.
- `public/manifest.webmanifest`: PWA manifest.
- `public/icons/home-bank.svg`: app icon.
- `vite.config.ts`: Vite + PWA configuration.

## License

This project is for family use and learning. Add a license if you plan to distribute it.
