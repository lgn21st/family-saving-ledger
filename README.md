# Family Saving Ledger

Family Saving Ledger is the Vue 3 rewrite of the Home Bank family savings ledger. It provides a PIN-based login, parent-managed transactions, child read-only views, and manual monthly interest settlement. The UI is PWA-ready for desktop and mobile.

## Features

- PIN-based login (4-digit) with parent/child roles
- Multi-currency accounts grouped by currency
- Parent actions: deposit, withdrawal, same-currency transfer, manual interest
- Child actions: read-only access to balances and transactions
- PWA installation for app-like usage

## Tech Stack

- Vite + Vue 3 + TypeScript
- Supabase (local or cloud)
- Tailwind CSS
- Vite PWA plugin
- Vitest + Testing Library

## Local Development

### 1) Install dependencies

```bash
npm install
```

### 2) Set up Supabase

You can run Supabase locally (recommended for development):

```bash
supabase start
```

Apply the schema:

```bash
psql "<local-connection-url>" -f supabase/schema.sql
```

### 3) Configure environment variables

Create `.env.local` in the project root:

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4) Run the app

```bash
npm run dev
```

Open the URL shown in the terminal to access the app.

## Supabase Data Model

Tables are defined in `supabase/schema.sql`:

- `app_users`: PIN login user records (parent/child)
- `accounts`: account name, currency, owner child, creator
- `transactions`: ledger entries (deposit/withdrawal/transfer/interest)
- `interest_config`: global interest rate
- `interest_log`: monthly interest audit

### Seed Data

The database is seeded automatically via `supabase db reset --local`. Seed users and accounts:

```sql
with parents as (
  insert into app_users (name, role, pin, avatar_id)
  values
    ('爸爸', 'parent', '1234', 'parent-1'),
    ('妈妈', 'parent', '2345', 'parent-2')
  returning id, name
),
children as (
  insert into app_users (name, role, pin, avatar_id)
  values
    ('大女儿', 'child', '1111', 'child-2'),
    ('小女儿', 'child', '2222', 'child-3')
  returning id, name
)
insert into accounts (name, currency, owner_child_id, created_by)
values
  (
    '中国-日常',
    'CNY',
    (select id from children where name = '大女儿'),
    (select id from parents where name = '爸爸')
  ),
  (
    '中国 - 目标基金',
    'CNY',
    (select id from children where name = '大女儿'),
    (select id from parents where name = '爸爸')
  ),
  (
    '中国 - 日常',
    'CNY',
    (select id from children where name = '小女儿'),
    (select id from parents where name = '妈妈')
  );
```

## Usage

- Parents log in to add deposits, withdrawals, transfers, and interest.
- Children log in to view balances and transaction history.
- Transfers only work between accounts of the same currency.
- Interest is applied manually via the "月结息" button.

## Scripts

- `npm run dev` - start local dev server
- `npm run build` - production build
- `npm run preview` - preview the production build
- `npm run lint` - ESLint
- `npm run test` - run unit tests
- `npm run test:watch` - watch tests
- `./test-interest.sh [month]` - test monthly interest calculation locally

## Tests

Unit tests use Vitest + Testing Library and mock the Supabase client. Run:

```bash
npm run test
```

## Monthly Interest Calculation

The app automatically calculates monthly interest on the 1st of each month. The interest calculation is handled by:

1. **Database Function**: `run_monthly_interest()` in `supabase/schema.sql`
2. **Edge Function**: `supabase/functions/monthly-interest/` for API access
3. **GitHub Actions**: `.github/workflows/monthly-interest.yml` for scheduling

### Manual Testing

Test the interest calculation locally:

```bash
# Calculate interest for current month
./test-interest.sh

# Calculate interest for specific month
./test-interest.sh 2024-01
```

### Production Setup

For production, set up the GitHub Actions workflow by:

1. Go to your GitHub repository Settings → Secrets and variables → Actions
2. Add these repository secrets:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key
3. Add these repository variables:
   - `SUPABASE_URL`: Your Supabase project URL

The workflow runs automatically on the 1st of each month, or can be triggered manually.

## PWA Notes

The app includes a web manifest and service worker configuration. Install on iOS:

1. Open the app in Safari
2. Tap the Share icon
3. Choose "Add to Home Screen"

## Project Structure

- `src/App.vue`: main UI and business logic
- `src/main.ts`: app entry and service worker registration
- `src/supabaseClient.ts`: Supabase client initialization
- `supabase/schema.sql`: database schema
- `public/manifest.webmanifest`: PWA manifest
- `vite.config.ts`: Vite + PWA configuration

## License

This project is for family use and learning. Add a license if you plan to distribute it.
