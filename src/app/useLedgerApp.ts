import { computed, onMounted, ref } from "vue";

import { avatarOptions, supportedCurrencies } from "../config";
import { useAccountEditor } from "../composables/useAccountEditor";
import { useAccountSelection } from "../composables/useAccountSelection";
import { useAccounts } from "../composables/useAccounts";
import { useAuth } from "../composables/useAuth";
import { useBootstrap } from "../composables/useBootstrap";
import { useChartData } from "../composables/useChartData";
import { useChildren } from "../composables/useChildren";
import { useCurrency } from "../composables/useCurrency";
import { useSelectionSync } from "../composables/useSelectionSync";
import { useSession } from "../composables/useSession";
import { useStatus } from "../composables/useStatus";
import { useTransactionActions } from "../composables/useTransactionActions";
import { useTransactionDisplay } from "../composables/useTransactionDisplay";
import { useTransactions } from "../composables/useTransactions";
import { useTransfers } from "../composables/useTransfers";
import { useUsers } from "../composables/useUsers";
import { isSupabaseConfigured, supabase } from "../supabaseClient";
import type {
  AppUser,
  SupabaseClient,
  SupabaseFromClient,
  SupabaseRpcClient,
  Transaction,
} from "../types";
import { sanitizePin } from "../utils/formatting";

const ARCHIVE_CHILD_CONFIRMATION =
  "确认归档该孩子？\n所有账户余额必须先清零；孩子和账户将隐藏，但历史账本会保留。\n本月尚未结算的利息不会补发。";

