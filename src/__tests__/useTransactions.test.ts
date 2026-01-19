import { describe, expect, it, vi } from "vitest";

import { useTransactions } from "../composables/useTransactions";

type Transaction = {
  id: string;
  account_id: string;
  type: "deposit" | "withdrawal" | "transfer_in" | "transfer_out" | "interest";
  amount: number;
  currency: string;
  note: string | null;
  related_account_id: string | null;
  created_by: string;
  created_at: string;
};

const createSupabaseMock = (params: {
  transactions: Transaction[];
  chartTransactions: Transaction[];
  baseBalance: number;
}) => {
  const { transactions, chartTransactions, baseBalance } = params;

  return {
    from: () => ({
      select: (...args: [string?, { count?: "exact" }?]) => {
        const options = args[1];
        return {
          eq: (...eqArgs: [string, string]) => {
            const accountId = eqArgs[1];
            return {
              order: () => ({
                range: (from: number, to: number) =>
                  Promise.resolve({
                    data: transactions
                      .filter((row) => row.account_id === accountId)
                      .slice(from, to + 1),
                    error: null,
                    count: options?.count ? transactions.length : null,
                  }),
              }),
              gte: () => ({
                order: () =>
                  Promise.resolve({
                    data: chartTransactions,
                    error: null,
                  }),
              }),
            };
          },
        };
      },
    }),
    rpc: () => Promise.resolve({ data: baseBalance, error: null }),
  };
};

describe("useTransactions", () => {
  it("loads pages and appends on load more", async () => {
    const transactions = Array.from({ length: 15 }, (_, index) => ({
      id: `t-${index + 1}`,
      account_id: "acc-1",
      type: "deposit" as const,
      amount: 1,
      currency: "CNY",
      note: `记录-${index + 1}`,
      related_account_id: null,
      created_by: "parent",
      created_at: new Date(Date.UTC(2024, 0, index + 1)).toISOString(),
    }));

    const supabase = createSupabaseMock({
      transactions,
      chartTransactions: [],
      baseBalance: 0,
    });
    const setErrorStatus = vi.fn();
    const {
      transactions: loaded,
      hasMoreTransactions,
      transactionPage,
      transactionTotal,
      loadTransactionsPage,
      handleLoadMoreTransactions,
    } = useTransactions({
      supabase,
      setErrorStatus,
    });

    await loadTransactionsPage("acc-1", 1);
    expect(loaded.value).toHaveLength(10);
    expect(transactionTotal.value).toBe(15);
    expect(transactionPage.value).toBe(1);
    expect(hasMoreTransactions.value).toBe(true);

    await handleLoadMoreTransactions("acc-1");
    expect(loaded.value).toHaveLength(15);
    expect(transactionPage.value).toBe(2);
    expect(hasMoreTransactions.value).toBe(false);
  });

  it("loads chart base balance and recent transactions", async () => {
    const chartTransactions = [
      {
        id: "t-1",
        account_id: "acc-1",
        type: "deposit" as const,
        amount: 10,
        currency: "CNY",
        note: "记录",
        related_account_id: null,
        created_by: "parent",
        created_at: new Date(Date.UTC(2024, 0, 2)).toISOString(),
      },
    ];

    const supabase = createSupabaseMock({
      transactions: [],
      chartTransactions,
      baseBalance: 12,
    });
    const setErrorStatus = vi.fn();
    const { chartBaseBalance, chartTransactions: loaded, loadChartTransactions } =
      useTransactions({
        supabase,
        setErrorStatus,
      });

    await loadChartTransactions("acc-1");
    expect(chartBaseBalance.value).toBe(12);
    expect(loaded.value).toHaveLength(1);
  });
});
