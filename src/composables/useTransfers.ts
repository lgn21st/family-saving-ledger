import type { Ref } from "vue";
import type { Account } from "../types";

type RpcOptions = {
  head?: boolean;
  get?: boolean;
  count?: "exact" | "planned" | "estimated";
};

type SupabaseClient = {
  rpc: (fn: string, args?: Record<string, unknown>, options?: RpcOptions) => any;
};

export const useTransfers = (params: {
  supabase: SupabaseClient;
  userId: Ref<string | null>;
  selectedAccountId: Ref<string | null>;
  transferAmount: Ref<string>;
  transferTargetId: Ref<string>;
  transferNote: Ref<string>;
  accounts: Ref<Account[]>;
  balances: Ref<Record<string, number>>;
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
    transferAmount,
    transferTargetId,
    transferNote,
    accounts,
    balances,
    loading,
    setStatus,
    setErrorStatus,
    setSuccessStatus,
    refreshAccountData,
  } = params;

  const handleTransfer = async () => {
    if (!selectedAccountId.value || !userId.value) return;

    const amount = Number.parseFloat(transferAmount.value);
    if (Number.isNaN(amount) || amount <= 0) {
      setStatus("请输入有效转账金额。");
      return;
    }

    const balance = balances.value[selectedAccountId.value] ?? 0;
    if (amount > balance) {
      setStatus("转出金额不能超过当前余额。");
      return;
    }

    const targetAccount = accounts.value.find(
      (account) => account.id === transferTargetId.value,
    );
    if (!targetAccount) {
      setStatus("请选择转入账户。");
      return;
    }

    const sourceAccount = accounts.value.find(
      (account) => account.id === selectedAccountId.value,
    );
    if (!sourceAccount) {
      setStatus("请选择转出账户。");
      return;
    }

    if (targetAccount.currency !== sourceAccount.currency) {
      setStatus("只能在相同币种账户之间转账。");
      return;
    }

    loading.value = true;
    const { error } = await supabase.rpc("transfer_between_accounts", {
      p_source_account_id: sourceAccount.id,
      p_target_account_id: targetAccount.id,
      p_amount: amount,
      p_note: transferNote.value.trim(),
      p_created_by: userId.value,
    });

    if (error) {
      setErrorStatus(error.message);
      loading.value = false;
      return;
    }

    transferAmount.value = "";
    transferTargetId.value = "";
    transferNote.value = "";
    setSuccessStatus("转账完成。");
    await refreshAccountData();
    loading.value = false;
  };

  return {
    handleTransfer,
  };
};
