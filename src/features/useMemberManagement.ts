import { getCurrentScope, onScopeDispose, ref } from "vue";
import type { AppUser, LedgerActionResult } from "../types";
import type { LedgerCommands } from "../composables/useLedgerCommands";
import type { Feedback } from "./contracts";

export const useMemberManagement = (
  params: Feedback &
    Pick<LedgerCommands, "createChild" | "updateChildName" | "archiveChild"> & {
      defaultAvatarId: string;
    },
) => {
  const newChildName = ref("");
  const newChildPin = ref("");
  const newChildAvatarId = ref(params.defaultAvatarId);
  const editingChildId = ref<string | null>(null);
  const editingChildName = ref("");
  const loading = ref(false);
  let active = true;
  if (getCurrentScope())
    onScopeDispose(() => {
      active = false;
    });

  const cancelEditChild = () => {
    editingChildId.value = null;
    editingChildName.value = "";
  };
  const startEditChild = (child: AppUser) => {
    if (loading.value) return;
    editingChildId.value = child.id;
    editingChildName.value = child.name;
  };
  const submit = async (
    action: () => Promise<LedgerActionResult>,
    success: () => void,
  ) => {
    if (loading.value) return;
    loading.value = true;
    try {
      const result = await action();
      if (!active) return;
      if (!result.ok) params.setErrorStatus(result.message);
      else {
        success();
        if (result.warning) params.setErrorStatus(result.warning);
      }
    } finally {
      loading.value = false;
    }
  };
  const handleCreateChild = async () => {
    const name = newChildName.value.trim();
    const pin = newChildPin.value.trim();
    if (!name) return params.setErrorStatus("请输入孩子姓名。");
    if (!/^[0-9]{4}$/.test(pin))
      return params.setErrorStatus("请输入 4 位 PIN。");
    if (!newChildAvatarId.value) return params.setErrorStatus("请选择头像。");
    const input = { name, pin, avatarId: newChildAvatarId.value };
    await submit(
      () => params.createChild(input),
      () => {
        newChildName.value = "";
        newChildPin.value = "";
        newChildAvatarId.value = params.defaultAvatarId;
        params.setSuccessStatus("孩子用户已创建。");
      },
    );
  };
  const handleArchiveChild = async (childId: string) => {
    await submit(
      () => params.archiveChild(childId),
      () => {
        if (editingChildId.value === childId) cancelEditChild();
        params.setSuccessStatus("孩子及其账户已归档，账本记录已保留。");
      },
    );
  };
  const handleUpdateChild = async () => {
    const id = editingChildId.value;
    if (!id) return;
    const name = editingChildName.value.trim();
    if (!name) return params.setErrorStatus("请输入孩子姓名。");
    await submit(
      () => params.updateChildName(id, name),
      () => {
        cancelEditChild();
        params.setSuccessStatus("已更新名称。");
      },
    );
  };
  return {
    newChildName,
    newChildPin,
    newChildAvatarId,
    editingChildId,
    editingChildName,
    loading,
    cancelEditChild,
    startEditChild,
    handleCreateChild,
    handleArchiveChild,
    handleUpdateChild,
  };
};
