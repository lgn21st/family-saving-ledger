# AGENTS.md - Family Saving Ledger

This document provides guidelines for AI assistants working on this project.

## Project Context

**Family Saving Ledger** is a Vue 3 PWA app for family savings management.

| Attribute | Value                    |
| --------- | ------------------------ |
| Platform  | Web + iOS/Android PWA    |
| Users     | 3 (1 parent, 2 children) |
| Backend   | Supabase                 |
| Language  | zh-CN (Chinese)          |

## Tech Stack

- Vue 3 + TypeScript
- Vite + Tailwind CSS
- Supabase (local/cloud)
- Vitest + Testing Library
- Vite PWA

## Code Conventions

### File Organization

```
src/
├── App.vue              # Main app (445 lines, component-based architecture)
├── main.ts              # Entry point
├── supabaseClient.ts    # Supabase client
├── components/          # Reusable Vue components (18 components)
├── composables/         # Vue composables (18 files)
├── types/               # TypeScript types (create if needed)
└── utils/               # Utility functions
```

### Naming Conventions

| Type        | Convention             | Example                |
| ----------- | ---------------------- | ---------------------- |
| Composables | `use{Feature}.ts`      | `useTransactions.ts`   |
| Components  | `PascalCase.vue`       | `TransactionIcon.vue`  |
| Types       | `PascalCase`           | `TransactionType`      |
| Constants   | `SCREAMING_SNAKE_CASE` | `SUPPORTED_CURRENCIES` |

### Component Props

```typescript
// Use TypeScript interfaces
interface Props {
  accountId: string;
  disabled?: boolean; // Optional props with default
}

// Use defineProps with type inference
const props = defineProps<Props>();
```

### Testing

- Tests location: `src/__tests__/`
- Test runner: Vitest
- Testing library: @testing-library/vue
- Mock strategy: Mock Supabase client

### Git Workflow

- Commit message format: `type: description`
- Types: `feat`, `fix`, `refactor`, `docs`, `test`
- Squash small commits before merging

## Supabase Schema

Key tables (see `supabase/schema.sql`):

- `app_users` - Users with PIN authentication
- `accounts` - Bank accounts
- `transactions` - Ledger entries
- `settings` - Interest rate configuration
- `interest_log` - Monthly interest audit

## Testing Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run test     # Run tests (92 tests, 100% pass rate)
npm run lint     # Lint code
```

## Common Tasks

### Adding a New Transaction Type

1. Update `TransactionType` type in `App.vue`
2. Add icon in `TransactionIcon.vue`
3. Update `transactionLabels` object
4. Add test case

### Modifying Transaction Flow

1. Find relevant composable in `src/composables/`
2. Update Supabase query if needed
3. Update related computed properties
4. Run tests to verify

## iOS PWA Notes

- Apple touch icon: `public/icons/apple-touch-icon.png`
- Web manifest: `public/manifest.webmanifest`
- Update icons: Replace SVG and run icon generation script

## Working with AI Assistants

### Critical Guideline

**Always verify current code state before analysis**:

- Do not rely on memory or past information
- Read actual files before providing assessments
- If uncertain, say "Let me check" instead of providing potentially incorrect data

### When Asked to Implement a Feature

1. **Get current state first**: Check actual code before analyzing
2. Understand the requirement
3. Check existing code patterns
4. Implement following conventions
5. Write/update tests
6. Verify build and tests pass

### When Asked to Debug

1. Check browser console for errors
2. Review recent code changes
3. Check Supabase query results
4. Use console.log for debugging

### Important Notes

- **No security features needed** - This is a family app with PIN-only auth
- **No RLS required** - Data is not sensitive
- **Support Chinese UI** - All text is in Chinese
- **PWA-first** - Optimize for mobile/add-to-home-screen experience

## Key Files

| File                    | Purpose                     |
| ----------------------- | --------------------------- |
| `src/App.vue`           | Main application logic      |
| `src/supabaseClient.ts` | Supabase client setup       |
| `supabase/schema.sql`   | Database schema             |
| `vite.config.ts`        | Vite + PWA configuration    |
| `tailwind.config.js`    | Tailwind CSS configuration  |
| `ROADMAP.md`            | Project improvement roadmap |
