<template>
  <div class="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:items-start">
    <TransactionsList
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
</template>

<script setup lang="ts">
import AccountTrendCard from "./AccountTrendCard.vue";
import TransactionsList from "./TransactionsList.vue";
import type { Account, Transaction } from "../types";
import type { ChartPoint } from "../composables/useChartData";

defineProps<{
  selectedAccount: Account;
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
