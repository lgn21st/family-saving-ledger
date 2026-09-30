import { ref } from "vue";
import type { Account, AppUser, SupabaseFromClient } from "../types";

export const useAccounts = (params: {
  supabase: SupabaseFromClient;
  setErrorStatus: (message: string) => void;
}) => {
  const { supabase, setErrorStatus } = params;

  const accounts = ref<Account[]>([]);
  const balances = ref<Record<string, number>>({});

  let accountsGeneration = 0;
  let balancesGeneration = 0;
  const reset = () => {
    accountsGeneration += 1;
    balancesGeneration += 1;
    accounts.value = [];
    balances.value = {};
  };
  const loadBalances = async (loadedAccounts: Account[]) => {
    const request = ++balancesGeneration;
    if (loadedAccounts.length === 0) {
      balances.value = {};
      return true;
    }

    const accountIds = loadedAccounts.map((account) => account.id);
    const { data, error } = await supabase
      .from("account_balances")
      .select("account_id, balance")
      .in("account_id", accountIds);

    if (request !== balancesGeneration) return false;
    if (error) {
      setErrorStatus(error.message);
      return false;
    }

    const rows = (data ?? []) as Array<{
      account_id: string;
      balance: number | null;
    }>;
    balances.value = rows.reduce(
      (result, row) => {
        result[row.account_id] = Number(row.balance ?? 0);
        return result;
      },
      {} as Record<string, number>,
    );
    return true;
  };

  const loadAccounts = async (currentUser: AppUser) => {
    const request = ++accountsGeneration;
    const query = supabase.from("accounts").select("*").eq("is_active", true);
    const { data, error } =
      currentUser.role === "parent"
        ? await query.order("created_at")
        : await query.eq("owner_child_id", currentUser.id).order("created_at");

    if (request !== accountsGeneration) return false;
    if (error) {
      setErrorStatus(error.message);
      return false;
    }

    const loadedAccounts = (data ?? []) as Account[];
    accounts.value = loadedAccounts;
    return await loadBalances(loadedAccounts);
  };

  return {
    accounts,
    balances,
    reset,
    loadAccounts,
    loadBalances,
  };
};
