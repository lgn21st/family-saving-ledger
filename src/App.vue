<template>
  <LoginPage
    v-if="!user"
    v-model:login-pin="loginPin"
    :is-supabase-configured="isSupabaseConfigured"
    :login-users="loginUsers"
    :selected-login-user-id="selectedLoginUserId"
    :loading="loading"
    :selected-login-user="selectedLoginUser"
    :session-status="sessionStatus"
    :status="status"
    :avatar-options="avatarOptions"
    :sanitize-pin="sanitizePin"
    :on-select-login-user="selectLoginUser"
    :on-login="handleLogin"
  />

  <AppShell
    v-else
    :user="user"
    :avatar-options="avatarOptions"
    :can-edit="canEdit"
    :show-child-manager="showChildManager"
    :on-toggle-child-manager="toggleChildManager"
    :on-logout="handleLogout"
    :status="status"
    :status-tone="statusTone"
  >
    <ParentDashboard
      v-if="user.role === 'parent'"
      v-model:new-child-name="newChildName"
      v-model:new-child-pin="newChildPin"
      v-model:new-child-avatar-id="newChildAvatarId"
      v-model:editing-child-name="editingChildName"
      v-model:new-account-name="newAccountName"
      v-model:new-account-currency="newAccountCurrency"
      v-model:new-account-owner-id="newAccountOwnerId"
      v-model:show-account-creator="showAccountCreator"
      v-model:editing-account-name="editingAccountName"
      v-model:amount-input="amountInput"
      v-model:note-input="noteInput"
      v-model:transfer-amount="transferAmount"
      v-model:transfer-target-id="transferTargetId"
      v-model:transfer-note="transferNote"
      :show-child-manager="showChildManager"
      :child-users="childUsers"
      :child-avatars="childAvatars"
      :avatar-options="avatarOptions"
      :editing-child-id="editingChildId"
      :loading="loading"
      :sanitize-pin="sanitizePin"
      :on-create-child="handleCreateChild"
      :on-start-edit-child="startEditChild"
      :on-update-child="handleUpdateChild"
      :on-cancel-edit-child="cancelEditChild"
      :on-delete-child="handleDeleteChild"
      :currency-totals="currencyTotals"
      :format-amount="formatAmount"
      :selected-child-id="selectedChildId"
      :selected-child-name="selectedChild?.name ?? null"
      :on-select-child="selectChild"
      :selected-child-accounts="selectedChildAccounts"
      :selected-account-id="selectedAccountId"
      :balances="balances"
      :supported-currencies="supportedCurrencies"
      :editing-account-id="editingAccountId"
      :on-create-account="handleCreateAccount"
      :on-select-account="selectAccount"
      :on-start-edit-account="startEditAccount"
      :on-update-account="handleUpdateAccount"
      :on-cancel-edit-account="cancelEditAccount"
      :selected-account="selectedAccount"
      :can-edit="canEdit"
      :chart-path="chartPath"
      :transfer-targets="transferTargets"
      :selected-account-balance="
        selectedAccount
          ? formatAmount(
              balances[selectedAccount.id] ?? 0,
              selectedAccount.currency,
            )
          : '0.00'
      "
      :paged-transactions="pagedTransactions"
      :has-more-transactions="hasMoreTransactions"
      :transaction-loading="transactionLoading"
      :transaction-labels="transactionLabels"
      :format-signed-amount="formatSignedAmount"
      :transaction-tone="transactionTone"
      :get-transaction-note="getTransactionNote"
      :format-timestamp="formatTimestamp"
      :on-add-transaction="handleAddTransaction"
      :on-transfer="handleTransfer"
      :on-load-more="handleLoadMoreForSelected"
      :on-void-transaction="handleVoidTransaction"
    />

    <ChildDashboard
      v-else
      :grouped-accounts="groupedAccounts"
      :selected-account-id="selectedAccountId"
      :selected-account="selectedAccount"
      :balances="balances"
      :format-amount="formatAmount"
      :on-select-account="selectAccount"
      :chart-path="chartPath"
      :paged-transactions="pagedTransactions"
      :has-more-transactions="hasMoreTransactions"
      :transaction-loading="transactionLoading"
      :transaction-labels="transactionLabels"
      :format-signed-amount="formatSignedAmount"
      :transaction-tone="transactionTone"
      :get-transaction-note="getTransactionNote"
      :format-timestamp="formatTimestamp"
      :on-load-more="handleLoadMoreForSelected"
    />
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import AppShell from "./components/AppShell.vue";
import ChildDashboard from "./components/ChildDashboard.vue";
import ParentDashboard from "./components/ParentDashboard.vue";
import LoginPage from "./components/LoginPage.vue";
import { avatarOptions, supportedCurrencies } from "./config";
import { useAccounts } from "./composables/useAccounts";
import { useAccountEditor } from "./composables/useAccountEditor";
import { useAccountSelection } from "./composables/useAccountSelection";
import { useChildren } from "./composables/useChildren";
import { useAuth } from "./composables/useAuth";
import { useAppBootstrap } from "./composables/useAppBootstrap";
import { useChartData } from "./composables/useChartData";
import { useCurrencyDisplay } from "./composables/useCurrencyDisplay";
import { useDerivedViews } from "./composables/useDerivedViews";
import { useSelectionSync } from "./composables/useSelectionSync";
import { useSessionActions } from "./composables/useSessionActions";
import { useStatus } from "./composables/useStatus";
import { useTransactionActions } from "./composables/useTransactionActions";
import { useTransactionDisplay } from "./composables/useTransactionDisplay";
import { useTransactionPaging } from "./composables/useTransactionPaging";
import { useTransfers } from "./composables/useTransfers";
import { useTransactions } from "./composables/useTransactions";
import { useUsers } from "./composables/useUsers";
import type {
  AppUser,
  Transaction,
  SupabaseClient,
  SupabaseFromClient,
  SupabaseRpcClient,
} from "./types";
import { sanitizePin } from "./utils/formatting";

