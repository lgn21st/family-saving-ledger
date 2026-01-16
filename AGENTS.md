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

## Runtime Setup

- Environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (required for `npm run settle-interest`)
- Schema file: `supabase/schema.sql`
  - Apply schema: `supabase db reset --local`

## Code Style Guidelines

### General

- Use TypeScript for all new files.
- Keep components focused and avoid oversized single-file helpers.
- Prefer clear, descriptive naming over abbreviations.

### Formatting

- 2 spaces for indentation.
- Single quotes for strings.
- No semicolons.
- Keep lines concise; wrap long attributes or object literals.
- Align new code with existing formatting in the file you edit.

### Imports

- Order imports as: framework → third-party → local → styles.
- Separate groups with a blank line.
- Avoid unused imports; remove immediately.

### Vue Patterns

- Prefer Composition API with `<script setup>`.
- Keep derived state in `computed`.
- Use `watch` for side effects or state syncing.
- Avoid complex inline template expressions; move to helpers.

### Types

- Use `type` aliases for domain models.
- Keep API types close to their usage.
- Prefer narrow union types instead of `any`.

### Naming

- `camelCase` for variables/functions.
- `PascalCase` for components and types.
- `kebab-case` for file names when using `.vue` components.

### Error Handling

- Surface user-friendly error messages in UI (`status`).
- Use early returns in async flows.
- For Supabase calls, check `error` and `data` nullability.

### State & Data Flow

- Keep UI-only state local to components.
- Derive values instead of duplicating state.
- Reset state consistently after mutations.

### Transactions & Calculations

- Treat money values as numbers with fixed precision.
- Use `toFixed(2)` for display.
- Compute balances from transaction history (no stored balance).

### Styling

- Use Tailwind utility classes as primary styling.
- Keep layout responsive using flex/grid and existing brand palette.
- Avoid adding custom CSS unless utility classes are insufficient.

## Supabase Usage

- Use shared client from `src/supabaseClient.ts`.
- Prefer explicit `.select()` when inserts need returned rows.
- Do not expose service role secrets in the client.
- Keep table/column names aligned with `supabase/schema.sql`.
- Interest settlement runs via `run_monthly_interest()` and a Supabase cron job.

## PWA Notes

- Manifest and icons live in `public/`.
- Service worker registration is in `src/main.ts`.
- Keep `start_url` `/` and `display` `standalone`.

## Project Structure

- `src/App.vue`: main UI and logic.
- `src/main.ts`: entry + SW registration.
- `src/supabaseClient.ts`: Supabase client setup.
- `src/__tests__/App.test.ts`: UI tests.
- `src/__tests__/interestScheduler.test.ts`: interest scheduling tests.
- `scripts/settle-interest.mjs`: local interest settlement task.
- `supabase/schema.sql`: DB schema bootstrap.
- `supabase/migrations/`: database migrations.

## Cursor / Copilot Rules

- No `.cursor/rules/` directory found.
- No `.cursorrules` file found.
- No `.github/copilot-instructions.md` file found.

## Do / Don’t

- Do keep the PIN login flow (4 digits).
- Do keep child view read-only.
- Do keep transfers same-currency only.
- Don’t add cross-currency conversions.
- Don’t add complex auth flows unless requested.

## Update Guidance

- Update this guide if scripts or tooling change.
- Add new tests when changing behavior.
- Avoid committing secrets or `.env.local`.

## Troubleshooting

- If you see “请先配置 Supabase 连接”, verify env vars.
- If login users don’t appear, check `app_users` table.
- If transactions fail to insert, verify Supabase policy/schema.
