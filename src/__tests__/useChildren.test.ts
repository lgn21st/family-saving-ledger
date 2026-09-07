import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { useChildren } from "../composables/useChildren";

const createSupabaseMock = () => {
  const rpc = vi.fn(() => Promise.resolve({ data: 1, error: null }));

  return {
    rpc,
    spies: { rpc },
  };
};

const parentUser = { id: "parent", name: "爸爸", role: "parent" as const };

describe("useChildren", () => {
  it("validates child creation inputs", async () => {
    const supabase = createSupabaseMock();
    const setStatus = vi.fn();
    const setErrorStatus = vi.fn();
    const setSuccessStatus = vi.fn();
    const loadChildUsers = vi.fn(async () => undefined);
    const loadLoginUsersAndSelect = vi.fn(async () => undefined);
    const loadAccounts = vi.fn(async () => undefined);

    const newChildName = ref("");
    const newChildPin = ref("");
    const newChildAvatarId = ref("child-1");
    const editingChildId = ref<string | null>(null);
    const editingChildName = ref("");
    const loading = ref(false);
    const user = ref(parentUser);

    const { handleCreateChild } = useChildren({
      supabase,
      user,
      loading,
      newChildName,
      newChildPin,
      newChildAvatarId,
      defaultAvatarId: "child-1",
      editingChildId,
      editingChildName,
      cancelEditChild: vi.fn(),
      setStatus,
      setErrorStatus,
      setSuccessStatus,
      loadChildUsers,
      loadLoginUsersAndSelect,
      loadAccounts,
    });

    await handleCreateChild();
    expect(setStatus).toHaveBeenCalledWith("请输入孩子姓名。");
    expect(supabase.spies.rpc).not.toHaveBeenCalled();
  });

  it("creates child and resets form", async () => {
    const supabase = createSupabaseMock();
    const setStatus = vi.fn();
    const setErrorStatus = vi.fn();
    const setSuccessStatus = vi.fn();
    const loadChildUsers = vi.fn(async () => undefined);
    const loadLoginUsersAndSelect = vi.fn(async () => undefined);
    const loadAccounts = vi.fn(async () => undefined);

    const newChildName = ref("小宝");
    const newChildPin = ref("1234");
    const newChildAvatarId = ref("child-2");
    const editingChildId = ref<string | null>(null);
    const editingChildName = ref("");
    const loading = ref(false);
    const user = ref(parentUser);

    const { handleCreateChild } = useChildren({
      supabase,
      user,
      loading,
      newChildName,
      newChildPin,
      newChildAvatarId,
      defaultAvatarId: "child-1",
      editingChildId,
      editingChildName,
      cancelEditChild: vi.fn(),
      setStatus,
      setErrorStatus,
      setSuccessStatus,
      loadChildUsers,
      loadLoginUsersAndSelect,
      loadAccounts,
    });

    await handleCreateChild();

    expect(supabase.spies.rpc).toHaveBeenCalledWith("create_child", {
      p_name: "小宝",
      p_pin: "1234",
      p_avatar_id: "child-2",
      p_created_by: "parent",
    });
    expect(newChildName.value).toBe("");
    expect(newChildPin.value).toBe("");
    expect(newChildAvatarId.value).toBe("child-1");
    expect(loadChildUsers).toHaveBeenCalled();
    expect(loadLoginUsersAndSelect).toHaveBeenCalled();
    expect(setSuccessStatus).toHaveBeenCalledWith("孩子用户已创建。");
    expect(loading.value).toBe(false);
  });

  it("archives child through one RPC and reloads data", async () => {
    const supabase = createSupabaseMock();

    const setStatus = vi.fn();
    const setErrorStatus = vi.fn();
    const setSuccessStatus = vi.fn();
    const loadChildUsers = vi.fn(async () => undefined);
    const loadLoginUsersAndSelect = vi.fn(async () => undefined);
    const loadAccounts = vi.fn(async () => undefined);

    const newChildName = ref("");
    const newChildPin = ref("");
    const newChildAvatarId = ref("child-1");
    const editingChildId = ref<string | null>(null);
    const editingChildName = ref("");
    const loading = ref(false);
    const user = ref(parentUser);

    const { handleArchiveChild } = useChildren({
      supabase,
      user,
      loading,
      newChildName,
      newChildPin,
      newChildAvatarId,
      defaultAvatarId: "child-1",
      editingChildId,
      editingChildName,
      cancelEditChild: vi.fn(),
      setStatus,
      setErrorStatus,
      setSuccessStatus,
      loadChildUsers,
      loadLoginUsersAndSelect,
      loadAccounts,
    });

    await handleArchiveChild("child-1");

    expect(supabase.spies.rpc).toHaveBeenCalledWith("archive_child", {
      p_child_id: "child-1",
      p_archived_by: "parent",
    });
    expect(loadChildUsers).toHaveBeenCalled();
    expect(loadAccounts).toHaveBeenCalled();
    expect(loadLoginUsersAndSelect).toHaveBeenCalled();
    expect(setSuccessStatus).toHaveBeenCalledWith(
      "孩子及其账户已归档，账本记录已保留。",
    );
  });

  it("maps archive RPC errors", async () => {
    const supabase = {
      rpc: vi.fn(() =>
        Promise.resolve({
          error: { message: "All child account balances must be zero before archiving" },
        }),
      ),
    };
    const setErrorStatus = vi.fn();
    const user = ref(parentUser);

    const { handleArchiveChild } = useChildren({
      supabase,
      user,
      loading: ref(false),
      newChildName: ref(""),
      newChildPin: ref(""),
      newChildAvatarId: ref("child-1"),
      defaultAvatarId: "child-1",
      editingChildId: ref(null),
      editingChildName: ref(""),
      cancelEditChild: vi.fn(),
      setStatus: vi.fn(),
      setErrorStatus,
      setSuccessStatus: vi.fn(),
      loadChildUsers: vi.fn(async () => undefined),
      loadLoginUsersAndSelect: vi.fn(async () => undefined),
      loadAccounts: vi.fn(async () => undefined),
    });

    await handleArchiveChild("child-1");
    expect(setErrorStatus).toHaveBeenCalledWith(
      "All child account balances must be zero before archiving",
    );
  });

  it("updates child name with validation", async () => {
    const supabase = createSupabaseMock();
    const setStatus = vi.fn();
    const setErrorStatus = vi.fn();
    const setSuccessStatus = vi.fn();
    const loadChildUsers = vi.fn(async () => undefined);
    const loadLoginUsersAndSelect = vi.fn(async () => undefined);
    const loadAccounts = vi.fn(async () => undefined);
    const cancelEditChild = vi.fn();

    const newChildName = ref("");
    const newChildPin = ref("");
    const newChildAvatarId = ref("child-1");
    const editingChildId = ref<string | null>("child-1");
    const editingChildName = ref("");
    const loading = ref(false);
    const user = ref(parentUser);

    const { handleUpdateChild } = useChildren({
      supabase,
      user,
      loading,
      newChildName,
      newChildPin,
      newChildAvatarId,
      defaultAvatarId: "child-1",
      editingChildId,
      editingChildName,
      cancelEditChild,
      setStatus,
      setErrorStatus,
      setSuccessStatus,
      loadChildUsers,
      loadLoginUsersAndSelect,
      loadAccounts,
    });

    await handleUpdateChild();
    expect(setStatus).toHaveBeenCalledWith("请输入孩子姓名。");

    editingChildName.value = "小宝";
    await handleUpdateChild();
    expect(supabase.spies.rpc).toHaveBeenCalledWith("update_child_name", {
      p_child_id: "child-1",
      p_name: "小宝",
      p_updated_by: "parent",
    });
    expect(cancelEditChild).toHaveBeenCalled();
    expect(setSuccessStatus).toHaveBeenCalledWith("已更新名称。");
  });
});
