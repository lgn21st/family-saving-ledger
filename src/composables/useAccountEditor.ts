import type { Ref } from "vue";
import type { Account, AppUser, SupabaseFromClient } from "../types";

export const useAccountEditor = (params: {
  supabase: SupabaseFromClient;
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

  const handleCreateAccount = async () => {
    if (!user.value) return;

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
    const { error } = await supabase.from("accounts").insert([
      {
        name: trimmedName,
        currency: trimmedCurrency,
        owner_child_id: newAccountOwnerId.value,
        created_by: user.value.id,
        is_active: true,
      },
    ]);

    if (error) {
      setErrorStatus(error.message);
      loading.value = false;
      return;
    }

    newAccountName.value = "";
    setSuccessStatus("账户已创建。");
    await loadAccounts(user.value);
    loading.value = false;
  };

  const handleUpdateAccount = async () => {
    if (!user.value || !editingAccountId.value) return;

    const trimmedName = editingAccountName.value.trim();
    if (!trimmedName) {
      setStatus("请输入账户名称。");
      return;
    }

    loading.value = true;
    const { error } = await supabase
      .from("accounts")
      .update({ name: trimmedName })
      .eq("id", editingAccountId.value);

    if (error) {
      setErrorStatus(error.message);
      loading.value = false;
      return;
    }

    await loadAccounts(user.value);
    setSuccessStatus("账户名称已更新。");
    cancelEditAccount();
    loading.value = false;
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
