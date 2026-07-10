import { computed, type Ref } from "vue";
import type { Account, Transaction } from "../types";

export type ChartPoint = {
  date: Date;
  balance: number;
};

export const useChartData = (params: {
  selectedAccount: Ref<Account | null>;
  chartTransactions: Ref<Transaction[]>;
  chartBaseBalance: Ref<number>;
  signedAmount: (transaction: Transaction) => number;
}) => {
  const { selectedAccount, chartTransactions, chartBaseBalance, signedAmount } =
    params;

  const chartPoints = computed<ChartPoint[]>(() => {
    if (!selectedAccount.value) return [];
    if (chartTransactions.value.length === 0) return [];

    const now = new Date(Date.now());
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 29);

    const accountTransactions = chartTransactions.value
      .map((transaction) => ({
        transaction,
        effectiveDate: new Date(transaction.created_at),
      }))
      .sort(
        (left, right) =>
          left.effectiveDate.getTime() - right.effectiveDate.getTime(),
      );

    let runningBalance = chartBaseBalance.value;

    let index = 0;
    const points: ChartPoint[] = [];

    for (let day = 0; day < 30; day += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + day);
      const dayEnd = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59,
        999,
      );

      while (index < accountTransactions.length) {
        const entry = accountTransactions[index];
        if (!entry || entry.effectiveDate > dayEnd) break;
        runningBalance += signedAmount(entry.transaction);
        index += 1;
      }

      points.push({
        date,
        balance: Number(runningBalance.toFixed(2)),
      });
    }

    return points;
  });

  return {
    chartPoints,
  };
};
