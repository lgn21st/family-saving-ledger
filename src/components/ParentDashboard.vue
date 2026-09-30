<template>
  <main
    id="main-content"
    class="page-container ledger-workspace flex-1 pt-5 sm:pt-7"
  >
    <div
      class="space-y-5"
      :inert="showQuickTransaction || undefined"
      :aria-hidden="showQuickTransaction ? 'true' : undefined"
    >
      <LedgerNavigatorPanel
        :currency-totals="currencyTotals"
        :child-users="childUsers"
        :selected-child-id="selectedChildId"
        :selected-child-name="selectedChildName"
        :avatar-options="avatarOptions"
        :accounts="selectedChildAccounts"
        :selected-account-id="selectedAccountId"
        :balances="balances"
        :format-amount="formatAmount"
        :on-select-child="onSelectChild"
        :on-select-account="onSelectAccount"
        :on-open-settings="onOpenSettings"
      />

      <AccountDetailPanel
        v-if="selectedAccount"
        :selected-account="selectedAccount"
        :chart-points="chartPoints"
        :paged-transactions="pagedTransactions"
        :has-more-transactions="hasMoreTransactions"
        :transaction-loading="transactionLoading"
        :can-void="canEdit && !transactionLoading"
        :transaction-labels="transactionLabels"
        :format-signed-amount="formatSignedAmount"
        :transaction-tone="transactionTone"
        :get-transaction-note="getTransactionNote"
        :format-timestamp="formatTimestamp"
        :on-load-more="onLoadMore"
        :on-void-transaction="onVoidTransaction"
      />

      <button
        ref="quickTransactionTrigger"
        type="button"
        class="button-primary quick-entry-trigger fixed right-4 z-40 min-h-12 rounded-2xl px-5 shadow-xl shadow-brand-900/20 sm:right-6 xl:right-8"
        aria-haspopup="dialog"
        :aria-expanded="showQuickTransaction"
        @click="showQuickTransaction = true"
      >
        记一笔
      </button>
    </div>

    <slot
      v-if="showQuickTransaction"
      name="entry"
      :on-close="closeQuickTransaction"
    />
  </main>
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";

import AccountDetailPanel from "./AccountDetailPanel.vue";
import LedgerNavigatorPanel from "./LedgerNavigatorPanel.vue";
import type { Account, AppUser, Transaction } from "../types";
import type { AvatarOption } from "../config";
import type { ChartPoint } from "../composables/useChartData";

const showQuickTransaction = ref(false);
const quickTransactionTrigger = ref<HTMLButtonElement | null>(null);

const closeQuickTransaction = async () => {
  showQuickTransaction.value = false;
  await nextTick();
  quickTransactionTrigger.value?.focus();
};

defineProps<{
  childUsers: AppUser[];
  avatarOptions: AvatarOption[];
  currencyTotals: Record<string, number>;
  formatAmount: (amount: number, currency: string) => string;
  selectedChildId: string | null;
  selectedChildName: string | null;
  onSelectChild: (id: string) => void;
  selectedChildAccounts: Account[];
  selectedAccountId: string | null;
  balances: Record<string, number>;
  onSelectAccount: (id: string) => void;
  onOpenSettings: () => void;
  selectedAccount: Account | null;
  canEdit: boolean;
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
  onVoidTransaction: (transaction: Transaction) => void | Promise<void>;
}>();
</script>
