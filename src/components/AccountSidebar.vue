<template>
  <aside class="surface-card p-4 sm:p-5 lg:sticky lg:top-24" aria-labelledby="my-accounts-title">
    <p class="section-kicker">我的储蓄</p>
    <h2 id="my-accounts-title" class="mt-1 text-base font-semibold text-slate-950">账户</h2>
    <div class="mt-4 space-y-4">
      <div v-for="(currencyAccounts, currency) in groupedAccounts" :key="currency">
        <h3 class="text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase">
          {{ currency }}
        </h3>
        <div class="mt-2 flex gap-2.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          <button
            v-for="account in currencyAccounts"
            :key="account.id"
            type="button"
            class="min-w-[230px] rounded-2xl border p-3 text-left transition-[border-color,background-color,box-shadow,transform] focus-visible:ring-3 focus-visible:ring-brand-100 focus-visible:outline-none active:translate-y-px lg:min-w-0"
            :class="
              account.id === selectedAccountId
                ? 'border-slate-950 bg-slate-950 text-white shadow-md'
                : 'border-slate-200 bg-white text-slate-800 hover:border-brand-300 hover:bg-brand-50'
            "
            :aria-current="account.id === selectedAccountId ? 'true' : undefined"
            @click="onSelectAccount(account.id)"
          >
            <span class="block truncate text-sm font-semibold">{{ account.name }}</span>
            <span
              :class="[
                'numeric mt-1 block text-xs',
                account.id === selectedAccountId ? 'text-slate-300' : 'text-slate-500',
              ]"
            >
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
