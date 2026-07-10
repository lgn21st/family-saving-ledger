<template>
  <div v-if="selectedAccount" class="space-y-5">
    <section class="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8">
      <p class="section-kicker text-brand-300">我的账户 · {{ selectedAccount.currency }}</p>
      <div class="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0">
          <h2 class="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
            {{ selectedAccount.name }}
          </h2>
          <p class="mt-2 text-sm text-slate-400">只读查看 · 每笔变化都由家长记录</p>
        </div>
        <div class="shrink-0 sm:text-right">
          <p class="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">当前余额</p>
          <p class="numeric mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            {{ formattedBalance }}
          </p>
        </div>
      </div>
    </section>

    <AccountTrendCard :chart-points="chartPoints" :currency="selectedAccount.currency" />

    <TransactionsList
      :transactions="pagedTransactions"
      :has-more="hasMoreTransactions"
      :loading="transactionLoading"
      :can-void="canVoid"
      :transaction-labels="transactionLabels"
      :format-signed-amount="formatSignedAmount"
      :transaction-tone="transactionTone"
      :get-transaction-note="getTransactionNote"
      :format-timestamp="formatTimestamp"
      :on-load-more="onLoadMore"
      :on-void-transaction="onVoidTransaction"
    />
  </div>
  <section v-else class="surface-card p-10 text-center">
    <p class="section-kicker">我的储蓄</p>
    <h2 class="mt-3 text-xl font-semibold text-slate-950">暂无账户。</h2>
    <p class="mt-2 text-sm text-slate-500">请让家长为你创建第一个储蓄账户。</p>
  </section>
</template>

<script setup lang="ts">
import AccountTrendCard from "./AccountTrendCard.vue";
import TransactionsList from "./TransactionsList.vue";
import type { Account, Transaction } from "../types";
import type { ChartPoint } from "../composables/useChartData";

defineProps<{
  selectedAccount: Account | null;
  formattedBalance: string;
  chartPoints: ChartPoint[];
  pagedTransactions: Transaction[];
  hasMoreTransactions: boolean;
  transactionLoading: boolean;
  canVoid?: boolean;
  transactionLabels: Record<Transaction["type"], string>;
  formatSignedAmount: (transaction: Transaction) => string;
  transactionTone: (transaction: Transaction) => string;
  getTransactionNote: (transaction: Transaction) => string;
  formatTimestamp: (value: string) => string;
  onLoadMore: () => void;
  onVoidTransaction?: (transaction: Transaction) => void;
}>();
</script>
