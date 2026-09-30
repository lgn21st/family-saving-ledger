import { queryMock, transactionFixture } from "../test/setup";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { useTransactions } from "../composables/useTransactions";

import type { Transaction } from "../types";

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

        let pageRange: { from: number; to: number } | null = null;
        const query = queryMock(() => {
          if (pageRange) {
            const filtered = applyFilters(transactions, filters);
            return {
              data: filtered.slice(pageRange.from, pageRange.to + 1),
              error: null,
              count: options?.count ? filtered.length : null,
            };
          }
          const filtered = applyFilters(chartTransactions, filters).filter(
            (row) =>
              !gteColumn ||
              !gteValue ||
              row[gteColumn as "created_at"] >= gteValue,
          );
          return { data: filtered, error: null };
        });
        query.eq.mockImplementation((column, value) => {
          filters[column] = value;
          return query;
        });
        query.gte.mockImplementation((column, value) => {
          gteColumn = column;
          gteValue = value;
          return query;
        });
        query.range.mockImplementation((from, to) => {
          pageRange = { from, to };
          return query;
        });

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
    const {
      chartBaseBalance,
      chartTransactions: loaded,
      loadChartTransactions,
    } = useTransactions({
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

  it("ignores a stale page response after the selected account changes", async () => {
    let resolveFirst:
      | ((value: { data: Transaction[]; error: null; count: number }) => void)
      | undefined;

    const supabase = {
      from: () => ({
        select: () => {
          let paged = false;
          const query = queryMock(() => {
            if (!paged) return { data: [], error: null };
            if (!resolveFirst)
              return new Promise<{
                data: Transaction[];
                error: null;
                count: number;
              }>((resolve) => {
                resolveFirst = resolve;
              });
            return {
              data: [
                transactionFixture({
                  id: "b-1",
                  account_id: "acc-2",
                  amount: 2,
                  note: "B",
                  created_at: "2024-01-02T00:00:00Z",
                }),
              ],
              error: null,
              count: 1,
            };
          });
          query.range.mockImplementation(() => {
            paged = true;
            return query;
          });
          return query;
        },
      }),
      rpc: () => Promise.resolve({ data: 0, error: null }),
    };

    const { transactions: loaded, resetSelectedAccountData } = useTransactions({
      supabase,
      includeVoided: ref(false),
      setErrorStatus: vi.fn(),
    });

    const firstLoad = resetSelectedAccountData("acc-1");
    const secondLoad = resetSelectedAccountData("acc-2");
    await secondLoad;
    resolveFirst?.({
      data: [
        {
          id: "a-1",
          account_id: "acc-1",
          type: "deposit",
          amount: 1,
          currency: "CNY",
          note: "A",
          related_account_id: null,
          is_void: false,
          created_by: "parent",
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
      error: null,
      count: 1,
    });
    await firstLoad;

    expect(loaded.value.map((row) => row.id)).toEqual(["b-1"]);
  });
  it("releases pagination after a transport failure and retries the same page", async () => {
    const rows = Array.from({ length: 11 }, (_, i) =>
      transactionFixture({ id: `t-${i}`, is_void: false }),
    );
    const read = vi.fn(async () => ({
      data: rows.slice(0, 10),
      error: null,
      count: 11,
    }));
    const setErrorStatus = vi.fn();
    const pages = useTransactions({
      supabase: {
        from: () => ({ select: () => queryMock(read) }),
        rpc: vi.fn(),
      },
      includeVoided: ref(false),
      setErrorStatus,
    });
    await pages.loadTransactionsPage("acc-1", 1);
    read.mockRejectedValueOnce(new Error("offline"));
    await pages.handleLoadMoreTransactions("acc-1");
    expect(pages.transactionLoading.value).toBe(false);
    expect(pages.transactionPage.value).toBe(1);
    expect(pages.transactions.value).toHaveLength(10);
    expect(setErrorStatus).toHaveBeenCalledWith("账户流水加载失败，请重试。");
    read.mockResolvedValueOnce({
      data: rows.slice(10),
      error: null,
      count: 11,
    });
    await pages.handleLoadMoreTransactions("acc-1");
    expect(pages.transactionPage.value).toBe(2);
    expect(pages.transactions.value).toHaveLength(11);
  });
  it("ignores a stale transport failure without clearing the new account's busy state", async () => {
    let rejectOld!: (reason: Error) => void;
    let finishNew!: (result: {
      data: Transaction[];
      error: null;
      count: number;
    }) => void;
    const read = vi
      .fn<() => Promise<{ data: Transaction[]; error: null; count: number }>>()
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectOld = reject;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishNew = resolve;
          }),
      );
    const setErrorStatus = vi.fn();
    const pages = useTransactions({
      supabase: {
        from: () => ({ select: () => queryMock(read) }),
        rpc: vi.fn(),
      },
      includeVoided: ref(false),
      setErrorStatus,
    });
    const oldLoad = pages.loadTransactionsPage("acc-1", 1);
    await Promise.resolve();
    pages.clearTransactions();
    const newLoad = pages.loadTransactionsPage("acc-2", 1);
    await Promise.resolve();
    rejectOld(new Error("old failure"));
    expect(await oldLoad).toBe(false);
    expect(setErrorStatus).not.toHaveBeenCalled();
    expect(pages.transactionLoading.value).toBe(true);
    finishNew({
      data: [transactionFixture({ account_id: "acc-2" })],
      error: null,
      count: 1,
    });
    expect(await newLoad).toBe(true);
    expect(pages.transactionLoading.value).toBe(false);
  });
  it("reports a chart transport failure but ignores one from a previous session", async () => {
    const rpc = vi.fn(async () => ({ data: 0, error: null }));
    const setErrorStatus = vi.fn();
    const pages = useTransactions({
      supabase: {
        from: () => ({
          select: () => queryMock(() => ({ data: [], error: null })),
        }),
        rpc,
      },
      includeVoided: ref(false),
      setErrorStatus,
    });
    rpc.mockRejectedValueOnce(new Error("offline"));
    expect(await pages.resetSelectedAccountData("acc-1")).toBe(false);
    expect(setErrorStatus).toHaveBeenCalledWith("账户趋势加载失败，请重试。");
    setErrorStatus.mockClear();
    let rejectOld!: (reason: Error) => void;
    rpc.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectOld = reject;
        }),
    );
    const oldChart = pages.loadChartTransactions("acc-1");
    pages.clearTransactions();
    rejectOld(new Error("old failure"));
    expect(await oldChart).toBe(false);
    expect(setErrorStatus).not.toHaveBeenCalled();
  });
});
