/**
 * 孩子用户管理
 * 创建、编辑、归档孩子账户
 *
 * 功能：
 * - 创建新孩子用户（需姓名、4位PIN、头像）
 * - 编辑孩子姓名
 * - 归档余额已清零的孩子及账户，保留账本记录
 *
 * 依赖：
 * - 需要外部调用 loadChildUsers 刷新列表
 * - 需要外部调用 loadAccounts 刷新账户
 */
import type { Ref } from "vue";
import type { AppUser, SupabaseClient } from "../types";

export const useChildren = (params: {
  supabase: SupabaseClient;
  user: Ref<AppUser | null>;
  loading: Ref<boolean>;
  newChildName: Ref<string>;
  newChildPin: Ref<string>;
  newChildAvatarId: Ref<string>;
  defaultAvatarId: string;
  editingChildId: Ref<string | null>;
  editingChildName: Ref<string>;
  cancelEditChild: () => void;
  confirmArchiveChild: () => boolean;
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
    confirmArchiveChild,
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

  const handleArchiveChild = async (childId: string) => {
    if (!user.value) return;
    if (!confirmArchiveChild()) return;

    loading.value = true;
    const { error } = await supabase.rpc("archive_child", {
      p_child_id: childId,
      p_archived_by: user.value.id,
    });

    if (error) {
      setErrorStatus(error.message);
      loading.value = false;
      return;
    }

    await loadChildUsers();
    await loadAccounts(user.value);
    await loadLoginUsersAndSelect();
    setSuccessStatus("孩子及其账户已归档，账本记录已保留。");
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
    handleArchiveChild,
    handleUpdateChild,
  };
};
