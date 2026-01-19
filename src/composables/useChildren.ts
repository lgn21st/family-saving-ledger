import type { Ref } from "vue";
import type { AppUser, SupabaseFromClient } from "../types";

export const useChildren = (params: {
  supabase: SupabaseFromClient;
  user: Ref<AppUser | null>;
  loading: Ref<boolean>;
  newChildName: Ref<string>;
  newChildPin: Ref<string>;
  newChildAvatarId: Ref<string>;
  defaultAvatarId: string;
  editingChildId: Ref<string | null>;
  editingChildName: Ref<string>;
  cancelEditChild: () => void;
  setStatus: (message: string) => void;
  setErrorStatus: (message: string) => void;
  setSuccessStatus: (message: string) => void;
  loadChildUsers: () => Promise<void>;
  loadLoginUsersAndSelect: () => Promise<void>;
  loadAccounts: (user: AppUser) => Promise<void>;
}) => {
  const {
    supabase,
    user,
    loading,
    newChildName,
    newChildPin,
    newChildAvatarId,
    defaultAvatarId,
    editingChildId,
    editingChildName,
    cancelEditChild,
    setStatus,
    setErrorStatus,
    setSuccessStatus,
    loadChildUsers,
    loadLoginUsersAndSelect,
    loadAccounts,
  } = params;

  const handleCreateChild = async () => {
    if (!user.value) return;

    const trimmedName = newChildName.value.trim();
    const trimmedPin = newChildPin.value.trim();

    if (!trimmedName) {
      setStatus("请输入孩子姓名。");
      return;
    }

    if (trimmedPin.length !== 4) {
      setStatus("请输入 4 位 PIN。");
      return;
    }

    if (!newChildAvatarId.value) {
      setStatus("请选择头像。");
      return;
    }

    loading.value = true;
    const { error } = await supabase.from("app_users").insert([
      {
        name: trimmedName,
        role: "child",
        pin: trimmedPin,
        avatar_id: newChildAvatarId.value,
      },
    ]);

    if (error) {
      setErrorStatus(error.message);
      loading.value = false;
      return;
    }

    newChildName.value = "";
    newChildPin.value = "";
    newChildAvatarId.value = defaultAvatarId;
    setSuccessStatus("孩子用户已创建。");
    await loadChildUsers();
    await loadLoginUsersAndSelect();
    loading.value = false;
  };

  const handleDeleteChild = async (childId: string) => {
    if (!user.value) return;

    loading.value = true;

    const { data: childAccounts, error: childAccountsError } = await supabase
      .from("accounts")
      .select("id")
      .eq("owner_child_id", childId);

    if (childAccountsError) {
      setErrorStatus(childAccountsError.message);
      loading.value = false;
      return;
    }

    const accountRows = (childAccounts ?? []) as Array<{ id: string }>;
    const accountIds = accountRows.map((account) => account.id);

    if (accountIds.length > 0) {
      const { error: transactionsError } = await supabase
        .from("transactions")
        .delete()
        .in("account_id", accountIds);

      if (transactionsError) {
        setErrorStatus(transactionsError.message);
        loading.value = false;
        return;
      }

      const { error: accountsError } = await supabase
        .from("accounts")
        .delete()
        .in("id", accountIds);

      if (accountsError) {
        setErrorStatus(accountsError.message);
        loading.value = false;
        return;
      }
    }

    const { error: childError } = await supabase
      .from("app_users")
      .delete()
      .eq("id", childId);

    if (childError) {
      setErrorStatus(childError.message);
      loading.value = false;
      return;
    }

    await loadChildUsers();
    await loadAccounts(user.value);
    await loadLoginUsersAndSelect();
    setSuccessStatus("已删除孩子及关联账户。");
    loading.value = false;
  };

  const handleUpdateChild = async () => {
    if (!user.value || !editingChildId.value) return;

    const trimmedName = editingChildName.value.trim();
    if (!trimmedName) {
      setStatus("请输入孩子姓名。");
      return;
    }

    loading.value = true;
    const { error } = await supabase
      .from("app_users")
      .update({ name: trimmedName })
      .eq("id", editingChildId.value);

    if (error) {
      setErrorStatus(error.message);
      loading.value = false;
      return;
    }

    await loadChildUsers();
    await loadLoginUsersAndSelect();
    setSuccessStatus("已更新名称。");
    cancelEditChild();
    loading.value = false;
  };

  return {
    handleCreateChild,
    handleDeleteChild,
    handleUpdateChild,
  };
};
