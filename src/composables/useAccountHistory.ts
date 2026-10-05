import {
  computed,
  getCurrentScope,
  onScopeDispose,
  ref,
  watch,
  type Ref,
} from "vue";
import type { Account, AppUser, SupabaseClient, Transaction, TransactionNoteEdit,
  NoteHistoryResult, UpdateTransactionNoteInput, TransactionNoteResult } from "../types";
import type { LedgerCommands } from "./useLedgerCommands";
import type { Feedback } from "../features/contracts";
import { useTransactions } from "./useTransactions";
import { useChartData } from "./useChartData";
import { useTransactionDisplay } from "./useTransactionDisplay";
import { addZonedDays, startOfZonedMonth } from "../utils/timezone";

export const useAccountHistory = (
  params: Feedback & {
    supabase: SupabaseClient;
    user: Readonly<Ref<AppUser | null>>;
    accounts: Ref<Account[]>;
    childUsers: Ref<AppUser[]>;
    selectedAccount: Readonly<Ref<Account | null>>;
    timeZone: Ref<string>;
    voidTransaction: LedgerCommands["voidTransaction"];
    updateTransactionNote?: LedgerCommands["updateTransactionNote"];
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
    asOf: pages.historyDate,
    signedAmount: display.signedAmount,
  });
  const monthChanges = computed(() => {
    if (!pages.chartReady.value || !params.selectedAccount.value) return null;
    const start = startOfZonedMonth(pages.historyDate.value, params.timeZone.value);
    // Every calendar month has fewer than 32 days.
    const end = startOfZonedMonth(addZonedDays(start, 32, params.timeZone.value), params.timeZone.value);
    const totals = { deposit: 0, withdrawal: 0, transfer_in: 0, transfer_out: 0, interest: 0 };
    for (const transaction of pages.chartTransactions.value) {
      const date = new Date(transaction.created_at);
      if (transaction.account_id !== params.selectedAccount.value.id || transaction.is_void || date < start || date >= end) continue;
      totals[transaction.type] += Math.round(Number(transaction.amount) * 100);
    }
    for (const type of Object.keys(totals) as Transaction["type"][]) totals[type] /= 100;
    return totals;
  });
  const voiding = ref(false);
  let active = true;
  let voidGeneration = 0;
  let noteGeneration = 0;
  if (getCurrentScope())
    onScopeDispose(() => {
      active = false;
      pages.clearTransactions();
    });
  const refresh = async () => {
    const id = params.selectedAccount.value?.id;
    if (id) return await pages.resetSelectedAccountData(id);
    pages.clearTransactions();
    return true;
  };
  watch(() => params.selectedAccount.value?.id, () => {
    noteGeneration += 1;
    void refresh();
  });
  watch(
    params.user,
    () => {
      voidGeneration += 1;
      noteGeneration += 1;
      voiding.value = false;
      pages.clearTransactions();
    },
    { flush: "sync" },
  );
  const handleLoadMoreForSelected = async () => {
    const id = params.selectedAccount.value?.id;
    if (id) await pages.handleLoadMoreTransactions(id);
  };
  const handleLoadAllForSelected = async () => {
    const id = params.selectedAccount.value?.id;
    if (id) await pages.handleLoadAllTransactions(id);
  };
  const handleVoidTransaction = async (transaction: Transaction) => {
    if (
      voiding.value ||
      pages.transactionLoading.value ||
      transaction.is_void ||
      transaction.type === "interest" ||
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
  const handleUpdateTransactionNote = async (input: UpdateTransactionNoteInput): Promise<TransactionNoteResult> => {
    const actor = params.user.value;
    const accountId = params.selectedAccount.value?.id;
    const generation = noteGeneration;
    if (actor?.role !== "parent" || !params.updateTransactionNote ||
      !pages.transactions.value.some(row => row.id === input.transactionId && row.account_id === accountId))
      return { ok: false, message: "当前交易不可编辑，请重新打开账本。" };
    const result = await params.updateTransactionNote(input);
    if (!active || generation !== noteGeneration || params.user.value !== actor || params.selectedAccount.value?.id !== accountId)
      return { ok: false, message: "账户或会话已切换，请重新打开账本。" };
    const updated = result.ok ? result.transactions : result.latest ? [result.latest] : [];
    const replace = (rows: Transaction[]) => rows.map(row => {
      const next = updated.find(next => next.id === row.id);
      return next && (next.note_revision ?? 0) >= (row.note_revision ?? 0) ? next : row;
    });
    pages.transactions.value = replace(pages.transactions.value);
    pages.chartTransactions.value = replace(pages.chartTransactions.value);
    if (result.ok) params.setSuccessStatus("备注已更新。");
    return result;
  };
  const loadNoteHistory = async (transactionId: string): Promise<NoteHistoryResult> => {
    const actor = params.user.value;
    try {
      const { data, error } = await params.supabase.from("transaction_note_edits")
        .select("*").eq("transaction_id", transactionId).order("revision", { ascending: false });
      if (!active || params.user.value !== actor)
        return { ok: false, message: "会话已切换，请重新打开账本。" };
      if (error) return { ok: false, message: "修改记录加载失败，请重试。" };
      return { ok: true, edits: (data ?? []) as TransactionNoteEdit[] };
    } catch {
      return { ok: false, message: "修改记录加载失败，请重试。" };
    }
  };
  return {
    ...display,
    chartPoints,
    monthChanges,
    pagedTransactions: computed(() =>
      pages.transactions.value.filter(
        (row) => row.account_id === params.selectedAccount.value?.id,
      ),
    ),
    hasMoreTransactions: pages.hasMoreTransactions,
    transactionLoading: computed(
      () => pages.transactionLoading.value || pages.chartLoading.value || voiding.value,
    ),
    refresh,
    handleLoadMoreForSelected,
    handleLoadAllForSelected,
    handleVoidTransaction,
    handleUpdateTransactionNote,
    loadNoteHistory,
  };
};
