import type { Ref } from "vue";
import type { AppUser, SupabaseRpcClient } from "../types";

export const useChildren = (params: {
  supabase: SupabaseRpcClient;
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

  const requireParent = () => {
    if (!user.value) return null;
    if (user.value.role !== "parent") {
      setStatus("仅家长可以执行此操作。");
      return null;
    }
    return user.value;
  };

  const handleCreateChild = async () => {
    const currentUser = requireParent();
    if (!currentUser) return;

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
    try {
      const { error } = await supabase.rpc("create_child", {
        p_name: trimmedName,
        p_pin: trimmedPin,
        p_avatar_id: newChildAvatarId.value,
        p_created_by: currentUser.id,
      });

      if (error) {
        setErrorStatus(error.message);
        return;
      }

      newChildName.value = "";
      newChildPin.value = "";
      newChildAvatarId.value = defaultAvatarId;
      setSuccessStatus("孩子用户已创建。");
      await loadChildUsers();
      await loadLoginUsersAndSelect();
    } finally {
      loading.value = false;
    }
  };

  const handleArchiveChild = async (childId: string) => {
    const currentUser = requireParent();
    if (!currentUser) return;

    loading.value = true;
    try {
      const { error } = await supabase.rpc("archive_child", {
        p_child_id: childId,
        p_archived_by: currentUser.id,
      });

      if (error) {
        setErrorStatus(error.message);
        return;
      }

      await loadChildUsers();
      await loadAccounts(currentUser);
      await loadLoginUsersAndSelect();
      setSuccessStatus("孩子及其账户已归档，账本记录已保留。");
    } finally {
      loading.value = false;
    }
  };

  const handleUpdateChild = async () => {
    const currentUser = requireParent();
    if (!currentUser || !editingChildId.value) return;

    const trimmedName = editingChildName.value.trim();
    if (!trimmedName) {
      setStatus("请输入孩子姓名。");
      return;
    }

    loading.value = true;
    try {
      const { error } = await supabase.rpc("update_child_name", {
        p_child_id: editingChildId.value,
        p_name: trimmedName,
        p_updated_by: currentUser.id,
      });

      if (error) {
        setErrorStatus(error.message);
        return;
      }

      await loadChildUsers();
      await loadLoginUsersAndSelect();
      setSuccessStatus("已更新名称。");
      cancelEditChild();
    } finally {
      loading.value = false;
    }
  };

  return {
    handleCreateChild,
    handleArchiveChild,
    handleUpdateChild,
  };
};
