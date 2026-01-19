import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { useTransactions } from "../composables/useTransactions";

type Transaction = {
  id: string;
  account_id: string;
  type: "deposit" | "withdrawal" | "transfer_in" | "transfer_out" | "interest";
  amount: number;
  currency: string;
  note: string | null;
  related_account_id: string | null;
  is_void?: boolean;
  created_by: string;
  created_at: string;
};

const createSupabaseMock = (params: {
  transactions: Transaction[];
  chartTransactions: Transaction[];
  baseBalance: number;
}) => {
  const { transactions, chartTransactions, baseBalance } = params;

  const applyFilters = (
    rows: Transaction[],
    filters: Record<string, unknown>,
  ) => {
    return rows.filter((row) => {
      return Object.entries(filters).every(([key, value]) => {
        return (row as Record<string, unknown>)[key] === value;
      });
    });
  };

  return {
    from: () => ({
      select: (...args: [string?, { count?: "exact" }?]) => {
        const options = args[1];
        const filters: Record<string, unknown> = {};
        let gteColumn: string | null = null;
        let gteValue: string | null = null;

        const query = {
          eq: (column: string, value: unknown) => {
            filters[column] = value;
            return query;
          },
          gte: (column: string, value: string) => {
            gteColumn = column;
            gteValue = value;
            return query;
          },
          order: () => ({
            range: (from: number, to: number) => {
              const filtered = applyFilters(transactions, filters);
              return Promise.resolve({
                data: filtered.slice(from, to + 1),
                error: null,
                count: options?.count ? filtered.length : null,
              });
            },
            then: (
              onfulfilled?: (value: { data: Transaction[]; error: null }) => void,
            ) => {
              const filtered = applyFilters(chartTransactions, filters).filter(
                (row) => {
                  if (!gteColumn || !gteValue) return true;
                  return row[gteColumn as "created_at"] >= gteValue;
                },
              );
              return Promise.resolve({ data: filtered, error: null }).then(
                onfulfilled,
              );
            },
          }),
        };

        return query;
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
      is_void: false,
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
      includeVoided: ref(false),
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
        is_void: false,
        created_by: "parent",
        created_at: new Date().toISOString(),
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
        includeVoided: ref(false),
        setErrorStatus,
      });

    await loadChartTransactions("acc-1");
    expect(chartBaseBalance.value).toBe(12);
    expect(loaded.value).toHaveLength(1);
  });

  it("filters voided transactions when includeVoided is false", async () => {
    const transactions = [
      {
        id: "t-1",
        account_id: "acc-1",
        type: "deposit" as const,
        amount: 5,
        currency: "CNY",
        note: "有效",
        related_account_id: null,
        is_void: false,
        created_by: "parent",
        created_at: new Date(Date.UTC(2024, 0, 1)).toISOString(),
      },
      {
        id: "t-2",
        account_id: "acc-1",
        type: "deposit" as const,
        amount: 5,
        currency: "CNY",
        note: "作废",
        related_account_id: null,
        is_void: true,
        created_by: "parent",
        created_at: new Date(Date.UTC(2024, 0, 2)).toISOString(),
      },
    ];

    const supabase = createSupabaseMock({
      transactions,
      chartTransactions: [],
      baseBalance: 0,
    });
    const { transactions: loaded, loadTransactionsPage } = useTransactions({
      supabase,
      includeVoided: ref(false),
      setErrorStatus: vi.fn(),
    });

    await loadTransactionsPage("acc-1", 1);
    expect(loaded.value.map((row) => row.id)).toEqual(["t-1"]);
  });

  it("includes voided transactions when includeVoided is true", async () => {
    const transactions = [
      {
        id: "t-1",
        account_id: "acc-1",
        type: "deposit" as const,
        amount: 5,
        currency: "CNY",
        note: "有效",
        related_account_id: null,
        is_void: false,
        created_by: "parent",
        created_at: new Date(Date.UTC(2024, 0, 1)).toISOString(),
      },
      {
        id: "t-2",
        account_id: "acc-1",
        type: "deposit" as const,
        amount: 5,
        currency: "CNY",
        note: "作废",
        related_account_id: null,
        is_void: true,
        created_by: "parent",
        created_at: new Date(Date.UTC(2024, 0, 2)).toISOString(),
      },
    ];

    const supabase = createSupabaseMock({
      transactions,
      chartTransactions: [],
      baseBalance: 0,
    });
    const { transactions: loaded, loadTransactionsPage } = useTransactions({
      supabase,
      includeVoided: ref(true),
      setErrorStatus: vi.fn(),
    });

    await loadTransactionsPage("acc-1", 1);
    expect(loaded.value.map((row) => row.id)).toEqual(["t-1", "t-2"]);
  });
});
