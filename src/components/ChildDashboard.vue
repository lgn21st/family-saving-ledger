<template>
  <main id="main-content" class="page-container flex-1 space-y-5 py-5 sm:py-7">
    <ChildAccountNavigatorPanel
      :grouped-accounts="groupedAccounts"
      :selected-account-id="selectedAccountId"
      :balances="balances"
      :format-amount="formatAmount"
      :on-select-account="onSelectAccount"
    />

    <AccountOverviewPanel
      v-if="selectedAccount"
      :selected-account="selectedAccount"
      :chart-points="chartPoints"
      :paged-transactions="pagedTransactions"
      :has-more-transactions="hasMoreTransactions"
      :transaction-loading="transactionLoading"
      :transaction-labels="transactionLabels"
      :format-signed-amount="formatSignedAmount"
      :transaction-tone="transactionTone"
      :get-transaction-note="getTransactionNote"
      :format-timestamp="formatTimestamp"
      :on-load-more="onLoadMore"
    />
  </main>
</template>

<script setup lang="ts">
import AccountOverviewPanel from "./AccountOverviewPanel.vue";
import ChildAccountNavigatorPanel from "./ChildAccountNavigatorPanel.vue";
import type { Account, Transaction } from "../types";
import type { ChartPoint } from "../composables/useChartData";

defineProps<{
  groupedAccounts: Record<string, Account[]>;
  selectedAccountId: string | null;
  selectedAccount: Account | null;
  balances: Record<string, number>;
  formatAmount: (amount: number, currency: string) => string;
  onSelectAccount: (id: string) => void;
  chartPoints: ChartPoint[];
  pagedTransactions: Transaction[];
  hasMoreTransactions: boolean;
  transactionLoading: boolean;
  transactionLabels: Record<Transaction["type"], string>;
  formatSignedAmount: (transaction: Transaction) => string;
  transactionTone: (transaction: Transaction) => string;
  getTransactionNote: (transaction: Transaction) => string;
  formatTimestamp: (value: string) => string;
  onLoadMore: () => void;
}>();
</script>
