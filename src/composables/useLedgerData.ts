import { onScopeDispose, ref, watch, type Ref } from "vue";
import type { AppUser, LedgerChange, SupabaseFromClient } from "../types";
import { DEFAULT_LEDGER_TIMEZONE } from "../utils/timezone";
import { useAccounts } from "./useAccounts";
import { useUsers } from "./useUsers";

/** Shared authoritative read data, scoped to the current session. */
export const useLedgerData = (params: {
  supabase: SupabaseFromClient;
  user: Readonly<Ref<AppUser | null>>;
  setErrorStatus: (message: string) => void;
}) => {
  const accountData = useAccounts(params);
  const users = useUsers(params);
  const ledgerTimeZone = ref(DEFAULT_LEDGER_TIMEZONE);
  const loadLedgerTimeZone = async () => {
    try {
      const { data, error } = await params.supabase
        .from("settings")
        .select("timezone")
        .limit(1);
      if (error) return params.setErrorStatus(error.message);
      const row = (data?.[0] ?? null) as { timezone?: string | null } | null;
      if (row?.timezone) ledgerTimeZone.value = row.timezone;
    } catch {
      params.setErrorStatus("账本时区加载失败，暂时使用默认时区。");
    }
  };
  const reload = async () => {
    const user = params.user.value;
    if (!user) return false;
    if (!(await accountData.loadAccounts(user)) || params.user.value !== user) return false;
    return user.role !== "parent" || await users.loadChildUsers();
  };
  watch(params.user, async (user) => {
    accountData.reset();
    users.resetChildren();
    if (!user) return;
    try {
      await reload();
    } catch {
      if (params.user.value === user)
        params.setErrorStatus("账本加载失败，请重试。");
    }
  });
  onScopeDispose(() => {
    accountData.reset();
    users.resetChildren();
  });
  const requireLoaded = async (read: Promise<boolean>) => {
    if (!(await read)) throw new Error("Read data could not be refreshed");
  };
  const refresh = async (change: LedgerChange) => {
    const user = params.user.value;
    if (!user) return;
    if (change.kind === "members") {
      await requireLoaded(users.loadChildUsers());
      if (params.user.value !== user) return;
      await requireLoaded(users.loadLoginUsers());
      if (change.accountsChanged && params.user.value === user)
        await requireLoaded(accountData.loadAccounts(user));
    } else if (change.kind === "accounts")
      await requireLoaded(accountData.loadAccounts(user));
    else
      await requireLoaded(accountData.loadBalances(accountData.accounts.value));
  };
  return {
    ...accountData,
    ...users,
    ledgerTimeZone,
    loadLedgerTimeZone,
    reload,
    refresh,
  };
};
