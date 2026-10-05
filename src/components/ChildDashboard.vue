<template>
  <main id="main-content" tabindex="-1" class="page-container min-h-0 flex-1 space-y-5 overflow-y-auto py-5 sm:py-7">
    <ChildAccountNavigatorPanel
      :grouped-accounts="groupedAccounts"
      :selected-account-id="selectedAccountId"
      :balances="balances"
      :month-changes="monthChanges"
      :loading="transactionLoading"
      :format-amount="formatAmount"
      :on-select-account="onSelectAccount"
    />

    <AccountDetailPanel
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
      :on-load-note-history="onLoadNoteHistory"
      :on-load-more="onLoadMore"
      :on-load-all="onLoadAll"
    />
  </main>
</template>

<script setup lang="ts">
import AccountDetailPanel from "./AccountDetailPanel.vue";
import ChildAccountNavigatorPanel from "./ChildAccountNavigatorPanel.vue";
import type { Account, Transaction, NoteHistoryResult } from "../types";
import type { ChartPoint } from "../composables/useChartData";

defineProps<{
  groupedAccounts: Record<string, Account[]>;
  selectedAccountId: string | null;
  selectedAccount: Account | null;
  balances: Record<string, number>;
  formatAmount: (amount: number, currency: string) => string;
  onSelectAccount: (id: string) => void;
  chartPoints: ChartPoint[];
  monthChanges: Record<Transaction["type"], number> | null;
  pagedTransactions: Transaction[];
  hasMoreTransactions: boolean;
  transactionLoading: boolean;
  transactionLabels: Record<Transaction["type"], string>;
  formatSignedAmount: (transaction: Transaction) => string;
  transactionTone: (transaction: Transaction) => string;
  getTransactionNote: (transaction: Transaction) => string;
  formatTimestamp: (value: string) => string;
  onLoadNoteHistory?: (transactionId: string) => Promise<NoteHistoryResult>;
  onLoadMore: () => void;
  onLoadAll?: () => void | Promise<void>;
}>();
</script>
