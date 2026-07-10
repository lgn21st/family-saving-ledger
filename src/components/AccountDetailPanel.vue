<template>
  <div v-if="selectedAccount" class="space-y-5">
    <div class="grid items-stretch gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <AccountTrendCard
        :chart-points="chartPoints"
        :currency="selectedAccount.currency"
      />
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
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
      </div>
    </div>

    <TransactionsList
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
  </div>
  <p v-else class="surface-card p-8 text-center text-sm text-slate-500">暂无账户。</p>
</template>

<script setup lang="ts">
import AccountAdjustmentCard from "./AccountAdjustmentCard.vue";
import AccountTrendCard from "./AccountTrendCard.vue";
import TransferCard from "./TransferCard.vue";
import TransactionsList from "./TransactionsList.vue";
import type { Account, Transaction, TransferTarget } from "../types";
import type { ChartPoint } from "../composables/useChartData";

const amountModel = defineModel<string>("amountInput", { required: true });
const noteModel = defineModel<string>("noteInput", { required: true });
const transferAmountModel = defineModel<string>("transferAmount", { required: true });
const transferTargetIdModel = defineModel<string>("transferTargetId", {
  required: true,
});
const transferNoteModel = defineModel<string>("transferNote", { required: true });

defineProps<{
  selectedAccount: Account | null;
  selectedChildName: string | null;
  canEdit: boolean;
  chartPoints: ChartPoint[];
  transferTargets: TransferTarget[];
  formattedBalance: string;
  loading: boolean;
  pagedTransactions: Transaction[];
  hasMoreTransactions: boolean;
  transactionLoading: boolean;
  canVoid: boolean;
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
