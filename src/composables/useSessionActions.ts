import type { Ref } from "vue";
import type { Account, AppUser } from "../types";

export const useSessionActions = (params: {
  user: Ref<AppUser | null>;
  accounts: Ref<Account[]>;
  balances: Ref<Record<string, number>>;
  loginPin: Ref<string>;
  selectedLoginUserId: Ref<string | null>;
  selectedAccountId: Ref<string | null>;
  selectedChildId: Ref<string | null>;
  showChildManager: Ref<boolean>;
  showAccountCreator: Ref<boolean>;
  clearTransactions: () => void;
  setStatus: (message: string | null) => void;
  loadBalances: (accounts: Account[]) => Promise<void>;
  resetSelectedAccountData: (accountId: string) => Promise<void>;
  selectedAccount: Ref<Account | null>;
}) => {
  const {
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
  } = params;

  const selectLoginUser = (userId: string) => {
    selectedLoginUserId.value = userId;
    loginPin.value = "";
  };

  const refreshAccountData = async () => {
    await loadBalances(accounts.value);
    if (!selectedAccount.value) return;
    await resetSelectedAccountData(selectedAccount.value.id);
  };

  const handleLogout = () => {
    user.value = null;
    accounts.value = [];
    balances.value = {};
    clearTransactions();
    selectedAccountId.value = null;
    setStatus(null);
    loginPin.value = "";
    selectedLoginUserId.value = null;
    selectedChildId.value = null;
    showChildManager.value = false;
    showAccountCreator.value = false;
    sessionStorage.removeItem("homebank.session");
  };

  return {
    selectLoginUser,
    refreshAccountData,
    handleLogout,
  };
};
