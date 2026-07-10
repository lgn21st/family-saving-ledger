import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { useChildren } from "../composables/useChildren";

const createSupabaseMock = () => {
  const insert = vi.fn(() => Promise.resolve({ error: null }));
  const update = vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ error: null })),
  }));
  const deleteFn = vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ error: null })),
    in: vi.fn(() => Promise.resolve({ error: null })),
  }));
  const select = vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
  }));
  const rpc = vi.fn(() => Promise.resolve({ data: 1, error: null }));

  return {
    from: () => ({
      insert,
      update,
      delete: deleteFn,
      select,
    }),
    rpc,
    spies: { insert, update, deleteFn, select, rpc },
  };
};

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
    const user = ref({ id: "parent" });

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
      confirmArchiveChild: vi.fn(() => true),
      setStatus,
      setErrorStatus,
      setSuccessStatus,
      loadChildUsers,
      loadLoginUsersAndSelect,
      loadAccounts,
    });

    await handleCreateChild();
    expect(setStatus).toHaveBeenCalledWith("请输入孩子姓名。");
    expect(supabase.spies.insert).not.toHaveBeenCalled();
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
    const user = ref({ id: "parent" });

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
      confirmArchiveChild: vi.fn(() => true),
      setStatus,
      setErrorStatus,
      setSuccessStatus,
      loadChildUsers,
      loadLoginUsersAndSelect,
      loadAccounts,
    });

    await handleCreateChild();

    expect(supabase.spies.insert).toHaveBeenCalled();
    expect(newChildName.value).toBe("");
    expect(newChildPin.value).toBe("");
    expect(newChildAvatarId.value).toBe("child-1");
    expect(loadChildUsers).toHaveBeenCalled();
    expect(loadLoginUsersAndSelect).toHaveBeenCalled();
    expect(setSuccessStatus).toHaveBeenCalledWith("孩子用户已创建。");
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
    const user = ref({ id: "parent" });

    const confirmArchiveChild = vi.fn(() => true);
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
      confirmArchiveChild,
      setStatus,
      setErrorStatus,
      setSuccessStatus,
      loadChildUsers,
      loadLoginUsersAndSelect,
      loadAccounts,
    });

    await handleArchiveChild("child-1");

    expect(confirmArchiveChild).toHaveBeenCalled();
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
    const user = ref({ id: "parent" });

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
      confirmArchiveChild: vi.fn(() => true),
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
    expect(supabase.spies.update).toHaveBeenCalled();
    expect(cancelEditChild).toHaveBeenCalled();
    expect(setSuccessStatus).toHaveBeenCalledWith("已更新名称。");
  });
});
