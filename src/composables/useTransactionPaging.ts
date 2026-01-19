import type { Ref } from "vue";
import type { Account } from "../types";

export const useTransactionPaging = (params: {
  selectedAccount: Ref<Account | null>;
  handleLoadMoreTransactions: (accountId: string) => Promise<void>;
}) => {
  const { selectedAccount, handleLoadMoreTransactions } = params;

  const handleLoadMoreForSelected = async () => {
    if (!selectedAccount.value) return;
    await handleLoadMoreTransactions(selectedAccount.value.id);
  };

  return {
    handleLoadMoreForSelected,
  };
};
