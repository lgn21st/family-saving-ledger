<template>
  <section class="surface-card p-4 sm:p-5" aria-labelledby="account-navigation-title">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="section-kicker">账户导航</p>
        <h2 id="account-navigation-title" class="mt-1 text-base font-semibold text-slate-950">
          账户
        </h2>
      </div>
      <span class="text-xs font-medium text-slate-500">
        {{ selectedChildName ?? "未选择孩子" }}
      </span>
    </div>

    <div v-if="accounts.length > 0" class="mt-4 space-y-2">
      <button
        v-for="account in accounts"
        :key="account.id"
        type="button"
        :aria-current="account.id === selectedAccountId ? 'true' : undefined"
        :class="[
          'block w-full rounded-2xl border p-3 text-left transition-[border-color,background-color,box-shadow,transform] focus-visible:ring-3 focus-visible:ring-brand-100 focus-visible:outline-none active:translate-y-px',
          account.id === selectedAccountId
            ? 'border-brand-300 bg-brand-50 shadow-sm ring-1 ring-brand-100'
            : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50',
        ]"
        @click="onSelectAccount(account.id)"
      >
        <span class="block truncate text-sm font-semibold text-slate-900">{{ account.name }}</span>
        <span class="numeric mt-1 block text-xs text-slate-500">
          {{ formatAmount(balances[account.id] ?? 0, account.currency) }}
        </span>
      </button>
    </div>

    <div v-else class="mt-4 rounded-2xl bg-slate-50 px-4 py-6 text-center">
      <p class="text-sm font-medium text-slate-600">
        {{ selectedChildName ? "这个孩子还没有账户" : "请先选择一个孩子" }}
      </p>
      <p class="mt-1 text-xs leading-5 text-slate-400">账户创建和生命周期管理已移至设置。</p>
      <button type="button" class="button-secondary mt-3" @click="onOpenSettings">
        前往设置
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Account } from "../types";

defineProps<{
  accounts: Account[];
  selectedAccountId: string | null;
  selectedChildName: string | null;
  balances: Record<string, number>;
  formatAmount: (amount: number, currency: string) => string;
  onSelectAccount: (id: string) => void;
  onOpenSettings: () => void;
}>();
</script>
