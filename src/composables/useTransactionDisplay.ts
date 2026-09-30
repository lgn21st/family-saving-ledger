import type { Ref } from "vue";
import type { Account, AppUser, Transaction, TransactionType } from "../types";

export const useTransactionDisplay = (params: {
  accounts: Ref<Account[]>;
  childUsers: Ref<AppUser[]>;
}) => {
  const { accounts, childUsers } = params;

  const transactionLabels: Record<TransactionType, string> = {
    deposit: "存入",
    withdrawal: "取出",
    transfer_in: "转入",
    transfer_out: "转出",
    interest: "利息",
  };

  const signedAmount = (transaction: Transaction) => {
    const direction =
      transaction.type === "withdrawal" || transaction.type === "transfer_out"
        ? -1
        : 1;
    return direction * transaction.amount;
  };

  const transactionTone = (transaction: Transaction) => {
    return signedAmount(transaction) >= 0
      ? "text-emerald-600"
      : "text-rose-600";
  };

  const formatSignedAmount = (transaction: Transaction) => {
    const amount = signedAmount(transaction);
    const sign = amount >= 0 ? "+" : "-";
    return `${sign}${Math.abs(amount).toFixed(2)} ${transaction.currency}`;
  };

  const formatTimestamp = (value: string) => {
    return new Date(value).toLocaleString();
  };

  const accountLabel = (id: string) => {
    const account = accounts.value.find((entry) => entry.id === id);
    if (!account) return "账户信息不可用";
    const owner = childUsers.value.find((child) => child.id === account.owner_child_id);
    return [owner?.name, account.name, account.currency].filter(Boolean).join(" · ");
  };

  const getTransactionContext = (transaction: Transaction) => {
    const current = accountLabel(transaction.account_id);
    if (!transaction.related_account_id) return current;
    const related = accountLabel(transaction.related_account_id);
    return transaction.type === "transfer_in"
      ? `${related} → ${current}`
      : `${current} → ${related}`;
  };

  const getTransactionNote = (transaction: Transaction) => {
    if (transaction.note) {
      return transaction.note;
    }

    if (transaction.related_account_id) {
      const relatedAccount = accounts.value.find(
        (account) => account.id === transaction.related_account_id,
      );

      if (relatedAccount) {
        const ownerName =
          childUsers.value.find(
            (child) => child.id === relatedAccount.owner_child_id,
          )?.name ?? relatedAccount.name;

        if (transaction.type === "transfer_out") {
          return `转出至 ${ownerName} ${relatedAccount.name}`;
        }

        if (transaction.type === "transfer_in") {
          return `来自 ${ownerName} ${relatedAccount.name}`;
        }
      }
    }

    return "—";
  };

  return {
    transactionLabels,
    signedAmount,
    transactionTone,
    formatSignedAmount,
    formatTimestamp,
    getTransactionNote,
    getTransactionContext,
  };
};
