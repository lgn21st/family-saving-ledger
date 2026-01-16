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
Insert users (PINs) and accounts directly in Supabase:
```sql
insert into app_users (name, role, pin) values
  ('爸爸', 'parent', '1234'),
  ('妈妈', 'parent', '2345'),
  ('大女儿', 'child', '1111'),
  ('小女儿', 'child', '2222');
```

Create accounts:
```sql
insert into accounts (name, currency, owner_child_id, created_by)
values
  ('大女儿-日常', 'CNY', '<child-id>', '<parent-id>'),
  ('大女儿-目标基金', 'CNY', '<child-id>', '<parent-id>');
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

## Tests
Unit tests use Vitest + Testing Library and mock the Supabase client. Run:
```bash
npm run test
```

## PWA Notes
The app includes a web manifest and service worker configuration. Install on iOS:
1) Open the app in Safari
2) Tap the Share icon
3) Choose "Add to Home Screen"

## Project Structure
- `src/App.vue`: main UI and business logic
- `src/main.ts`: app entry and service worker registration
- `src/supabaseClient.ts`: Supabase client initialization
- `supabase/schema.sql`: database schema
- `public/manifest.webmanifest`: PWA manifest
- `vite.config.ts`: Vite + PWA configuration

## License
This project is for family use and learning. Add a license if you plan to distribute it.
