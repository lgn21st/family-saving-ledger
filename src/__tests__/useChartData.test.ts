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
    const selectedAccount = ref({ id: "acc-1" });
    const chartBaseBalance = ref(100);
    const chartTransactions = ref([
      {
        type: "deposit" as const,
        amount: 10,
        created_at: new Date(Date.UTC(2024, 0, 5, 12, 0, 0)).toISOString(),
      },
      {
        type: "withdrawal" as const,
        amount: 5,
        created_at: new Date(Date.UTC(2024, 0, 10, 8, 0, 0)).toISOString(),
      },
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

  it("returns empty path when less than two points", () => {
    const { chartPath } = useChartData({
      selectedAccount: ref({ id: "acc-1" }),
      chartTransactions: ref([]),
      chartBaseBalance: ref(0),
      signedAmount: (_transaction) => 0,
    });

    expect(chartPath.value).toBe("");
  });
});
