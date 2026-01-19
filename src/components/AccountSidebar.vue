<template>
  <aside
    class="order-2 border-t border-white/60 bg-white/80 px-6 py-5 backdrop-blur lg:order-1 lg:w-72 lg:border-t-0 lg:border-r"
  >
    <h3 class="text-sm font-semibold text-slate-600">账户</h3>
    <div class="mt-4 space-y-4">
      <div
        v-for="(currencyAccounts, currency) in groupedAccounts"
        :key="currency"
      >
        <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {{ currency }}
        </h4>
        <div
          class="mt-2 flex flex-col gap-3 sm:flex-row sm:overflow-x-auto sm:pb-2 lg:block lg:space-y-2 lg:overflow-visible"
        >
          <button
            v-for="account in currencyAccounts"
            :key="account.id"
            class="flex w-full min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition sm:min-w-[220px]"
            :class="
              account.id === selectedAccountId
                ? 'border-purple-300 bg-purple-50 text-purple-700 shadow-md ring-2 ring-purple-200'
                : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md'
            "
            @click="onSelectAccount(account.id)"
          >
            <span class="flex-1 break-words">{{ account.name }}</span>
            <span class="text-xs font-semibold text-slate-500">
              {{ formatAmount(balances[account.id] ?? 0, account.currency) }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { Account } from "../types";

defineProps<{
  groupedAccounts: Record<string, Account[]>;
  selectedAccountId: string | null;
  balances: Record<string, number>;
  formatAmount: (amount: number, currency: string) => string;
  onSelectAccount: (id: string) => void;
}>();
</script>