const childAvatars = avatarOptions.filter((avatar) => avatar.role === "child");

const user = ref<AppUser | null>(null);
const loginPin = ref("");
const selectedLoginUserId = ref<string | null>(null);
const selectedAccountId = ref<string | null>(null);
const { status, statusTone, setStatus, setErrorStatus, setSuccessStatus } =
  useStatus();

const supabaseFrom = supabase as unknown as SupabaseFromClient;
const supabaseRpc = supabase as unknown as SupabaseRpcClient;
const supabaseClient = supabase as unknown as SupabaseClient;
const includeVoidedTransactions = computed(
  () => user.value?.role === "parent",
);
const { childUsers, loginUsers, loadChildUsers, loadLoginUsers } = useUsers({
  supabase: supabaseFrom,
  setErrorStatus,
});
const { accounts, balances, loadAccounts, loadBalances } = useAccounts({
  supabase: supabaseFrom,
  setErrorStatus,
});
const { groupedAccounts, currencyTotals, formatAmount } = useCurrencyDisplay({
  accounts,
  balances,
});
const {
  transactionLabels,
  signedAmount,
  transactionTone,
  formatSignedAmount,
  formatTimestamp,
  getTransactionNote,
} = useTransactionDisplay({
  accounts,
  childUsers,
});
const loading = ref(false);
const amountInput = ref("");
const noteInput = ref("");
const transferAmount = ref("");
const transferTargetId = ref("");
const transferNote = ref("");
const newAccountName = ref("");
const newAccountCurrency = ref("SGD");
const newAccountOwnerId = ref("");
const newChildName = ref("");
const newChildPin = ref("");
const newChildAvatarId = ref(childAvatars[0]?.id ?? "");
const editingChildId = ref<string | null>(null);
const editingChildName = ref("");
const editingAccountId = ref<string | null>(null);
const editingAccountName = ref("");
const sessionStatus = ref<string | null>(null);
const selectedChildId = ref<string | null>(null);
const showChildManager = ref(false);
const showAccountCreator = ref(false);

const {
  transactions,
  chartTransactions,
  chartBaseBalance,
  transactionLoading,
  hasMoreTransactions,
  clearTransactions,
  resetSelectedAccountData,
  handleLoadMoreTransactions,
} = useTransactions({
  supabase: supabaseClient,
  includeVoided: includeVoidedTransactions,
  setErrorStatus,
});

const {
  selectAccount,
  selectedAccount,
  selectedChild,
  selectedChildAccounts,
  canEdit,
  transferTargets,
} = useAccountSelection({
  user,
  accounts,
  childUsers,
  selectedAccountId,
  selectedChildId,
});

const { selectedLoginUser, pagedTransactions } = useDerivedViews({
  loginUsers,
  selectedLoginUserId,
  selectedAccount,
  transactions,
});

