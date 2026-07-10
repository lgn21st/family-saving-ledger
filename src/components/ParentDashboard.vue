<template>
  <main id="main-content" class="page-container flex-1 py-5 sm:py-7">
    <ChildManagerCard
      v-if="showChildManager"
      v-model:new-child-name="newChildNameModel"
      v-model:new-child-pin="newChildPinModel"
      v-model:new-child-avatar-id="newChildAvatarIdModel"
      v-model:editing-child-name="editingChildNameModel"
      :child-users="childUsers"
      :child-avatars="childAvatars"
      :avatar-options="avatarOptions"
      :editing-child-id="editingChildId"
      :loading="loading"
      :sanitize-pin="sanitizePin"
      :on-create-child="onCreateChild"
      :on-start-edit-child="onStartEditChild"
      :on-update-child="onUpdateChild"
      :on-cancel-edit-child="onCancelEditChild"
      :on-archive-child="onArchiveChild"
    />

    <div v-else class="grid items-start gap-5 xl:grid-cols-[350px_minmax(0,1fr)] xl:gap-7">
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

        <AccountListPanel
          v-model:new-account-name="newAccountNameModel"
          v-model:new-account-currency="newAccountCurrencyModel"
          v-model:new-account-owner-id="newAccountOwnerIdModel"
          v-model:show-account-creator="showAccountCreatorModel"
          v-model:editing-account-name="editingAccountNameModel"
          :selected-child-id="selectedChildId"
          :selected-child-name="selectedChildName"
          :child-users="childUsers"
          :selected-child-accounts="selectedChildAccounts"
          :selected-account-id="selectedAccountId"
          :balances="balances"
          :supported-currencies="supportedCurrencies"
          :loading="loading"
          :editing-account-id="editingAccountId"
          :format-amount="formatAmount"
          :on-create-account="onCreateAccount"
          :on-select-account="onSelectAccount"
          :on-start-edit-account="onStartEditAccount"
          :on-update-account="onUpdateAccount"
          :on-cancel-edit-account="onCancelEditAccount"
          :on-close-account="onCloseAccount"
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
          <AccountHeader
            v-model:editing-account-name="editingAccountNameModel"
            :is-editing="editingAccountId === selectedAccount.id"
            :loading="loading"
            :selected-account-name="selectedAccount.name"
            :selected-account-currency="selectedAccount.currency"
            :formatted-balance="selectedAccountBalance"
            :on-update-account="onUpdateAccount"
            :on-cancel-edit-account="onCancelEditAccount"
          />
        </section>
        <section v-else class="surface-card p-8 text-center sm:p-12">
          <p class="section-kicker">账户工作区</p>
          <h2 class="mt-3 text-xl font-semibold text-slate-950">先选择一个账户</h2>
          <p class="mt-2 text-sm text-slate-500">
            选择孩子和账户后，可查看余额趋势、记录收支和转账。
          </p>
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
import AccountHeader from "./AccountHeader.vue";
import AccountListPanel from "./AccountListPanel.vue";
import ChildListPanel from "./ChildListPanel.vue";
import ChildManagerCard from "./ChildManagerCard.vue";
import CurrencySummaryGrid from "./CurrencySummaryGrid.vue";
import QuickTransactionSheet from "./QuickTransactionSheet.vue";
import type { Account, AppUser, Transaction, TransferTarget } from "../types";
import type { AvatarOption } from "../config";
import type { ChartPoint } from "../composables/useChartData";

const newChildNameModel = defineModel<string>("newChildName", { required: true });
const newChildPinModel = defineModel<string>("newChildPin", { required: true });
const newChildAvatarIdModel = defineModel<string>("newChildAvatarId", {
  required: true,
});
const editingChildNameModel = defineModel<string>("editingChildName", {
  required: true,
});
const newAccountNameModel = defineModel<string>("newAccountName", { required: true });
const newAccountCurrencyModel = defineModel<string>("newAccountCurrency", {
  required: true,
});
const newAccountOwnerIdModel = defineModel<string>("newAccountOwnerId", {
  required: true,
});
const showAccountCreatorModel = defineModel<boolean>("showAccountCreator", {
  required: true,
});
const editingAccountNameModel = defineModel<string>("editingAccountName", {
  required: true,
});
const amountInputModel = defineModel<string>("amountInput", { required: true });
const noteInputModel = defineModel<string>("noteInput", { required: true });
const transferAmountModel = defineModel<string>("transferAmount", { required: true });
const transferTargetIdModel = defineModel<string>("transferTargetId", {
  required: true,
});
const transferNoteModel = defineModel<string>("transferNote", { required: true });
const showQuickTransaction = ref(false);
const quickTransactionTrigger = ref<HTMLButtonElement | null>(null);

const closeQuickTransaction = async () => {
  showQuickTransaction.value = false;
  await nextTick();
  quickTransactionTrigger.value?.focus();
};

defineProps<{
  showChildManager: boolean;
  childUsers: AppUser[];
  childAvatars: AvatarOption[];
  avatarOptions: AvatarOption[];
  editingChildId: string | null;
  loading: boolean;
  sanitizePin: (value: string) => string;
  onCreateChild: () => void;
  onStartEditChild: (child: AppUser) => void;
  onUpdateChild: () => void;
  onCancelEditChild: () => void;
  onArchiveChild: (id: string) => void;
  currencyTotals: Record<string, number>;
  formatAmount: (amount: number, currency: string) => string;
  selectedChildId: string | null;
  selectedChildName: string | null;
  onSelectChild: (id: string) => void;
  selectedChildAccounts: Account[];
  selectedAccountId: string | null;
  balances: Record<string, number>;
  supportedCurrencies: string[];
  editingAccountId: string | null;
  onCreateAccount: () => void;
  onSelectAccount: (id: string) => void;
  onStartEditAccount: (account: Account) => void;
  onUpdateAccount: () => void;
  onCancelEditAccount: () => void;
  onCloseAccount: (account: Account) => void;
  selectedAccount: Account | null;
  canEdit: boolean;
  chartPoints: ChartPoint[];
  transferTargets: TransferTarget[];
  selectedAccountBalance: string;
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
