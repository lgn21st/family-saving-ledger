import { computed, type Ref } from "vue";
import type { Account, Transaction } from "../types";
import {
  addZonedDays,
  DEFAULT_LEDGER_TIMEZONE,
  endOfZonedDay,
  startOfZonedDay,
} from "../utils/timezone";

export type ChartPoint = {
  date: Date;
  balance: number;
};

export const useChartData = (params: {
  selectedAccount: Ref<Account | null>;
  chartTransactions: Ref<Transaction[]>;
  chartBaseBalance: Ref<number>;
  signedAmount: (transaction: Transaction) => number;
  timeZone?: Ref<string>;
}) => {
  const {
    selectedAccount,
    chartTransactions,
    chartBaseBalance,
    signedAmount,
  } = params;
  const timeZone = computed(
    () => params.timeZone?.value || DEFAULT_LEDGER_TIMEZONE,
  );

  const chartPoints = computed<ChartPoint[]>(() => {
    if (!selectedAccount.value) return [];

    const startDate = addZonedDays(
      startOfZonedDay(new Date(), timeZone.value),
      -29,
      timeZone.value,
    );

    const accountTransactions = chartTransactions.value
      .filter(
        (transaction) => transaction.account_id === selectedAccount.value?.id,
      )
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
      const date = addZonedDays(startDate, day, timeZone.value);
      const dayEnd = endOfZonedDay(date, timeZone.value);

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
