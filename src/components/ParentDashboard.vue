<template>
  <main
    id="main-content"
    tabindex="-1"
    class="page-container min-h-0 flex-1 overflow-y-auto py-5 sm:py-7"
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
        :get-transaction-context="getTransactionContext"
        :format-timestamp="formatTimestamp"
        :on-update-note="onUpdateNote"
        :on-load-more="onLoadMore"
        :on-load-all="onLoadAll"
        :on-void-transaction="onVoidTransaction"
      />
    </div>

    <slot
      v-if="showQuickTransaction"
      name="entry"
      :on-close="closeQuickTransaction"
    />
  </main>
  <footer
    class="entry-actionbar shrink-0 border-t border-slate-200 bg-white pt-3"
    :inert="showQuickTransaction || undefined"
    :aria-hidden="showQuickTransaction ? 'true' : undefined"
  >
    <div class="page-container flex justify-end">
      <button
        ref="quickTransactionTrigger"
        type="button"
        class="button-primary min-h-12 px-5"
        aria-haspopup="dialog"
        :aria-expanded="showQuickTransaction"
        @click="showQuickTransaction = true"
      >
        记一笔
      </button>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";

import AccountDetailPanel from "./AccountDetailPanel.vue";
import LedgerNavigatorPanel from "./LedgerNavigatorPanel.vue";
import type { Account, AppUser, Transaction, UpdateTransactionNoteInput, TransactionNoteResult } from "../types";
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
  onOpenSettings: (section: "members" | "accounts") => void;
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
  getTransactionContext: (transaction: Transaction) => string;
  formatTimestamp: (value: string) => string;
  onUpdateNote?: (input: UpdateTransactionNoteInput) => Promise<TransactionNoteResult>;
  onLoadMore: () => void;
  onLoadAll?: () => void | Promise<void>;
  onVoidTransaction: (transaction: Transaction) => void | Promise<void>;
}>();
</script>