const { chartPath } = useChartData({
  selectedAccount,
  chartTransactions,
  chartBaseBalance,
  signedAmount,
});

const selectChild = (childId: string) => {
  selectedChildId.value = childId;
};

const toggleChildManager = () => {
  showChildManager.value = !showChildManager.value;
};

const currentUserId = computed(() => user.value?.id ?? null);

const { handleLogin, checkSession } = useAuth({
  supabase: supabaseFrom,
  user,
  loginPin,
  selectedLoginUserId,
  isSupabaseConfigured,
  sessionStatus,
  loading,
  setStatus,
});

const { loadLoginUsersAndSelect, bootstrap } = useAppBootstrap({
  isSupabaseConfigured,
  user,
  loginUsers,
  selectedLoginUserId,
  loadLoginUsers,
  checkSession,
  loadAccounts,
  loadChildUsers,
});

const {
  selectLoginUser,
  refreshAccountData,
  handleLogout,
} = useSessionActions({
  user,
  accounts,
  balances,
  loginPin,
  selectedLoginUserId,
  selectedAccountId,
  selectedChildId,
  showChildManager,
  showAccountCreator,
  clearTransactions,
  setStatus,
  loadBalances,
  resetSelectedAccountData,
  selectedAccount,
});

const { handleCreateChild, handleDeleteChild, handleUpdateChild } =
  useChildren({
    supabase: supabaseFrom,
    user,
    loading,
    newChildName,
    newChildPin,
    newChildAvatarId,
    defaultAvatarId: childAvatars[0]?.id ?? "",
    editingChildId,
    editingChildName,
    cancelEditChild: () => {
      editingChildId.value = null;
      editingChildName.value = "";
    },
    setStatus,
    setErrorStatus,
    setSuccessStatus,
    loadChildUsers,
    loadLoginUsersAndSelect,
    loadAccounts,
  });

const { handleTransfer } = useTransfers({
  supabase: supabaseRpc,
  userId: currentUserId,
  selectedAccountId,
  transferAmount,
  transferTargetId,
  transferNote,
  accounts,
  balances,
  loading,
  setStatus,
  setErrorStatus,
  setSuccessStatus,
  refreshAccountData,
});

const { handleCreateAccount, handleUpdateAccount, startEditAccount } =
  useAccountEditor({
    supabase: supabaseFrom,
    user,
    supportedCurrencies,
    loading,
    newAccountName,
    newAccountCurrency,
    newAccountOwnerId,
    editingAccountId,
    editingAccountName,
    setStatus,
    setErrorStatus,
    setSuccessStatus,
    loadAccounts,
    cancelEditAccount: () => {
      editingAccountId.value = null;
      editingAccountName.value = "";
    },
  });

const { handleAddTransaction } = useTransactionActions({
  supabase: supabaseRpc,
  userId: currentUserId,
  selectedAccountId,
  amountInput,
  noteInput,
  loading,
  setStatus,
  setErrorStatus,
  setSuccessStatus,
  refreshAccountData,
});

const handleVoidTransaction = async (transaction: Transaction) => {
  if (!user.value || transaction.is_void) return;

  loading.value = true;
  const { error } = await supabaseRpc.rpc("void_transaction", {
    p_transaction_id: transaction.id,
    p_voided_by: user.value.id,
  });

  if (error) {
    setErrorStatus(error.message);
    loading.value = false;
    return;
  }

  setSuccessStatus("交易已作废。");
  await refreshAccountData();
  loading.value = false;
};
const { handleLoadMoreForSelected } = useTransactionPaging({
  selectedAccount,
  handleLoadMoreTransactions,
});

const startEditChild = (child: AppUser) => {
  editingChildId.value = child.id;
  editingChildName.value = child.name;
};

const cancelEditChild = () => {
  editingChildId.value = null;
  editingChildName.value = "";
};

const cancelEditAccount = () => {
  editingAccountId.value = null;
  editingAccountName.value = "";
};

useSelectionSync({
  supportedCurrencies,
  selectedChildId,
  selectedAccountId,
  selectedAccount,
  childUsers,
  accounts,
  transactions,
  user,
  showAccountCreator,
  newAccountName,
  newAccountCurrency,
  newAccountOwnerId,
  editingAccountId,
  cancelEditAccount,
  clearTransactions,
  resetSelectedAccountData,
});

onMounted(async () => {
  await bootstrap();
});
</script>
