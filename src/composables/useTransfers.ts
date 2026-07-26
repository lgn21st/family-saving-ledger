import type { Ref } from "vue";
import type { Account, LedgerActionResult, SupabaseRpcClient } from "../types";
import { mapErrorMessage } from "./useStatus";

export const useTransfers = (params: {
  supabase: SupabaseRpcClient;
  userId: Ref<string | null>;
  selectedAccountId: Ref<string | null>;
  transferAmount: Ref<string>;
  transferTargetId: Ref<string>;
  transferNote: Ref<string>;
  accounts: Ref<Account[]>;
  balances: Ref<Record<string, number>>;
  loading: Ref<boolean>;
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
    setSuccessStatus,
    refreshAccountData,
  } = params;

  const handleTransfer = async (): Promise<LedgerActionResult> => {
    if (!selectedAccountId.value || !userId.value) {
      return { ok: false, message: "请选择可用的转出账户。" };
    }

    const amount = Number.parseFloat(transferAmount.value);
    if (Number.isNaN(amount) || amount <= 0) {
      return { ok: false, message: "请输入有效转账金额。" };
    }

    const balance = balances.value[selectedAccountId.value] ?? 0;
    if (amount > balance) {
      return { ok: false, message: "转出金额不能超过当前余额。" };
    }

    const targetAccount = accounts.value.find(
      (account) => account.id === transferTargetId.value,
    );
    if (!targetAccount) {
      return { ok: false, message: "请选择转入账户。" };
    }

    const sourceAccount = accounts.value.find(
      (account) => account.id === selectedAccountId.value,
    );
    if (!sourceAccount) {
      return { ok: false, message: "请选择转出账户。" };
    }

    if (targetAccount.currency !== sourceAccount.currency) {
      return { ok: false, message: "只能在相同币种账户之间转账。" };
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
      loading.value = false;
      return { ok: false, message: mapErrorMessage(error.message) };
    }

    transferAmount.value = "";
    transferTargetId.value = "";
    transferNote.value = "";
    setSuccessStatus("转账完成。");
    await refreshAccountData();
    loading.value = false;
    return { ok: true };
  };

  return {
    handleTransfer,
  };
};
