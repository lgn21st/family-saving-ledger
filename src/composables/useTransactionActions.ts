import type { Ref } from "vue";
import type { LedgerActionResult, SupabaseRpcClient } from "../types";
import { mapErrorMessage } from "./useStatus";

export const useTransactionActions = (params: {
  supabase: SupabaseRpcClient;
  userId: Ref<string | null>;
  selectedAccountId: Ref<string | null>;
  amountInput: Ref<string>;
  noteInput: Ref<string>;
  loading: Ref<boolean>;
  setSuccessStatus: (message: string) => void;
  refreshAccountData: () => Promise<void>;
}) => {
  const {
    supabase,
    userId,
    selectedAccountId,
    amountInput,
    noteInput,
    loading,
    setSuccessStatus,
    refreshAccountData,
  } = params;

  const handleAddTransaction = async (
    type: "deposit" | "withdrawal",
  ): Promise<LedgerActionResult> => {
    if (!selectedAccountId.value || !userId.value) {
      return { ok: false, message: "请选择可用账户。" };
    }

    const amount = Number.parseFloat(amountInput.value);
    if (Number.isNaN(amount) || amount <= 0) {
      return { ok: false, message: "请输入有效金额。" };
    }

    const trimmedNote = noteInput.value.trim();
    if (!trimmedNote) {
      return { ok: false, message: "请输入备注。" };
    }

    loading.value = true;
    const { error } = await supabase.rpc("apply_transaction", {
      p_account_id: selectedAccountId.value,
      p_type: type,
      p_amount: amount,
      p_note: trimmedNote,
      p_created_by: userId.value,
    });

    if (error) {
      loading.value = false;
      return { ok: false, message: mapErrorMessage(error.message) };
    }

    amountInput.value = "";
    noteInput.value = "";
    setSuccessStatus("已保存交易。");
    await refreshAccountData();
    loading.value = false;
    return { ok: true };
  };

  return {
    handleAddTransaction,
  };
};
