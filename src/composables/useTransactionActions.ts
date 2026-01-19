import type { Ref } from "vue";

type RpcOptions = {
  head?: boolean;
  get?: boolean;
  count?: "exact" | "planned" | "estimated";
};

type SupabaseClient = {
  rpc: (fn: string, args?: Record<string, unknown>, options?: RpcOptions) => any;
};

export const useTransactionActions = (params: {
  supabase: SupabaseClient;
  userId: Ref<string | null>;
  selectedAccountId: Ref<string | null>;
  amountInput: Ref<string>;
  noteInput: Ref<string>;
  loading: Ref<boolean>;
  setStatus: (message: string) => void;
  setErrorStatus: (message: string) => void;
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
    setStatus,
    setErrorStatus,
    setSuccessStatus,
    refreshAccountData,
  } = params;

  const handleAddTransaction = async (type: "deposit" | "withdrawal") => {
    if (!selectedAccountId.value || !userId.value) return;

    const amount = Number.parseFloat(amountInput.value);
    if (Number.isNaN(amount) || amount <= 0) {
      setStatus("请输入有效金额。");
      return;
    }

    const trimmedNote = noteInput.value.trim();
    if (!trimmedNote) {
      setStatus("请输入备注。");
      return;
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
      setErrorStatus(error.message);
      loading.value = false;
      return;
    }

    amountInput.value = "";
    noteInput.value = "";
    setSuccessStatus("已保存交易。");
    await refreshAccountData();
    loading.value = false;
  };

  return {
    handleAddTransaction,
  };
};
