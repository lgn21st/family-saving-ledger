# Frontend map

## Entry and assembly

- `src/main.ts`: Vue and service-worker bootstrap.
- `src/App.vue`: login/app-shell view selection and prop wiring only.
- `src/app/useLedgerApp.ts`: page state, lifecycle and cross-feature composition.
- `src/supabaseClient.ts`: environment guard and Supabase client creation.

## Views

- `LoginPage.vue`: user selection and PIN entry.
- `AppShell.vue`: header, status and authenticated layout.
- `ParentDashboard.vue`: parent account selection, balances and transaction workflows.
- `ChildDashboard.vue`: read-only child account view.
- `SettingsPage.vue`: parent-only member and account lifecycle management.
- `LedgerNavigatorPanel.vue`: unified family assets, child selection, account selection and current-account context.

## Capabilities

- Data: `useUsers`, `useAccounts`, `useTransactions`.
- Actions: `useAuth`, `useChildren`, `useAccountEditor`, `useTransactionActions`, `useTransfers`.
- Selection/session: `useAccountSelection`, `useSelectionSync`, `useSession`, `useBootstrap`.
- Display: `useCurrency`, `useTransactionDisplay`, `useChartData`, `useStatus`.

## Boundaries

- Components receive data and callbacks; they do not import the Supabase client.
- Database RPCs remain authoritative for balances, roles, transfers, close/archive and interest rules.
- Domain types live in `src/types/domain.ts`; client adapter types live in `src/types/supabase.ts`.
- Tests live in `src/__tests__/` and mock the Supabase boundary.
