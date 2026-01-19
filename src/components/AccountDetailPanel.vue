<template>
  <template v-if="selectedAccount">
    <AccountTrendCard
      :chart-path="chartPath"
      :currency="selectedAccount.currency"
    />

    <AccountAdjustmentCard
      v-model:amount-input="amountModel"
      v-model:note-input="noteModel"
      :can-edit="canEdit"
      :selected-child-name="selectedChildName"
      :selected-account-name="selectedAccount.name"
      :loading="loading"
      :on-add-transaction="onAddTransaction"
    />

    <TransferCard
      v-model:transfer-amount="transferAmountModel"
      v-model:transfer-target-id="transferTargetIdModel"
      v-model:transfer-note="transferNoteModel"
      :can-edit="canEdit"
      :transfer-targets="transferTargets"
      :formatted-balance="formattedBalance"
      :loading="loading"
      :on-transfer="onTransfer"
    />

    <TransactionsList
      :transactions="pagedTransactions"
      :has-more="hasMoreTransactions"
      :loading="transactionLoading"
      :transaction-labels="transactionLabels"
      :format-signed-amount="formatSignedAmount"
      :transaction-tone="transactionTone"
      :get-transaction-note="getTransactionNote"
      :format-timestamp="formatTimestamp"
      :on-load-more="onLoadMore"
    />
  </template>
  <p v-else class="text-sm text-slate-500">暂无账户。</p>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AccountAdjustmentCard from "./AccountAdjustmentCard.vue";
import AccountTrendCard from "./AccountTrendCard.vue";
import TransferCard from "./TransferCard.vue";
import TransactionsList from "./TransactionsList.vue";
import type { Account, Transaction, TransferTarget } from "../types";

const props = defineProps<{
  selectedAccount: Account | null;
  selectedChildName: string | null;
  canEdit: boolean;
  chartPath: string;
  amountInput: string;
  noteInput: string;
  transferAmount: string;
  transferTargetId: string;
  transferNote: string;
  transferTargets: TransferTarget[];
  formattedBalance: string;
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
}>();

const emit = defineEmits<{
  (event: "update:amountInput", value: string): void;
  (event: "update:noteInput", value: string): void;
  (event: "update:transferAmount", value: string): void;
  (event: "update:transferTargetId", value: string): void;
  (event: "update:transferNote", value: string): void;
}>();

const amountModel = computed({
  get: () => props.amountInput,
  set: (value) => emit("update:amountInput", value),
});

const noteModel = computed({
  get: () => props.noteInput,
  set: (value) => emit("update:noteInput", value),
});

const transferAmountModel = computed({
  get: () => props.transferAmount,
  set: (value) => emit("update:transferAmount", value),
});

const transferTargetIdModel = computed({
  get: () => props.transferTargetId,
  set: (value) => emit("update:transferTargetId", value),
});

const transferNoteModel = computed({
  get: () => props.transferNote,
  set: (value) => emit("update:transferNote", value),
});
</script>
