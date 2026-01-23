/**
 * 账户数据管理
 * 加载账户列表和余额信息
 *
 * 功能：
 * - 根据用户角色加载对应账户（家长看全部，孩子看自己的）
 * - 加载账户余额（从 account_balances 视图）
 * - 余额按账户 ID 索引，便于快速查询
 */
import { ref } from "vue";
import type { Account, AppUser, SupabaseFromClient } from "../types";

export const useAccounts = (params: {
  supabase: SupabaseFromClient;
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
    balances.value = rows.reduce(
      (result, row) => {
        result[row.account_id] = Number(row.balance ?? 0);
        return result;
      },
      {} as Record<string, number>,
    );
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

    const loadedAccounts = (data ?? []) as Account[];
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
