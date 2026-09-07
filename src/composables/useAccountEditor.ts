import type { Ref } from "vue";
import type { Account, AppUser, SupabaseRpcClient } from "../types";

export const useAccountEditor = (params: {
  supabase: SupabaseRpcClient;
  user: Ref<AppUser | null>;
  supportedCurrencies: string[];
  loading: Ref<boolean>;
  newAccountName: Ref<string>;
  newAccountCurrency: Ref<string>;
  newAccountOwnerId: Ref<string>;
  editingAccountId: Ref<string | null>;
  editingAccountName: Ref<string>;
  setStatus: (message: string) => void;
  setErrorStatus: (message: string) => void;
  setSuccessStatus: (message: string) => void;
  loadAccounts: (user: AppUser) => Promise<void>;
  cancelEditAccount: () => void;
}) => {
  const {
    supabase,
    user,
    supportedCurrencies,
    loading,
    newAccountName,
    newAccountCurrency,
    newAccountOwnerId,
    editingAccountId,
    editingAccountName,
    setStatus,
    setErrorStatus,
    setSuccessStatus,
    loadAccounts,
    cancelEditAccount,
  } = params;

  const requireParent = () => {
    if (!user.value) return null;
    if (user.value.role !== "parent") {
      setStatus("仅家长可以执行此操作。");
      return null;
    }
    return user.value;
  };

  const handleCreateAccount = async () => {
    const currentUser = requireParent();
    if (!currentUser) return;

    const trimmedName = newAccountName.value.trim();
    const trimmedCurrency = newAccountCurrency.value.trim().toUpperCase();

    if (!trimmedName) {
      setStatus("请输入账户名称。");
      return;
    }

    if (!supportedCurrencies.includes(trimmedCurrency)) {
      setStatus("请选择有效币种。");
      return;
    }

    if (!newAccountOwnerId.value) {
      setStatus("请选择孩子账户归属。");
      return;
    }

    loading.value = true;
    try {
      const { error } = await supabase.rpc("create_account", {
        p_name: trimmedName,
        p_currency: trimmedCurrency,
        p_owner_child_id: newAccountOwnerId.value,
        p_created_by: currentUser.id,
      });

      if (error) {
        setErrorStatus(error.message);
        return;
      }

      newAccountName.value = "";
      setSuccessStatus("账户已创建。");
      await loadAccounts(currentUser);
    } finally {
      loading.value = false;
    }
  };

  const handleUpdateAccount = async () => {
    const currentUser = requireParent();
    if (!currentUser || !editingAccountId.value) return;

    const trimmedName = editingAccountName.value.trim();
    if (!trimmedName) {
      setStatus("请输入账户名称。");
      return;
    }

    loading.value = true;
    try {
      const { error } = await supabase.rpc("update_account_name", {
        p_account_id: editingAccountId.value,
        p_name: trimmedName,
        p_updated_by: currentUser.id,
      });

      if (error) {
        setErrorStatus(error.message);
        return;
      }

      await loadAccounts(currentUser);
      setSuccessStatus("账户名称已更新。");
      cancelEditAccount();
    } finally {
      loading.value = false;
    }
  };

  const startEditAccount = (account: Account) => {
    editingAccountId.value = account.id;
    editingAccountName.value = account.name;
  };

  return {
    handleCreateAccount,
    handleUpdateAccount,
    startEditAccount,
  };
};
