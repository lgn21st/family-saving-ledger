import { computed, ref, type Ref } from "vue";
import type {
  SupabaseClient,
  SupabaseFilterBuilder,
  Transaction,
} from "../types";
import {
  addZonedDays,
  DEFAULT_LEDGER_TIMEZONE,
  startOfZonedDay,
  startOfZonedMonth,
} from "../utils/timezone";

const PAGE_SIZE = 10;
const WINDOW_PAGE_SIZE = 100;

export const useTransactions = (params: {
  supabase: SupabaseClient;
  includeVoided: Ref<boolean>;
  timeZone?: Ref<string>;
  setErrorStatus: (message: string) => void;
}) => {
  const { supabase, includeVoided, setErrorStatus } = params;
  const timeZone = computed(
    () => params.timeZone?.value || DEFAULT_LEDGER_TIMEZONE,
  );

  const transactions = ref<Transaction[]>([]);
  const chartTransactions = ref<Transaction[]>([]);
  const chartBaseBalance = ref(0);
  const chartReady = ref(false);
  const chartLoading = ref(false);
  const transactionTotal = ref(0);
  const transactionPage = ref(0);
  const transactionLoading = ref(false);
  const loadedAccountId = ref<string | null>(null);
  let loadGeneration = 0;

  const hasMoreTransactions = computed(
    () => transactions.value.length < transactionTotal.value,
  );

  const clearTransactions = () => {
    loadGeneration += 1;
    transactions.value = [];
    chartTransactions.value = [];
    chartBaseBalance.value = 0;
    chartReady.value = false;
    chartLoading.value = false;
    transactionTotal.value = 0;
    transactionPage.value = 0;
    transactionLoading.value = false;
    loadedAccountId.value = null;
  };

  const applyVoidFilter = <T>(query: SupabaseFilterBuilder<T>) => {
    return includeVoided.value ? query : query.eq("is_void", false);
  };

  const loadTransactionsPage = async (
    accountId: string,
    page: number,
    generation = loadGeneration,
  ) => {
    if (generation !== loadGeneration) return false;
    transactionLoading.value = true;
    try {
      const start = (page - 1) * PAGE_SIZE;
      const end = page * PAGE_SIZE - 1;
      const baseQuery = supabase
        .from("transactions")
        .select("*", { count: "exact" })
        .eq("account_id", accountId);
      const { data, error, count } = await applyVoidFilter(baseQuery)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(start, end);

      if (generation !== loadGeneration) return false;

      if (error) {
        setErrorStatus(error.message);
        return false;
      }

      const resolvedData = (data ?? []) as Transaction[];
      if (resolvedData.length === 0 && count != null && count > start) {
        setErrorStatus("历史记录未完整加载，请重试。");
        return false;
      }
      transactionTotal.value = count ?? resolvedData.length;
      transactionPage.value = page;
      loadedAccountId.value = accountId;
      transactions.value =
        page === 1 ? resolvedData : [...transactions.value, ...resolvedData];
      return true;
    } catch {
      if (generation === loadGeneration)
        setErrorStatus("账户流水加载失败，请重试。");
      return false;
    } finally {
      if (generation === loadGeneration) transactionLoading.value = false;
    }
  };

  const loadChartTransactions = async (
    accountId: string,
    generation = loadGeneration,
  ) => {
    if (generation !== loadGeneration) return false;
    chartLoading.value = true;
    chartReady.value = false;
    try {
      const now = new Date();
      const chartStart = addZonedDays(
        startOfZonedDay(now, timeZone.value),
        -29,
        timeZone.value,
      );

      // One complete read window supports both the 30-day trend and this month's explanation.
      const monthStart = startOfZonedMonth(now, timeZone.value);
      const startDate = new Date(Math.min(chartStart.getTime(), monthStart.getTime()));
      const { data: baseData, error: baseError } = await supabase.rpc(
        "get_balance_before_date",
        {
          p_account_id: accountId,
          p_before: startDate.toISOString(),
        },
      );

      if (generation !== loadGeneration) return false;

      if (baseError) {
        setErrorStatus(baseError.message);
        return false;
      }

      const rows: Transaction[] = [];
      while (true) {
        const { data, error, count } = await supabase
          .from("transactions")
          .select("*", { count: "exact" })
          .eq("account_id", accountId)
          .eq("is_void", false)
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(rows.length, rows.length + WINDOW_PAGE_SIZE - 1);
        if (generation !== loadGeneration) return false;
        if (error) {
          setErrorStatus(error.message);
          return false;
        }
        const batch = (data ?? []) as Transaction[];
        if (count == null || (batch.length === 0 && rows.length < count)) {
          setErrorStatus("账户变化未完整加载，请重试。");
          return false;
        }
        rows.push(...batch);
        if (rows.length >= count) break;
      }
      chartBaseBalance.value = Number(baseData ?? 0);
      chartTransactions.value = rows;
      chartReady.value = true;
      return true;
    } catch {
      if (generation === loadGeneration)
        setErrorStatus("账户趋势加载失败，请重试。");
      return false;
    } finally {
      if (generation === loadGeneration) chartLoading.value = false;
    }
  };

  const resetSelectedAccountData = async (accountId: string) => {
    const generation = loadGeneration + 1;
    loadGeneration = generation;
    transactions.value = [];
    chartTransactions.value = [];
    chartBaseBalance.value = 0;
    chartReady.value = false;
    chartLoading.value = false;
    transactionTotal.value = 0;
    transactionPage.value = 0;
    loadedAccountId.value = accountId;
    const results = await Promise.all([
      loadTransactionsPage(accountId, 1, generation),
      loadChartTransactions(accountId, generation),
    ]);
    return results.every(Boolean);
  };

  const handleLoadMoreTransactions = async (accountId: string) => {
    if (transactionLoading.value || !hasMoreTransactions.value) return;
    if (loadedAccountId.value !== accountId) return;
    await loadTransactionsPage(accountId, transactionPage.value + 1);
  };

  const handleLoadAllTransactions = async (accountId: string) => {
    if (transactionLoading.value || loadedAccountId.value !== accountId) return;
    const generation = loadGeneration;
    while (generation === loadGeneration && hasMoreTransactions.value) {
      const previousLength = transactions.value.length;
      if (!(await loadTransactionsPage(accountId, transactionPage.value + 1, generation))) return;
      if (generation !== loadGeneration) return;
      if (transactions.value.length <= previousLength) {
        setErrorStatus("历史记录未完整加载，请重试。");
        return;
      }
    }
  };

  return {
    transactions,
    chartTransactions,
    chartBaseBalance,
    chartReady,
    chartLoading,
    transactionTotal,
    transactionPage,
    transactionLoading,
    hasMoreTransactions,
    clearTransactions,
    loadTransactionsPage,
    loadChartTransactions,
    resetSelectedAccountData,
    handleLoadMoreTransactions,
    handleLoadAllTransactions,
  };
};
