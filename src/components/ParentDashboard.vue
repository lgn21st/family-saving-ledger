<template>
  <main id="main-content" class="page-container flex-1 py-5 sm:py-7">
    <div class="grid items-start gap-5 xl:grid-cols-[350px_minmax(0,1fr)] xl:gap-7">
      <aside class="space-y-5 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-1">
        <CurrencySummaryGrid
          :currency-totals="currencyTotals"
          :format-amount="formatAmount"
        />

        <ChildListPanel
          :child-users="childUsers"
          :selected-child-id="selectedChildId"
          :avatar-options="avatarOptions"
          :on-select-child="onSelectChild"
        />

        <AccountNavigationPanel
          :accounts="selectedChildAccounts"
          :selected-account-id="selectedAccountId"
          :selected-child-name="selectedChildName"
          :balances="balances"
          :format-amount="formatAmount"
          :on-select-account="onSelectAccount"
          :on-open-settings="onOpenSettings"
        />
      </aside>

      <section class="min-w-0 space-y-5">
        <section
          v-if="selectedAccount"
          class="overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8"
        >
          <p class="section-kicker text-brand-300">
            {{ selectedChildName }} · {{ selectedAccount.currency }} 账户
          </p>
          <div class="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div class="min-w-0">
              <h2 class="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                {{ selectedAccount.name }}
              </h2>
              <p class="mt-2 text-sm text-slate-400">查看趋势、记录收支或在同币种账户间转账</p>
            </div>
            <div class="shrink-0 sm:text-right">
              <p class="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">当前余额</p>
              <p class="numeric mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                {{ selectedAccountBalance }}
              </p>
            </div>
          </div>
        </section>
        <section v-else class="surface-card p-8 text-center sm:p-12">
          <p class="section-kicker">账户工作区</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-950">先选择一个账户</h2>
          <p class="mt-2 text-sm text-slate-500">
            选择孩子和账户后，可查看余额趋势、记录收支和转账。
          </p>
          <button type="button" class="button-secondary mt-4" @click="onOpenSettings">
            管理账户
          </button>
        </section>

        <AccountDetailPanel
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
      </section>

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
import AccountNavigationPanel from "./AccountNavigationPanel.vue";
import ChildListPanel from "./ChildListPanel.vue";
import CurrencySummaryGrid from "./CurrencySummaryGrid.vue";
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
