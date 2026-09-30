import { computed, ref, watch, type Ref } from "vue";
import type {
  AppUser,
  LedgerActionResult,
  SupabaseRpcClient,
  CreateChildInput,
  CreateAccountInput,
  TransactionInput,
  TransferInput,
  LedgerChange,
} from "../types";
import { mapErrorMessage } from "./useStatus";

/** Persistence commands receive values, never form refs or the current selection. */
export const useLedgerCommands = (params: {
  supabase: SupabaseRpcClient;
  user: Readonly<Ref<AppUser | null>>;
  onChanged: (change: LedgerChange) => Promise<void>;
}) => {
  type PendingWrite = {
    actorId: string;
    requestId: string;
    fn: "apply_transaction" | "transfer_between_accounts";
    args: Record<string, unknown>;
  };
  const pending = ref<PendingWrite | null>(null);
  const inFlight = new Set<string>();
  const storageKey = (actorId: string) => `homebank.pending-write.${actorId}`;
  const uncertain = (): LedgerActionResult => ({
    ok: false,
    uncertain: true,
    message: "交易结果尚未确认，请重试确认原操作，勿重复记账。",
  });
  const readPending = (actorId: string): PendingWrite | null => {
    const raw = localStorage.getItem(storageKey(actorId));
    if (!raw) return null;
    const value = JSON.parse(raw) as PendingWrite;
    const args = value.args;
    if (
      value.actorId !== actorId ||
      typeof value.requestId !== "string" ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value.requestId) ||
      !args ||
      typeof args.p_amount !== "number" ||
      !Number.isFinite(args.p_amount) ||
      args.p_amount <= 0 ||
      typeof args.p_note !== "string" ||
      (value.fn === "apply_transaction"
        ? typeof args.p_account_id !== "string" ||
          !["deposit", "withdrawal"].includes(String(args.p_type))
        : value.fn !== "transfer_between_accounts" ||
          typeof args.p_source_account_id !== "string" ||
          typeof args.p_target_account_id !== "string")
    ) {
      throw new Error("Invalid pending transaction");
    }
    return value;
  };
  watch(
    params.user,
    (actor) => {
      try {
        pending.value = actor?.role === "parent" ? readPending(actor.id) : null;
      } catch {
        pending.value = null;
      }
    },
    { immediate: true, flush: "sync" },
  );
  const clearPending = (receipt: PendingWrite) => {
    if (readPending(receipt.actorId)?.requestId !== receipt.requestId) return;
    localStorage.removeItem(storageKey(receipt.actorId));
    if (params.user.value?.id === receipt.actorId) pending.value = null;
  };
  const run = async (
    fn: string,
    args: Record<string, unknown>,
    actorParameter: string,
    change: LedgerChange,
    receipt?: PendingWrite,
  ): Promise<LedgerActionResult> => {
    const actor = params.user.value;
    if (!actor || actor.role !== "parent" || actor.is_active === false)
      return { ok: false, message: "仅家长可以执行此操作。" };
    let warning: string | undefined;
    try {
      const { error, status } = await params.supabase.rpc(fn, {
        ...args,
        [actorParameter]: actor.id,
        ...(receipt ? { p_request_id: receipt.requestId } : {}),
      });
      if (error) {
        // Gateway/transport failures may arrive after the transaction commits.
        const databaseRejected =
          /^[0-9A-Z]{5}$/.test(error.code ?? "") &&
          !/^(08|40003)/.test(error.code ?? "");
        if (
          receipt &&
          !databaseRejected &&
          !(status && status >= 400 && status < 500 && status !== 408)
        )
          return uncertain();
        if (receipt) clearPending(receipt);
        return { ok: false, message: mapErrorMessage(error.message) };
      }
    } catch (error) {
      if (receipt) return uncertain();
      return {
        ok: false,
        message: error instanceof Error ? error.message : "操作失败，请重试。",
      };
    }
    if (receipt) {
      try {
        clearPending(receipt);
      } catch {
        warning = "交易已保存，但本机恢复信息未清除，下次确认仍不会重复入账。";
      }
    }
    if (params.user.value !== actor)
      return { ok: true, ...(warning ? { warning } : {}) };
    try {
      await params.onChanged(change);
    } catch {
      if (params.user.value === actor)
        warning = "操作已保存，但刷新失败，请重新打开账本。";
    }
    return { ok: true, ...(warning ? { warning } : {}) };
  };
  const writeMoney = async (
    fn: PendingWrite["fn"],
    args: Record<string, unknown>,
    retryReceipt?: PendingWrite,
  ): Promise<LedgerActionResult> => {
    const actor = params.user.value;
    if (!actor || actor.role !== "parent" || actor.is_active === false)
      return { ok: false, message: "仅家长可以执行此操作。" };
    if (inFlight.has(actor.id))
      return { ok: false, message: "正在保存，请稍候…" };
    let receipt: PendingWrite;
    try {
      const existing = readPending(actor.id);
      if (
        existing &&
        (existing.fn !== fn ||
          JSON.stringify(existing.args) !== JSON.stringify(args) ||
          (retryReceipt && existing.requestId !== retryReceipt.requestId))
      ) {
        pending.value = existing;
        return uncertain();
      }
      receipt = existing ??
        retryReceipt ?? {
          actorId: actor.id,
          requestId: crypto.randomUUID(),
          fn,
          args: { ...args },
        };
      localStorage.setItem(storageKey(actor.id), JSON.stringify(receipt));
      pending.value = receipt;
    } catch {
      return {
        ok: false,
        message: "无法读取或保存交易恢复信息，请检查浏览器存储后再操作。",
      };
    }
    inFlight.add(actor.id);
    try {
      return await run(
        receipt.fn,
        receipt.args,
        "p_created_by",
        { kind: "transactions" },
        receipt,
      );
    } finally {
      inFlight.delete(actor.id);
    }
  };

  return {
    pendingWrite: computed(() => pending.value),
    retryPending: async (): Promise<LedgerActionResult> => {
      const receipt = pending.value;
      if (!receipt || receipt.actorId !== params.user.value?.id)
        return { ok: false, message: "没有待确认交易。" };
      return writeMoney(receipt.fn, receipt.args, receipt);
    },
    createChild: (input: CreateChildInput) =>
      run(
        "create_child",
        {
          p_name: input.name,
          p_pin: input.pin,
          p_avatar_id: input.avatarId,
        },
        "p_created_by",
        { kind: "members" },
      ),
    updateChildName: (childId: string, name: string) =>
      run(
        "update_child_name",
        {
          p_child_id: childId,
          p_name: name,
        },
        "p_updated_by",
        { kind: "members" },
      ),
    archiveChild: (childId: string) =>
      run(
        "archive_child",
        {
          p_child_id: childId,
        },
        "p_archived_by",
        { kind: "members", accountsChanged: true },
      ),
    createAccount: (input: CreateAccountInput) =>
      run(
        "create_account",
        {
          p_name: input.name,
          p_currency: input.currency,
          p_owner_child_id: input.ownerChildId,
        },
        "p_created_by",
        { kind: "accounts" },
      ),
    updateAccountName: (accountId: string, name: string) =>
      run(
        "update_account_name",
        {
          p_account_id: accountId,
          p_name: name,
        },
        "p_updated_by",
        { kind: "accounts" },
      ),
    closeAccount: (accountId: string) =>
      run(
        "close_account",
        {
          p_account_id: accountId,
        },
        "p_closed_by",
        { kind: "accounts" },
      ),
    addTransaction: (input: TransactionInput) =>
      writeMoney("apply_transaction", {
        p_account_id: input.accountId,
        p_type: input.type,
        p_amount: input.amount,
        p_note: input.note,
      }),
    transfer: (input: TransferInput) =>
      writeMoney("transfer_between_accounts", {
        p_source_account_id: input.sourceAccountId,
        p_target_account_id: input.targetAccountId,
        p_amount: input.amount,
        p_note: input.note,
      }),
    voidTransaction: (transactionId: string) =>
      run(
        "void_transaction",
        {
          p_transaction_id: transactionId,
        },
        "p_voided_by",
        { kind: "transactions" },
      ),
  };
};

export type LedgerCommands = ReturnType<typeof useLedgerCommands>;
