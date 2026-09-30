<template>
  <section class="surface-card p-4 sm:p-5" aria-labelledby="child-account-navigator-title">
    <h2 id="child-account-navigator-title" class="section-title">我的储蓄</h2>
    <template v-if="accounts.length > 0">
      <div class="mt-3 grid gap-4 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1fr)] lg:gap-6">
        <div>
          <label for="child-account-select" class="sr-only">选择账户</label>
          <select id="child-account-select" :value="selectedAccountId ?? ''" class="app-input" @change="changeAccount">
            <option v-if="!selectedAccount" value="" disabled>请选择账户</option>
            <option v-for="account in accounts" :key="account.id" :value="account.id">
              {{ account.name }} · {{ account.currency }}
            </option>
          </select>
          <div v-if="selectedAccount" class="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span class="text-sm font-medium text-slate-500">我现在有</span>
            <p class="numeric text-3xl font-bold tracking-tight text-slate-950">
              {{ formatAmount(balances[selectedAccount.id] ?? 0, selectedAccount.currency) }}
            </p>
          </div>
        </div>
        <section v-if="selectedAccount" class="border-t border-slate-100 pt-3 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0" aria-labelledby="child-month-title">
          <h3 id="child-month-title" class="text-sm font-semibold text-slate-700">本月变化</h3>
          <template v-if="monthChanges">
            <dl class="mt-3 space-y-2 sm:grid sm:grid-cols-3 sm:gap-3 sm:space-y-0">
              <div class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 sm:block">
                <dt class="text-xs text-slate-500">存入与转入</dt>
                <dd class="numeric text-base font-semibold sm:mt-1 sm:text-lg text-emerald-700">{{ formatAmount(monthChanges.deposit + monthChanges.transfer_in, selectedAccount.currency) }}</dd>
              </div>
              <div class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 sm:block">
                <dt class="text-xs text-slate-500">取出与转出</dt>
                <dd class="numeric text-base font-semibold sm:mt-1 sm:text-lg text-rose-700">{{ formatAmount(monthChanges.withdrawal + monthChanges.transfer_out, selectedAccount.currency) }}</dd>
              </div>
              <div class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 sm:block">
                <dt class="text-xs text-slate-500">收到利息</dt>
                <dd class="numeric text-base font-semibold sm:mt-1 sm:text-lg text-brand-700">{{ formatAmount(monthChanges.interest, selectedAccount.currency) }}</dd>
              </div>
            </dl>
            <p class="mt-3 text-sm font-medium text-slate-700">
              {{ monthNet === 0 ? '本月余额没有变化。' : `本月比月初${monthNet > 0 ? '多' : '少'} ${formatAmount(Math.abs(monthNet), selectedAccount.currency)}` }}
            </p>
            <p class="mt-1 text-xs leading-5 text-slate-500">只看当前账户；存入、转入和利息增加余额，取出和转出减少余额。</p>
          </template>
          <p v-else class="mt-3 text-sm text-slate-500" role="status">
            {{ loading ? '正在加载本月变化…' : '本月变化暂不可用。' }}
          </p>
        </section>
      </div>
      <section class="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-slate-100 pt-3" aria-labelledby="child-currency-summary-title">
        <h3 id="child-currency-summary-title" class="text-xs text-slate-500">全部账户</h3>
        <dl class="flex flex-wrap gap-x-3 gap-y-1">
          <div v-for="(total, currency) in currencyTotals" :key="currency">
            <dt class="sr-only">{{ currency }}</dt>
            <dd class="numeric text-xs font-semibold text-slate-600">{{ formatAmount(total, currency) }}</dd>
          </div>
        </dl>
      </section>
    </template>
    <div v-else class="mt-4 rounded-2xl bg-slate-50 px-5 py-8 text-center">
      <p class="text-sm font-medium text-slate-600">还没有储蓄账户</p>
      <p class="mt-1 text-xs text-slate-500">请让家长在设置中为你创建第一个账户。</p>
    </div>
    <p v-if="selectedAccount" class="sr-only" role="status" aria-live="polite">
      当前账户：{{ selectedAccount.name }}，余额{{ formatAmount(balances[selectedAccount.id] ?? 0, selectedAccount.currency) }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Account, Transaction } from "../types";

const props = defineProps<{
  groupedAccounts: Record<string, Account[]>;
  selectedAccountId: string | null;
  balances: Record<string, number>;
  monthChanges: Record<Transaction["type"], number> | null;
  loading: boolean;
  formatAmount: (amount: number, currency: string) => string;
  onSelectAccount: (id: string) => void;
}>();

const accounts = computed(() => Object.values(props.groupedAccounts).flat());
const selectedAccount = computed(() => accounts.value.find((account) => account.id === props.selectedAccountId));
const currencyTotals = computed(() =>
  Object.fromEntries(
    Object.entries(props.groupedAccounts).map(([currency, currencyAccounts]) => [
      currency,
      currencyAccounts.reduce((total, account) => total + (props.balances[account.id] ?? 0), 0),
    ]),
  ),
);
const monthNet = computed(() => {
  const totals = props.monthChanges;
  return totals ? Number((totals.deposit + totals.transfer_in + totals.interest - totals.withdrawal - totals.transfer_out).toFixed(2)) : 0;
});
const changeAccount = (event: Event) => {
  const id = (event.target as HTMLSelectElement).value;
  if (accounts.value.some((account) => account.id === id)) props.onSelectAccount(id);
};
</script>
