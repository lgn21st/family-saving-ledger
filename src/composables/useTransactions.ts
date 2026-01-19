import { computed, ref } from "vue";
import type { SupabaseClient, Transaction } from "../types";

const PAGE_SIZE = 10;

export const useTransactions = (params: {
  supabase: SupabaseClient;
  setErrorStatus: (message: string) => void;
}) => {
  const { supabase, setErrorStatus } = params;

  const transactions = ref<Transaction[]>([]);
  const chartTransactions = ref<Transaction[]>([]);
  const chartBaseBalance = ref(0);
  const transactionTotal = ref(0);
  const transactionPage = ref(0);
  const transactionLoading = ref(false);

  const hasMoreTransactions = computed(
    () => transactions.value.length < transactionTotal.value,
  );

  const clearTransactions = () => {
    transactions.value = [];
    chartTransactions.value = [];
    chartBaseBalance.value = 0;
    transactionTotal.value = 0;
    transactionPage.value = 0;
    transactionLoading.value = false;
  };

  const loadTransactionsPage = async (accountId: string, page: number) => {
    transactionLoading.value = true;
    const start = (page - 1) * PAGE_SIZE;
    const end = page * PAGE_SIZE - 1;
    const { data, error, count } = await supabase
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) {
      setErrorStatus(error.message);
      transactionLoading.value = false;
      return;
    }

    const resolvedData = (data ?? []) as Transaction[];
    transactionTotal.value = count ?? resolvedData.length ?? 0;
    transactionPage.value = page;
    const nextData = resolvedData;
    transactions.value =
      page === 1 ? nextData : [...transactions.value, ...nextData];
    transactionLoading.value = false;
  };

  const loadChartTransactions = async (accountId: string) => {
    const endDate = new Date(Date.now());
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);

    const { data: baseData, error: baseError } = await supabase.rpc(
      "get_balance_before_date",
      {
        p_account_id: accountId,
        p_before: startDate.toISOString(),
      },
    );

    if (baseError) {
      setErrorStatus(baseError.message);
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("account_id", accountId)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      setErrorStatus(error.message);
      return;
    }

    chartBaseBalance.value = Number(baseData ?? 0);
    chartTransactions.value = (data ?? []) as Transaction[];
  };

  const resetSelectedAccountData = async (accountId: string) => {
    await loadTransactionsPage(accountId, 1);
    await loadChartTransactions(accountId);
  };

  const handleLoadMoreTransactions = async (accountId: string) => {
    if (transactionLoading.value || !hasMoreTransactions.value) return;
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
