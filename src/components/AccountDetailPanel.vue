<template>
  <div v-if="selectedAccount" class="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:items-start">
    <TransactionsList
      :key="selectedAccount.id"
      class="xl:order-2"
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
    <AccountTrendCard class="xl:order-1" :chart-points="chartPoints" :currency="selectedAccount.currency" />
  </div>
  <p v-else class="surface-card p-8 text-center text-sm text-slate-500">暂无账户。</p>
</template>

<script setup lang="ts">
import AccountTrendCard from "./AccountTrendCard.vue";
import TransactionsList from "./TransactionsList.vue";
import type { Account, Transaction } from "../types";
import type { ChartPoint } from "../composables/useChartData";

defineProps<{
  selectedAccount: Account | null;
  chartPoints: ChartPoint[];
  pagedTransactions: Transaction[];
  hasMoreTransactions: boolean;
  transactionLoading: boolean;
  canVoid: boolean;
  transactionLabels: Record<Transaction["type"], string>;
  formatSignedAmount: (transaction: Transaction) => string;
  transactionTone: (transaction: Transaction) => string;
  getTransactionNote: (transaction: Transaction) => string;
  formatTimestamp: (value: string) => string;
  onLoadMore: () => void;
  onVoidTransaction: (transaction: Transaction) => void | Promise<void>;
}>();
</script>
