---
name: vue-ledger-ui
description: "Maintain the Vue 3 frontend of the family-saving-ledger project. Use for its App.vue, components, composables, frontend contracts, accessibility, PWA behavior, and UI tests; not for unrelated Vue apps."
---

# Vue Ledger UI

1. Read `references/frontend-map.md` before changing frontend structure or data flow.
2. Inspect the current component, composable and corresponding tests before editing.
3. Keep `App.vue` as a thin view; place cross-feature coordination in `src/app/`.
4. Keep Supabase access in composables or application assembly, never presentation components.
5. Create a composable only for independently meaningful behavior; inline trivial forwarding logic.
6. Preserve typed props, explicit callbacks, named `v-model`, Chinese UI text and mobile/PWA behavior.
7. Add or update behavior-focused tests using accessible roles and names.
8. Run `npm run check`; also run database gates if frontend contracts with RPCs or schema changed.
