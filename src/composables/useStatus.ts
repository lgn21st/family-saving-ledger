import { getCurrentInstance, onBeforeUnmount, ref, watch } from "vue";
import type { StatusTone } from "../types";

export const mapErrorMessage = (message: string) => {
  if (message.includes("Insufficient balance")) return "余额不足。";
  if (message.includes("Account not found or inactive")) return "账户不可用。";
  if (message.includes("Account balance must be zero before closing"))
    return "请先将账户余额清零后再关闭。";
  if (message.includes("All child account balances must be zero"))
    return "请先将该孩子所有账户余额清零后再归档。";
  if (message.includes("Child not found or inactive")) return "孩子不可用。";
  if (message.includes("Only an active parent")) return "仅家长可以执行此操作。";
  if (message.includes("Transfer currency mismatch"))
    return "只能在相同币种账户之间转账。";
  if (message.includes("Amount must be positive")) return "请输入有效金额。";
  if (message.includes("Source and target accounts must differ"))
    return "请选择不同的账户。";
  if (message.includes("Unsupported transaction type"))
    return "交易类型不支持。";
  return message;
};

export const useStatus = () => {
  const status = ref<string | null>(null);
  const statusTone = ref<StatusTone>("error");
  let statusTimeoutId: number | null = null;

  const setStatus = (message: string | null) => {
    statusTone.value = "error";
    status.value = message;
  };

  const setErrorStatus = (message: string) => {
    statusTone.value = "error";
    status.value = mapErrorMessage(message);
  };

  const setSuccessStatus = (message: string) => {
    statusTone.value = "success";
    status.value = message;
  };

  const clearStatus = () => {
    status.value = null;
    if (statusTimeoutId) window.clearTimeout(statusTimeoutId);
    statusTimeoutId = null;
  };

  watch(status, (nextStatus) => {
    if (!nextStatus) return;
    if (statusTimeoutId) window.clearTimeout(statusTimeoutId);
    const timeoutMs = statusTone.value === "success" ? 4000 : 6000;
    statusTimeoutId = window.setTimeout(() => {
      if (status.value === nextStatus) status.value = null;
    }, timeoutMs);
  });

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      if (statusTimeoutId) window.clearTimeout(statusTimeoutId);
    });
  }

  return {
    status,
    statusTone,
    setStatus,
    setErrorStatus,
    setSuccessStatus,
    clearStatus,
  };
};
