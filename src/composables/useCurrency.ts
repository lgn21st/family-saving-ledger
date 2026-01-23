import { computed, type Ref } from "vue";
import type { Account } from "../types";

type Balances = Record<string, number>;

export const useCurrency = (params: {
  accounts: Ref<Account[]>;
  balances: Ref<Balances>;
}) => {
  const { accounts, balances } = params;

  const groupedAccounts = computed(() => {
    return accounts.value.reduce<Record<string, Account[]>>(
      (grouped, account) => {
        if (!grouped[account.currency]) {
          grouped[account.currency] = [];
        }
        grouped[account.currency]?.push(account);
        return grouped;
      },
      {},
    );
  });

  const currencyTotals = computed(() => {
    return accounts.value.reduce<Record<string, number>>((result, account) => {
      result[account.currency] =
        (result[account.currency] ?? 0) + (balances.value[account.id] ?? 0);
      return result;
    }, {});
  });

  const formatAmount = (amount: number, currency: string) => {
    return `${amount.toFixed(2)} ${currency}`;
  };

  return {
    groupedAccounts,
    currencyTotals,
    formatAmount,
  };
};
