import type { Ref } from "vue";
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
  const run = async (
    fn: string,
    args: Record<string, unknown>,
    actorParameter: string,
    change: LedgerChange,
  ): Promise<LedgerActionResult> => {
    const actor = params.user.value;
    if (!actor || actor.role !== "parent" || actor.is_active === false)
      return { ok: false, message: "仅家长可以执行此操作。" };
    let warning: string | undefined;
    try {
      const { error } = await params.supabase.rpc(fn, {
        ...args,
        [actorParameter]: actor.id,
      });
      if (error) {
        return { ok: false, message: mapErrorMessage(error.message) };
      }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "操作失败，请重试。",
      };
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
  return {
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
      run("apply_transaction", {
        p_account_id: input.accountId,
        p_type: input.type,
        p_amount: input.amount,
        p_note: input.note,
      }, "p_created_by", { kind: "transactions" }),
    transfer: (input: TransferInput) =>
      run("transfer_between_accounts", {
        p_source_account_id: input.sourceAccountId,
        p_target_account_id: input.targetAccountId,
        p_amount: input.amount,
        p_note: input.note,
      }, "p_created_by", { kind: "transactions" }),
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