export const useLedgerApp = () => {
  const childAvatars = avatarOptions.filter((avatar) => avatar.role === "child");
  const user = ref<AppUser | null>(null);
  const loginPin = ref("");
  const selectedLoginUserId = ref<string | null>(null);
  const selectedAccountId = ref<string | null>(null);
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
  const showSettings = ref(false);
  const showAccountCreator = ref(false);

  const { status, statusTone, setStatus, setErrorStatus, setSuccessStatus } =
    useStatus();
  const supabaseFrom = supabase as unknown as SupabaseFromClient;
  const supabaseRpc = supabase as unknown as SupabaseRpcClient;
  const supabaseClient = supabase as unknown as SupabaseClient;
  const includeVoidedTransactions = computed(() => user.value?.role === "parent");
  const currentUserId = computed(() => user.value?.id ?? null);

  const { childUsers, loginUsers, loadChildUsers, loadLoginUsers } = useUsers({
    supabase: supabaseFrom,
    setErrorStatus,
  });
  const { accounts, balances, loadAccounts, loadBalances } = useAccounts({
    supabase: supabaseFrom,
    setErrorStatus,
  });
  const { groupedAccounts, currencyTotals, formatAmount } = useCurrency({
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
  } = useTransactionDisplay({ accounts, childUsers });
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

  const selectedLoginUser = computed(
    () =>
      loginUsers.value.find(
        (entry) => entry.id === selectedLoginUserId.value,
      ) ?? null,
  );
  const pagedTransactions = computed(() =>
    selectedAccount.value ? transactions.value : [],
  );
  const selectedAccountBalance = computed(() =>
    selectedAccount.value
      ? formatAmount(
          balances.value[selectedAccount.value.id] ?? 0,
          selectedAccount.value.currency,
        )
      : "0.00",
  );
  const { chartPoints } = useChartData({
    selectedAccount,
    chartTransactions,
    chartBaseBalance,
    signedAmount,
  });

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
  const { loadLoginUsersAndSelect, bootstrap } = useBootstrap({
    isSupabaseConfigured,
    user,
    loginUsers,
    selectedLoginUserId,
    loadLoginUsers,
    checkSession,
    loadAccounts,
    loadChildUsers,
  });
  const { selectLoginUser, refreshAccountData, handleLogout } = useSession({
    user,
    accounts,
    balances,
    loginPin,
    selectedLoginUserId,
    selectedAccountId,
    selectedChildId,
    showSettings,
    showAccountCreator,
    clearTransactions,
    setStatus,
    loadBalances,
    resetSelectedAccountData,
    selectedAccount,
  });

  const cancelEditChild = () => {
    editingChildId.value = null;
    editingChildName.value = "";
  };
  const startEditChild = (child: AppUser) => {
    editingChildId.value = child.id;
    editingChildName.value = child.name;
  };
  const cancelEditAccount = () => {
    editingAccountId.value = null;
    editingAccountName.value = "";
  };

  const { handleCreateChild, handleArchiveChild, handleUpdateChild } = useChildren({
    supabase: supabaseClient,
    user,
    loading,
    newChildName,
    newChildPin,
    newChildAvatarId,
    defaultAvatarId: childAvatars[0]?.id ?? "",
    editingChildId,
    editingChildName,
    cancelEditChild,
    confirmArchiveChild: () => window.confirm(ARCHIVE_CHILD_CONFIRMATION),
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
      cancelEditAccount,
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

  const handleCloseAccount = async (account: { id: string; name: string }) => {
    if (!user.value) return;
    const confirmed = window.confirm(
      `确认关闭账户「${account.name}」？\n关闭后将不再显示，且无法继续记账/转账。\n本月尚未结算的利息不会补发。`,
    );
    if (!confirmed) return;

    loading.value = true;
    const { error } = await supabaseRpc.rpc("close_account", {
      p_account_id: account.id,
      p_closed_by: user.value.id,
    });
    if (error) {
      setErrorStatus(error.message);
      loading.value = false;
      return;
    }
    if (selectedAccountId.value === account.id) {
      selectedAccountId.value = null;
      clearTransactions();
    }
    if (editingAccountId.value === account.id) cancelEditAccount();
    setSuccessStatus("账户已关闭。");
    await loadAccounts(user.value);
    loading.value = false;
  };

  const selectChild = (childId: string) => {
    selectedChildId.value = childId;
  };
  const toggleSettings = () => {
    showSettings.value = !showSettings.value;
  };
  const handleLoadMoreForSelected = async () => {
    if (!selectedAccount.value) return;
    await handleLoadMoreTransactions(selectedAccount.value.id);
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

  onMounted(bootstrap);

  return {
    amountInput,
    avatarOptions,
    balances,
    canEdit,
    cancelEditAccount,
    cancelEditChild,
    chartPoints,
    childAvatars,
    childUsers,
    currencyTotals,
    editingAccountId,
    editingAccountName,
    editingChildId,
    editingChildName,
    formatAmount,
    formatSignedAmount,
    formatTimestamp,
    getTransactionNote,
    groupedAccounts,
    handleAddTransaction,
    handleArchiveChild,
    handleCloseAccount,
    handleCreateAccount,
    handleCreateChild,
    handleLoadMoreForSelected,
    handleLogin,
    handleLogout,
    handleTransfer,
    handleUpdateAccount,
    handleUpdateChild,
    handleVoidTransaction,
    hasMoreTransactions,
    isSupabaseConfigured,
    loading,
    loginPin,
    loginUsers,
    newAccountCurrency,
    newAccountName,
    newAccountOwnerId,
    newChildAvatarId,
    newChildName,
    newChildPin,
    noteInput,
    pagedTransactions,
    sanitizePin,
    selectAccount,
    selectChild,
    selectLoginUser,
    selectedAccount,
    selectedAccountBalance,
    selectedAccountId,
    selectedChild,
    selectedChildAccounts,
    selectedChildId,
    selectedLoginUser,
    selectedLoginUserId,
    sessionStatus,
    showAccountCreator,
    showSettings,
    startEditAccount,
    startEditChild,
    status,
    statusTone,
    supportedCurrencies,
    toggleSettings,
    transactionLabels,
    transactionLoading,
    transactionTone,
    transferAmount,
    transferNote,
    transferTargetId,
    transferTargets,
    user,
  };
};
