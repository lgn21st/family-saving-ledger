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
} from "../utils/timezone";

const PAGE_SIZE = 10;

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
    if (generation !== loadGeneration) return;
    transactionLoading.value = true;
    const start = (page - 1) * PAGE_SIZE;
    const end = page * PAGE_SIZE - 1;
    const baseQuery = supabase
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("account_id", accountId);
    const { data, error, count } = await applyVoidFilter(baseQuery)
      .order("created_at", { ascending: false })
      .range(start, end);

    if (generation !== loadGeneration) return;

    if (error) {
      setErrorStatus(error.message);
      transactionLoading.value = false;
      return;
    }

    const resolvedData = (data ?? []) as Transaction[];
    transactionTotal.value = count ?? resolvedData.length ?? 0;
    transactionPage.value = page;
    loadedAccountId.value = accountId;
    transactions.value =
      page === 1 ? resolvedData : [...transactions.value, ...resolvedData];
    transactionLoading.value = false;
  };

  const loadChartTransactions = async (
    accountId: string,
    generation = loadGeneration,
  ) => {
    const startDate = addZonedDays(
      startOfZonedDay(new Date(), timeZone.value),
      -29,
      timeZone.value,
    );

    const { data: baseData, error: baseError } = await supabase.rpc(
      "get_balance_before_date",
      {
        p_account_id: accountId,
        p_before: startDate.toISOString(),
      },
    );

    if (generation !== loadGeneration) return;

    if (baseError) {
      setErrorStatus(baseError.message);
      return;
    }

    const chartQuery = supabase
      .from("transactions")
      .select("*")
      .eq("account_id", accountId)
      .eq("is_void", false)
      .gte("created_at", startDate.toISOString());
    const { data, error } = await chartQuery.order("created_at", {
      ascending: true,
    });

    if (generation !== loadGeneration) return;

    if (error) {
      setErrorStatus(error.message);
      return;
    }

    chartBaseBalance.value = Number(baseData ?? 0);
    chartTransactions.value = (data ?? []) as Transaction[];
  };

  const resetSelectedAccountData = async (accountId: string) => {
    const generation = loadGeneration + 1;
    loadGeneration = generation;
    transactions.value = [];
    chartTransactions.value = [];
    chartBaseBalance.value = 0;
    transactionTotal.value = 0;
    transactionPage.value = 0;
    loadedAccountId.value = accountId;
    await Promise.all([
      loadTransactionsPage(accountId, 1, generation),
      loadChartTransactions(accountId, generation),
    ]);
  };

  const handleLoadMoreTransactions = async (accountId: string) => {
    if (transactionLoading.value || !hasMoreTransactions.value) return;
    if (loadedAccountId.value !== accountId) return;
    await loadTransactionsPage(accountId, transactionPage.value + 1);
  };

  return {
    transactions,
    chartTransactions,
    chartBaseBalance,
    transactionTotal,
    transactionPage,
    transactionLoading,
    hasMoreTransactions,
    clearTransactions,
    loadTransactionsPage,
    loadChartTransactions,
    resetSelectedAccountData,
    handleLoadMoreTransactions,
  };
};
