<template>
  <main class="flex-1 space-y-6 px-6 py-6">
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
      :on-delete-child="onDeleteChild"
    />

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

    <AccountHeader
      v-if="selectedAccount"
      v-model:editing-account-name="editingAccountNameModel"
      :is-editing="editingAccountId === selectedAccount.id"
      :loading="loading"
      :selected-account-name="selectedAccount.name"
      :selected-account-currency="selectedAccount.currency"
      :formatted-balance="selectedAccountBalance"
      :on-update-account="onUpdateAccount"
      :on-cancel-edit-account="onCancelEditAccount"
    />

    <AccountDetailPanel
      v-model:amount-input="amountInputModel"
      v-model:note-input="noteInputModel"
      v-model:transfer-amount="transferAmountModel"
      v-model:transfer-target-id="transferTargetIdModel"
      v-model:transfer-note="transferNoteModel"
      :selected-account="selectedAccount"
      :selected-child-name="selectedChildName"
      :can-edit="canEdit"
      :chart-path="chartPath"
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
  </main>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AccountDetailPanel from "./AccountDetailPanel.vue";
import AccountHeader from "./AccountHeader.vue";
import AccountListPanel from "./AccountListPanel.vue";
import ChildListPanel from "./ChildListPanel.vue";
import ChildManagerCard from "./ChildManagerCard.vue";
import CurrencySummaryGrid from "./CurrencySummaryGrid.vue";
import type { Account, AppUser, Transaction, TransferTarget } from "../types";
import type { AvatarOption } from "../config";

const props = defineProps<{
  showChildManager: boolean;
  childUsers: AppUser[];
  childAvatars: AvatarOption[];
  avatarOptions: AvatarOption[];
  newChildName: string;
  newChildPin: string;
  newChildAvatarId: string;
  editingChildId: string | null;
  editingChildName: string;
  loading: boolean;
  sanitizePin: (value: string) => string;
  onCreateChild: () => void;
  onStartEditChild: (child: AppUser) => void;
  onUpdateChild: () => void;
  onCancelEditChild: () => void;
  onDeleteChild: (id: string) => void;
  currencyTotals: Record<string, number>;
  formatAmount: (amount: number, currency: string) => string;
  selectedChildId: string | null;
  selectedChildName: string | null;
  onSelectChild: (id: string) => void;
  selectedChildAccounts: Account[];
  selectedAccountId: string | null;
  balances: Record<string, number>;
  supportedCurrencies: string[];
  newAccountName: string;
  newAccountCurrency: string;
  newAccountOwnerId: string;
  showAccountCreator: boolean;
  editingAccountId: string | null;
  editingAccountName: string;
  onCreateAccount: () => void;
  onSelectAccount: (id: string) => void;
  onStartEditAccount: (account: Account) => void;
  onUpdateAccount: () => void;
  onCancelEditAccount: () => void;
  onCloseAccount: (account: Account) => void;
  selectedAccount: Account | null;
  canEdit: boolean;
  chartPath: string;
  amountInput: string;
  noteInput: string;
  transferAmount: string;
  transferTargetId: string;
  transferNote: string;
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

const emit = defineEmits<{
  (event: "update:newChildName", value: string): void;
  (event: "update:newChildPin", value: string): void;
  (event: "update:newChildAvatarId", value: string): void;
  (event: "update:editingChildName", value: string): void;
  (event: "update:newAccountName", value: string): void;
  (event: "update:newAccountCurrency", value: string): void;
  (event: "update:newAccountOwnerId", value: string): void;
  (event: "update:showAccountCreator", value: boolean): void;
  (event: "update:editingAccountName", value: string): void;
  (event: "update:amountInput", value: string): void;
  (event: "update:noteInput", value: string): void;
  (event: "update:transferAmount", value: string): void;
  (event: "update:transferTargetId", value: string): void;
  (event: "update:transferNote", value: string): void;
}>();

const newChildNameModel = computed({
  get: () => props.newChildName,
  set: (value) => emit("update:newChildName", value),
});

const newChildPinModel = computed({
  get: () => props.newChildPin,
  set: (value) => emit("update:newChildPin", value),
});

const newChildAvatarIdModel = computed({
  get: () => props.newChildAvatarId,
  set: (value) => emit("update:newChildAvatarId", value),
});

const editingChildNameModel = computed({
  get: () => props.editingChildName,
  set: (value) => emit("update:editingChildName", value),
});

const newAccountNameModel = computed({
  get: () => props.newAccountName,
  set: (value) => emit("update:newAccountName", value),
});

const newAccountCurrencyModel = computed({
  get: () => props.newAccountCurrency,
  set: (value) => emit("update:newAccountCurrency", value),
});

const newAccountOwnerIdModel = computed({
  get: () => props.newAccountOwnerId,
  set: (value) => emit("update:newAccountOwnerId", value),
});

const showAccountCreatorModel = computed({
  get: () => props.showAccountCreator,
  set: (value) => emit("update:showAccountCreator", value),
});

const editingAccountNameModel = computed({
  get: () => props.editingAccountName,
  set: (value) => emit("update:editingAccountName", value),
});

const amountInputModel = computed({
  get: () => props.amountInput,
  set: (value) => emit("update:amountInput", value),
});

const noteInputModel = computed({
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
