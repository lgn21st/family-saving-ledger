<template>
  <div class="flex flex-1 flex-col lg:flex-row">
    <AccountSidebar
      :grouped-accounts="groupedAccounts"
      :selected-account-id="selectedAccountId"
      :balances="balances"
      :format-amount="formatAmount"
      :on-select-account="onSelectAccount"
    />

    <section class="order-3 flex-1 space-y-6 px-6 py-6 lg:order-2">
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
        :chart-path="chartPath"
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
  </div>
</template>

<script setup lang="ts">
import AccountOverviewPanel from "./AccountOverviewPanel.vue";
import AccountSidebar from "./AccountSidebar.vue";
import type { Account, Transaction } from "../types";

defineProps<{
  groupedAccounts: Record<string, Account[]>;
  selectedAccountId: string | null;
  selectedAccount: Account | null;
  balances: Record<string, number>;
  formatAmount: (amount: number, currency: string) => string;
  onSelectAccount: (id: string) => void;
  chartPath: string;
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
