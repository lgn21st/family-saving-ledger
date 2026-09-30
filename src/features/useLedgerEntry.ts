import { getCurrentScope, onScopeDispose, ref } from "vue";
import type { LedgerActionResult } from "../types";
import type { EntryServices } from "./contracts";

export const useLedgerEntry = (
  params: Pick<
    EntryServices,
    | "selectedAccount"
    | "transferTargets"
    | "balances"
    | "addTransaction"
    | "transfer"
    | "retryPending"
    | "setSuccessStatus"
    | "setErrorStatus"
  >,
) => {
  const amountInput = ref("");
  const noteInput = ref("");
  const transferAmount = ref("");
  const transferTargetId = ref("");
  const transferNote = ref("");
  const loading = ref(false);
  let active = true;
  if (getCurrentScope())
    onScopeDispose(() => {
      active = false;
    });
  const submit = async (
    action: () => Promise<LedgerActionResult>,
    success: () => void,
  ): Promise<LedgerActionResult> => {
    if (loading.value) return { ok: false, message: "正在保存，请稍候…" };
    loading.value = true;
    try {
      const result = await action();
      if (result.ok && active) {
        success();
        if (result.warning) params.setErrorStatus(result.warning);
      }
      return result;
    } finally {
      loading.value = false;
    }
  };
  const handleAddTransaction = async (
    type: "deposit" | "withdrawal",
  ): Promise<LedgerActionResult> => {
    const account = params.selectedAccount.value;
    if (!account) return { ok: false, message: "请选择可用账户。" };
    const amount = Number(amountInput.value);
    if (!Number.isFinite(amount) || amount <= 0)
      return { ok: false, message: "请输入有效金额。" };
    const note = noteInput.value.trim();
    if (!note) return { ok: false, message: "请输入备注。" };
    const input = { accountId: account.id, type, amount, note };
    return submit(
      () => params.addTransaction(input),
      () => {
        amountInput.value = "";
        noteInput.value = "";
        params.setSuccessStatus("已保存交易。");
      },
    );
  };
  const handleTransfer = async (): Promise<LedgerActionResult> => {
    const source = params.selectedAccount.value;
    if (!source) return { ok: false, message: "请选择可用的转出账户。" };
    const amount = Number(transferAmount.value);
    if (!Number.isFinite(amount) || amount <= 0)
      return { ok: false, message: "请输入有效转账金额。" };
    if (amount > (params.balances.value[source.id] ?? 0))
      return { ok: false, message: "转出金额不能超过当前余额。" };
    const target = params.transferTargets.value.find(
      (account) => account.id === transferTargetId.value,
    );
    if (!target) return { ok: false, message: "请选择转入账户。" };
    if (target.currency !== source.currency)
      return { ok: false, message: "只能在相同币种账户之间转账。" };
    const input = {
      sourceAccountId: source.id,
      targetAccountId: target.id,
      amount,
      note: transferNote.value.trim(),
    };
    return submit(
      () => params.transfer(input),
      () => {
        transferAmount.value = "";
        transferTargetId.value = "";
        transferNote.value = "";
        params.setSuccessStatus("转账完成。");
      },
    );
  };
  const handleRetryPending = () => submit(params.retryPending, () => {
    amountInput.value = noteInput.value = transferAmount.value = transferTargetId.value = transferNote.value = "";
    params.setSuccessStatus("原交易已确认保存。");
  });
  return {
    handleRetryPending,
    amountInput,
    noteInput,
    transferAmount,
    transferTargetId,
    transferNote,
    loading,
    handleAddTransaction,
    handleTransfer,
  };
};
