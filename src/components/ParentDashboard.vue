<template>
  <main id="main-content" class="page-container flex-1 py-5 sm:py-7">
    <div class="space-y-5">
      <LedgerNavigatorPanel
        :currency-totals="currencyTotals"
        :child-users="childUsers"
        :selected-child-id="selectedChildId"
        :selected-child-name="selectedChildName"
        :avatar-options="avatarOptions"
        :accounts="selectedChildAccounts"
        :selected-account-id="selectedAccountId"
        :selected-account="selectedAccount"
        :selected-account-balance="selectedAccountBalance"
        :balances="balances"
        :format-amount="formatAmount"
        :on-select-child="onSelectChild"
        :on-select-account="onSelectAccount"
        :on-open-settings="onOpenSettings"
      />

      <AccountDetailPanel
        v-if="selectedAccount"
        v-model:amount-input="amountInputModel"
        v-model:note-input="noteInputModel"
        v-model:transfer-amount="transferAmountModel"
        v-model:transfer-target-id="transferTargetIdModel"
        v-model:transfer-note="transferNoteModel"
        :selected-account="selectedAccount"
        :selected-child-name="selectedChildName"
        :can-edit="canEdit"
        :chart-points="chartPoints"
        :transfer-targets="transferTargets"
        :formatted-balance="selectedAccountBalance"
        :loading="loading"
        :paged-transactions="pagedTransactions"
        :has-more-transactions="hasMoreTransactions"
        :transaction-loading="transactionLoading"
        :can-void="canEdit"
        :transaction-labels="transactionLabels"
        :format-signed-amount="formatSignedAmount"
        :transaction-tone="transactionTone"
        :get-transaction-note="getTransactionNote"
        :format-timestamp="formatTimestamp"
        :on-add-transaction="onAddTransaction"
        :on-transfer="onTransfer"
        :on-load-more="onLoadMore"
        :on-void-transaction="onVoidTransaction"
      />

      <button
        ref="quickTransactionTrigger"
        type="button"
        class="button-primary fixed right-4 bottom-4 z-40 min-h-12 rounded-2xl px-5 shadow-xl shadow-brand-900/20 sm:right-6 sm:bottom-6 xl:right-8"
        aria-haspopup="dialog"
        :aria-expanded="showQuickTransaction"
        @click="showQuickTransaction = true"
      >
        记一笔
      </button>

      <QuickTransactionSheet
        v-if="showQuickTransaction"
        v-model:amount-input="amountInputModel"
        v-model:note-input="noteInputModel"
        :child-users="childUsers"
        :selected-child-id="selectedChildId"
        :selected-child-accounts="selectedChildAccounts"
        :selected-account-id="selectedAccountId"
        :formatted-balance="selectedAccountBalance"
        :loading="loading"
        :on-select-child="onSelectChild"
        :on-select-account="onSelectAccount"
        :on-add-transaction="onAddTransaction"
        :on-close="closeQuickTransaction"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";

import AccountDetailPanel from "./AccountDetailPanel.vue";
import LedgerNavigatorPanel from "./LedgerNavigatorPanel.vue";
import QuickTransactionSheet from "./QuickTransactionSheet.vue";
import type { Account, AppUser, Transaction, TransferTarget } from "../types";
import type { AvatarOption } from "../config";
import type { ChartPoint } from "../composables/useChartData";

const amountInputModel = defineModel<string>("amountInput", { required: true });
const noteInputModel = defineModel<string>("noteInput", { required: true });
const transferAmountModel = defineModel<string>("transferAmount", { required: true });
const transferTargetIdModel = defineModel<string>("transferTargetId", { required: true });
const transferNoteModel = defineModel<string>("transferNote", { required: true });
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
  transferTargets: TransferTarget[];
  selectedAccountBalance: string;
  loading: boolean;
  pagedTransactions: Transaction[];
  hasMoreTransactions: boolean;
  transactionLoading: boolean;
  transactionLabels: Record<Transaction["type"], string>;
  formatSignedAmount: (transaction: Transaction) => string;
  transactionTone: (transaction: Transaction) => string;
  getTransactionNote: (transaction: Transaction) => string;
  formatTimestamp: (value: string) => string;
  onAddTransaction: (type: "deposit" | "withdrawal") => void;
  onTransfer: () => void;
  onLoadMore: () => void;
  onVoidTransaction: (transaction: Transaction) => void;
}>();
</script>
