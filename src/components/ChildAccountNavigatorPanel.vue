<template>
  <section class="surface-card p-4 sm:p-5" aria-labelledby="child-account-navigator-title">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="section-kicker">我的储蓄</p>
        <h2 id="child-account-navigator-title" class="mt-1 text-lg font-semibold text-slate-950">
          账户与余额
        </h2>
        <p class="mt-1 text-sm text-slate-500">选择账户后查看余额变化和每一笔记录。</p>
      </div>
      <span class="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
        只读
      </span>
    </div>

    <div v-if="accounts.length > 0" class="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <section aria-labelledby="child-currency-summary-title">
        <h3 id="child-currency-summary-title" class="text-xs font-semibold text-slate-500">
          按币种汇总
        </h3>
        <dl class="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-1">
          <div
            v-for="(total, currency) in currencyTotals"
            :key="currency"
            class="flex items-center justify-between gap-2 rounded-xl bg-slate-100 px-3 py-2.5"
          >
            <dt class="text-xs font-semibold text-slate-500">{{ currency }}</dt>
            <dd class="numeric truncate text-sm font-semibold text-slate-900">
              {{ formatCurrencyTotal(total, currency) }}
            </dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="child-account-list-title"
        class="border-t border-slate-100 pt-4 lg:border-t-0 lg:border-l lg:pl-5 lg:pt-0"
      >
        <div class="flex items-center justify-between gap-3">
          <h3 id="child-account-list-title" class="text-xs font-semibold text-slate-500">
            选择账户
          </h3>
          <span class="text-xs text-slate-400">{{ accounts.length }} 个</span>
        </div>
        <div class="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="account in accounts"
            :key="account.id"
            type="button"
            :aria-current="account.id === selectedAccountId ? 'true' : undefined"
            :class="[
              'flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow,transform] focus-visible:ring-3 focus-visible:ring-brand-100 focus-visible:outline-none active:translate-y-px',
              account.id === selectedAccountId
                ? 'border-slate-950 bg-slate-950 text-white shadow-md'
                : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50',
            ]"
            @click="selectAccount(account)"
          >
            <span class="min-w-0">
              <span
                :class="[
                  'block truncate text-sm font-semibold',
                  account.id === selectedAccountId ? 'text-white' : 'text-slate-900',
                ]"
              >
                {{ account.name }}
              </span>
            </span>
            <span class="flex shrink-0 flex-col items-end">
              <span
                v-if="account.id === selectedAccountId"
                class="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300"
              >
                当前
              </span>
              <span
                :class="[
                  'numeric text-sm font-semibold',
                  account.id === selectedAccountId ? 'mt-1 text-white' : 'text-slate-700',
                ]"
              >
                {{ formatAmount(balances[account.id] ?? 0, account.currency) }}
              </span>
            </span>
          </button>
        </div>
      </section>
    </div>

    <div v-else class="mt-4 rounded-2xl bg-slate-50 px-5 py-8 text-center">
      <p class="text-sm font-medium text-slate-600">还没有储蓄账户</p>
      <p class="mt-1 text-xs text-slate-400">请让家长在设置中为你创建第一个账户。</p>
    </div>
    <p class="sr-only" role="status" aria-live="polite">{{ accountSelectionStatus }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

import type { Account } from "../types";

const props = defineProps<{
  groupedAccounts: Record<string, Account[]>;
  selectedAccountId: string | null;
  balances: Record<string, number>;
  formatAmount: (amount: number, currency: string) => string;
  onSelectAccount: (id: string) => void;
}>();

const accounts = computed(() => Object.values(props.groupedAccounts).flat());
const formatCurrencyTotal = (amount: number, currency: string) =>
  props.formatAmount(amount, currency).replace(new RegExp(`\\s+${currency}$`), "");
const currencyTotals = computed(() =>
  Object.fromEntries(
    Object.entries(props.groupedAccounts).map(([currency, currencyAccounts]) => [
      currency,
      currencyAccounts.reduce(
        (total, account) => total + (props.balances[account.id] ?? 0),
        0,
      ),
    ]),
  ),
);
const accountSelectionStatus = ref("");
const selectAccount = (account: Account) => {
  props.onSelectAccount(account.id);
  accountSelectionStatus.value = `已切换到${account.name}，余额${props.formatAmount(props.balances[account.id] ?? 0, account.currency)}`;
};
</script>
