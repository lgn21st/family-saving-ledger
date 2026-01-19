import { computed, getCurrentInstance, onBeforeUnmount, ref, watch } from "vue";
import type { StatusTone } from "../types";

const successMessages = new Set([
  "已保存交易。",
  "账户已创建。",
  "孩子用户已创建。",
  "已删除孩子及关联账户。",
  "已更新名称。",
  "账户名称已更新。",
  "转账完成。",
]);

const mapErrorMessage = (message: string) => {
  if (message.includes("Insufficient balance")) return "余额不足。";
  if (message.includes("Account not found or inactive")) return "账户不可用。";
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
  let statusTimeoutId: number | null = null;

  const statusTone = computed<StatusTone>(() => {
    if (!status.value) return "error";
    return successMessages.has(status.value) ? "success" : "error";
  });

  const setStatus = (message: string | null) => {
    status.value = message;
  };

  const setErrorStatus = (message: string) => {
    status.value = mapErrorMessage(message);
  };

  const setSuccessStatus = (message: string) => {
    status.value = message;
  };

  watch(status, (nextStatus) => {
    if (!nextStatus) return;
    if (statusTimeoutId) window.clearTimeout(statusTimeoutId);
    const timeoutMs = successMessages.has(nextStatus) ? 1500 : 3000;
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
  };
};
