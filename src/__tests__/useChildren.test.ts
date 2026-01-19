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

  return {
    from: () => ({
      insert,
      update,
      delete: deleteFn,
      select,
    }),
    spies: { insert, update, deleteFn, select },
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

  it("deletes child and reloads data", async () => {
    const supabase = createSupabaseMock();
    supabase.spies.select.mockReturnValueOnce({
      eq: vi.fn(() =>
        Promise.resolve({ data: [{ id: "acc-1" }], error: null }),
      ),
    });

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

    const { handleDeleteChild } = useChildren({
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

    await handleDeleteChild("child-1");

    expect(loadChildUsers).toHaveBeenCalled();
    expect(loadAccounts).toHaveBeenCalled();
    expect(loadLoginUsersAndSelect).toHaveBeenCalled();
    expect(setSuccessStatus).toHaveBeenCalledWith("已删除孩子及关联账户。");
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
