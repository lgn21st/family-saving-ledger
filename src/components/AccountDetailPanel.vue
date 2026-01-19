<template>
  <template v-if="selectedAccount">
    <div class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-semibold text-slate-700">近 30 天余额趋势</h4>
          <p class="text-xs text-slate-400">按日累计余额</p>
        </div>
        <span class="text-xs font-semibold text-brand-600">{{
          selectedAccount.currency
        }}</span>
      </div>
      <div class="mt-4 h-32">
        <svg v-if="chartPath" viewBox="0 0 100 100" class="h-full w-full">
          <path
            :d="chartPath"
            fill="none"
            stroke="url(#sparkline)"
            stroke-width="3"
            stroke-linecap="round"
          />
          <defs>
            <linearGradient id="sparkline" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stop-color="#f97316" />
              <stop offset="50%" stop-color="#a855f7" />
              <stop offset="100%" stop-color="#38bdf8" />
            </linearGradient>
          </defs>
        </svg>
        <p v-else class="text-sm text-slate-400">暂无数据</p>
      </div>
    </div>

    <AccountAdjustmentCard
      :can-edit="canEdit"
      :selected-child-name="selectedChildName"
      :selected-account-name="selectedAccount.name"
      v-model:amount-input="amountModel"
      v-model:note-input="noteModel"
      :loading="loading"
      :on-add-transaction="onAddTransaction"
    />

    <TransferCard
      :can-edit="canEdit"
      v-model:transfer-amount="transferAmountModel"
      v-model:transfer-target-id="transferTargetIdModel"
      v-model:transfer-note="transferNoteModel"
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
