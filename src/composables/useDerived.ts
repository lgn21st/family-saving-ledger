import { computed, type Ref } from "vue";
import type { Account, AppUser, Transaction } from "../types";

export const useDerived = (params: {
  loginUsers: Ref<AppUser[]>;
  selectedLoginUserId: Ref<string | null>;
  selectedAccount: Ref<Account | null>;
  transactions: Ref<Transaction[]>;
}) => {
  const { loginUsers, selectedLoginUserId, selectedAccount, transactions } =
    params;

  const selectedLoginUser = computed(() => {
    return (
      loginUsers.value.find(
        (entry) => entry.id === selectedLoginUserId.value,
      ) ?? null
    );
  });

  const selectedTransactions = computed(() => {
    if (!selectedAccount.value) return [];
    return transactions.value;
  });

  const pagedTransactions = computed(() => {
    return selectedTransactions.value;
  });

  return {
    selectedLoginUser,
    selectedTransactions,
    pagedTransactions,
  };
};
