import { ref } from "vue";
import type { Account, AppUser } from "../types";

type SupabaseBalancesClient = {
  from: (...args: unknown[]) => any;
};

export const useAccounts = (params: {
  supabase: SupabaseBalancesClient;
  setErrorStatus: (message: string) => void;
}) => {
  const { supabase, setErrorStatus } = params;

  const accounts = ref<Account[]>([]);
  const balances = ref<Record<string, number>>({});

  const loadBalances = async (loadedAccounts: Account[]) => {
    if (loadedAccounts.length === 0) {
      balances.value = {};
      return;
    }

    const accountIds = loadedAccounts.map((account) => account.id);
    const { data, error } = await supabase
      .from("account_balances")
      .select("account_id, balance")
      .in("account_id", accountIds);

    if (error) {
      setErrorStatus(error.message);
      return;
    }

    const rows = (data ?? []) as Array<{
      account_id: string;
      balance: number | null;
    }>;
    balances.value = rows.reduce((result, row) => {
      result[row.account_id] = Number(row.balance ?? 0);
      return result;
    }, {} as Record<string, number>);
  };

  const loadAccounts = async (currentUser: AppUser) => {
    const query = supabase.from("accounts").select("*").eq("is_active", true);
    const { data, error } =
      currentUser.role === "parent"
        ? await query.order("created_at")
        : await query.eq("owner_child_id", currentUser.id).order("created_at");

    if (error) {
      setErrorStatus(error.message);
      return;
    }

    const loadedAccounts = data ?? [];
    accounts.value = loadedAccounts;
    await loadBalances(loadedAccounts);
  };

  return {
    accounts,
    balances,
    loadAccounts,
    loadBalances,
  };
};
