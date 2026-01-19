import type { Ref } from "vue";
import type { Account, AppUser, Transaction } from "../types";

type TransactionType = Transaction["type"];

export const useTransactionDisplay = (params: {
  accounts: Ref<Account[]>;
  childUsers: Ref<AppUser[]>;
}) => {
  const { accounts, childUsers } = params;

  const transactionLabels: Record<TransactionType, string> = {
    deposit: "增加",
    withdrawal: "减少",
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
      : "text-rose-500";
  };

  const formatSignedAmount = (transaction: Transaction) => {
    const amount = signedAmount(transaction);
    const sign = amount >= 0 ? "+" : "-";
    return `${sign}${Math.abs(amount).toFixed(2)} ${transaction.currency}`;
  };

  const formatTimestamp = (value: string) => {
    return new Date(value).toLocaleString();
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
  };
};
