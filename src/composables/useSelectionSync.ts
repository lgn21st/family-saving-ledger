import { watch, type Ref } from "vue";
import type { Account, AppUser, Transaction } from "../types";

export const useSelectionSync = (params: {
  supportedCurrencies: string[];
  selectedChildId: Ref<string | null>;
  selectedAccountId: Ref<string | null>;
  selectedAccount: Ref<Account | null>;
  childUsers: Ref<AppUser[]>;
  accounts: Ref<Account[]>;
  transactions: Ref<Transaction[]>;
  user: Ref<AppUser | null>;
  showAccountCreator: Ref<boolean>;
  newAccountName: Ref<string>;
  newAccountCurrency: Ref<string>;
  newAccountOwnerId: Ref<string>;
  editingAccountId: Ref<string | null>;
  cancelEditAccount: () => void;
  clearTransactions: () => void;
  resetSelectedAccountData: (accountId: string) => Promise<void>;
}) => {
  const {
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
  } = params;

  watch(selectedChildId, (nextChildId, previousChildId) => {
    if (nextChildId && nextChildId !== previousChildId) {
      showAccountCreator.value = false;
      newAccountName.value = "";
      newAccountCurrency.value = supportedCurrencies[0] ?? "SGD";
    }

    if (nextChildId) {
      newAccountOwnerId.value = nextChildId;
    }
  });

  watch([accounts, transactions], () => {
    if (
      editingAccountId.value &&
      editingAccountId.value !== selectedAccountId.value
    ) {
      cancelEditAccount();
    }
  });

  watch(selectedAccountId, async () => {
    if (!selectedAccount.value) {
      clearTransactions();
      return;
    }
    await resetSelectedAccountData(selectedAccount.value.id);
  });

  watch([childUsers, selectedChildId], () => {
    if (user.value?.role !== "parent") return;

    if (childUsers.value.length === 0) {
      selectedChildId.value = null;
      newAccountOwnerId.value = "";
      return;
    }

    if (
      !selectedChildId.value ||
      !childUsers.value.some((child) => child.id === selectedChildId.value)
    ) {
      selectedChildId.value = childUsers.value[0]?.id ?? null;
    }
  });

  watch([accounts, selectedAccountId, selectedChildId, user], () => {
    if (user.value?.role !== "parent") return;
    if (!selectedChildId.value) {
      selectedAccountId.value = null;
      return;
    }

    const childAccounts = accounts.value.filter(
      (account) => account.owner_child_id === selectedChildId.value,
    );
    if (childAccounts.length === 0) {
      selectedAccountId.value = null;
      return;
    }

    if (
      !selectedAccountId.value ||
      !childAccounts.some((account) => account.id === selectedAccountId.value)
    ) {
      selectedAccountId.value = childAccounts[0]?.id ?? null;
    }
  });

  watch([accounts, selectedAccountId, user], () => {
    if (
      !selectedAccountId.value &&
      accounts.value.length > 0 &&
      user.value?.role !== "parent"
    ) {
      selectedAccountId.value = accounts.value[0]?.id ?? null;
    }
  });

  watch([childUsers, newAccountOwnerId], () => {
    if (!newAccountOwnerId.value && childUsers.value.length > 0) {
      newAccountOwnerId.value = childUsers.value[0]?.id ?? "";
    }
  });
};
