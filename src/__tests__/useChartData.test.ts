import { accountFixture, transactionFixture } from "../test/setup";
import { ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChartData } from "../composables/useChartData";

describe("useChartData", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2024, 0, 30, 12, 0, 0)));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds 30 days of points from base balance and transactions", () => {
    const selectedAccount = ref(accountFixture());
    const chartBaseBalance = ref(100);
    const chartTransactions = ref([
      transactionFixture({
        account_id: "acc-1",
        type: "deposit" as const,
        amount: 10,
        created_at: new Date(Date.UTC(2024, 0, 5, 12, 0, 0)).toISOString(),
      }),
      transactionFixture({
        account_id: "acc-1",
        type: "withdrawal" as const,
        amount: 5,
        created_at: new Date(Date.UTC(2024, 0, 10, 8, 0, 0)).toISOString(),
      }),
    ]);
    const signedAmount = (transaction: { type: string; amount: number }) =>
      transaction.type === "withdrawal" ? -transaction.amount : transaction.amount;

    const { chartPoints } = useChartData({
      selectedAccount,
      chartTransactions,
      chartBaseBalance,
      signedAmount,
    });

    expect(chartPoints.value).toHaveLength(30);
    expect(chartPoints.value[0]?.balance).toBe(100);
    expect(chartPoints.value[5]?.balance).toBe(110);
    expect(chartPoints.value[10]?.balance).toBe(105);
    expect(chartPoints.value[29]?.balance).toBe(105);
  });

  it("includes the extra month-start day in the balance without adding a 31st chart point", () => {
    vi.setSystemTime(new Date("2024-01-31T12:00:00Z"));
    const { chartPoints } = useChartData({
      selectedAccount: ref(accountFixture()), chartBaseBalance: ref(100),
      chartTransactions: ref([transactionFixture({ amount: 10, created_at: "2023-12-31T16:00:00Z" })]),
      signedAmount: (transaction) => transaction.amount, timeZone: ref("Asia/Singapore"),
    });
    expect(chartPoints.value).toHaveLength(30);
    expect(chartPoints.value.every(point => point.balance === 110)).toBe(true);
  });

  it("emits a flat 30-day series from the base balance when there are no recent transactions", () => {
    const { chartPoints } = useChartData({
      selectedAccount: ref(accountFixture()),
      chartTransactions: ref([]),
      chartBaseBalance: ref(50),
      signedAmount: () => 0,
    });

    expect(chartPoints.value).toHaveLength(30);
    expect(chartPoints.value.every((point) => point.balance === 50)).toBe(true);
  });
});
