import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { useAccountEditor } from "../composables/useAccountEditor";

const createSupabaseMock = () => {
  const insert = vi.fn(() => Promise.resolve({ error: null }));
  const update = vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ error: null })),
  }));

  return {
    from: () => ({
      insert,
      update,
    }),
    spies: { insert, update },
  };
};

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
    const user = ref({ id: "parent" });

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
    expect(supabase.spies.insert).not.toHaveBeenCalled();
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
    const user = ref({ id: "parent" });

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
    expect(supabase.spies.insert).toHaveBeenCalled();
    expect(newAccountName.value).toBe("");
    expect(setSuccessStatus).toHaveBeenCalledWith("账户已创建。");
    expect(loadAccounts).toHaveBeenCalled();
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
    const user = ref({ id: "parent" });

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
    expect(supabase.spies.update).toHaveBeenCalled();
    expect(cancelEditAccount).toHaveBeenCalled();
    expect(setSuccessStatus).toHaveBeenCalledWith("账户名称已更新。");
  });
});
