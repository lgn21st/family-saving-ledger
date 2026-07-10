<template>
  <main
    id="main-content"
    class="page-container grid flex-1 items-start gap-5 py-5 sm:py-7 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-7"
  >
    <AccountSidebar
      :grouped-accounts="groupedAccounts"
      :selected-account-id="selectedAccountId"
      :balances="balances"
      :format-amount="formatAmount"
      :on-select-account="onSelectAccount"
    />

    <section class="min-w-0">
      <AccountOverviewPanel
        :selected-account="selectedAccount"
        :formatted-balance="
          selectedAccount
            ? formatAmount(
                balances[selectedAccount.id] ?? 0,
                selectedAccount.currency,
              )
            : '0.00'
        "
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
    </section>
  </main>
</template>

<script setup lang="ts">
import AccountOverviewPanel from "./AccountOverviewPanel.vue";
import AccountSidebar from "./AccountSidebar.vue";
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
