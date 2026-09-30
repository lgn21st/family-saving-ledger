import {
  computed,
  getCurrentScope,
  onScopeDispose,
  ref,
  watch,
  type Ref,
} from "vue";
import type { Account, AppUser, SupabaseClient, Transaction } from "../types";
import type { LedgerCommands } from "./useLedgerCommands";
import type { Feedback } from "../features/contracts";
import { useTransactions } from "./useTransactions";
import { useChartData } from "./useChartData";
import { useTransactionDisplay } from "./useTransactionDisplay";

export const useAccountHistory = (
  params: Feedback & {
    supabase: SupabaseClient;
    user: Readonly<Ref<AppUser | null>>;
    accounts: Ref<Account[]>;
    childUsers: Ref<AppUser[]>;
    selectedAccount: Readonly<Ref<Account | null>>;
    timeZone: Ref<string>;
    voidTransaction: LedgerCommands["voidTransaction"];
  },
) => {
  const display = useTransactionDisplay(params);
  const pages = useTransactions({
    ...params,
    includeVoided: computed(() => params.user.value?.role === "parent"),
  });
  const { chartPoints } = useChartData({
    ...params,
    chartTransactions: pages.chartTransactions,
    chartBaseBalance: pages.chartBaseBalance,
    signedAmount: display.signedAmount,
  });
  const voiding = ref(false);
  let active = true;
  let voidGeneration = 0;
  if (getCurrentScope())
    onScopeDispose(() => {
      active = false;
    });
  const refresh = async () => {
    const id = params.selectedAccount.value?.id;
    if (id) return await pages.resetSelectedAccountData(id);
    pages.clearTransactions();
    return true;
  };
  watch(() => params.selectedAccount.value?.id, refresh);
  watch(
    params.user,
    () => {
      voidGeneration += 1;
      voiding.value = false;
      pages.clearTransactions();
    },
    { flush: "sync" },
  );
  const handleLoadMoreForSelected = async () => {
    const id = params.selectedAccount.value?.id;
    if (id) await pages.handleLoadMoreTransactions(id);
  };
  const handleVoidTransaction = async (transaction: Transaction) => {
    if (
      voiding.value ||
      pages.transactionLoading.value ||
      transaction.is_void ||
      params.user.value?.role !== "parent" ||
      transaction.account_id !== params.selectedAccount.value?.id
    )
      return;
    const actor = params.user.value;
    const generation = voidGeneration;
    voiding.value = true;
    try {
      const result = await params.voidTransaction(transaction.id);
      if (!active || params.user.value !== actor) return;
      if (result.ok) {
        params.setSuccessStatus("交易已作废。");
        if (result.warning) params.setErrorStatus(result.warning);
      } else params.setErrorStatus(result.message);
    } finally {
      if (generation === voidGeneration) voiding.value = false;
    }
  };
  return {
    ...display,
    chartPoints,
    pagedTransactions: computed(() =>
      pages.transactions.value.filter(
        (row) => row.account_id === params.selectedAccount.value?.id,
      ),
    ),
    hasMoreTransactions: pages.hasMoreTransactions,
    transactionLoading: computed(
      () => pages.transactionLoading.value || voiding.value,
    ),
    refresh,
    handleLoadMoreForSelected,
    handleVoidTransaction,
  };
};
