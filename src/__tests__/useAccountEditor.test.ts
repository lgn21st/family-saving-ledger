import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { useAccountEditor } from "../composables/useAccountEditor";

const createSupabaseMock = () => {
  const rpc = vi.fn(() => Promise.resolve({ error: null }));
  return {
    rpc,
    spies: { rpc },
  };
};

const parentUser = { id: "parent", name: "爸爸", role: "parent" as const };

describe("useAccountEditor", () => {
  it("validates account creation inputs", async () => {
    const supabase = createSupabaseMock();
    const setStatus = vi.fn();
    const setErrorStatus = vi.fn();
    const setSuccessStatus = vi.fn();
    const loadAccounts = vi.fn(async () => undefined);
    const cancelEditAccount = vi.fn();

    const newAccountName = ref("");
    const newAccountCurrency = ref("SGD");
    const newAccountOwnerId = ref("");
    const editingAccountId = ref<string | null>(null);
    const editingAccountName = ref("");
    const loading = ref(false);
    const user = ref(parentUser);

    const { handleCreateAccount } = useAccountEditor({
      supabase,
      user,
      supportedCurrencies: ["SGD", "CNY"],
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
    });

    await handleCreateAccount();
    expect(setStatus).toHaveBeenCalledWith("请输入账户名称。");
    expect(supabase.spies.rpc).not.toHaveBeenCalled();
  });

  it("creates an account and clears form", async () => {
    const supabase = createSupabaseMock();
    const setStatus = vi.fn();
    const setErrorStatus = vi.fn();
    const setSuccessStatus = vi.fn();
    const loadAccounts = vi.fn(async () => undefined);
    const cancelEditAccount = vi.fn();

    const newAccountName = ref("零花钱");
    const newAccountCurrency = ref("CNY");
    const newAccountOwnerId = ref("child-1");
    const editingAccountId = ref<string | null>(null);
    const editingAccountName = ref("");
    const loading = ref(false);
    const user = ref(parentUser);

    const { handleCreateAccount } = useAccountEditor({
      supabase,
      user,
      supportedCurrencies: ["SGD", "CNY"],
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
    });

    await handleCreateAccount();
    expect(supabase.spies.rpc).toHaveBeenCalledWith("create_account", {
      p_name: "零花钱",
      p_currency: "CNY",
      p_owner_child_id: "child-1",
      p_created_by: "parent",
    });
    expect(newAccountName.value).toBe("");
    expect(setSuccessStatus).toHaveBeenCalledWith("账户已创建。");
    expect(loadAccounts).toHaveBeenCalled();
    expect(loading.value).toBe(false);
  });

  it("updates account name with validation", async () => {
    const supabase = createSupabaseMock();
    const setStatus = vi.fn();
    const setErrorStatus = vi.fn();
    const setSuccessStatus = vi.fn();
    const loadAccounts = vi.fn(async () => undefined);
    const cancelEditAccount = vi.fn();

    const newAccountName = ref("");
    const newAccountCurrency = ref("CNY");
    const newAccountOwnerId = ref("child-1");
    const editingAccountId = ref<string | null>("acc-1");
    const editingAccountName = ref("");
    const loading = ref(false);
    const user = ref(parentUser);

    const { handleUpdateAccount } = useAccountEditor({
      supabase,
      user,
      supportedCurrencies: ["SGD", "CNY"],
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
    });

    await handleUpdateAccount();
    expect(setStatus).toHaveBeenCalledWith("请输入账户名称。");

    editingAccountName.value = "新名称";
    await handleUpdateAccount();
    expect(supabase.spies.rpc).toHaveBeenCalledWith("update_account_name", {
      p_account_id: "acc-1",
      p_name: "新名称",
      p_updated_by: "parent",
    });
    expect(cancelEditAccount).toHaveBeenCalled();
    expect(setSuccessStatus).toHaveBeenCalledWith("账户名称已更新。");
  });
});
