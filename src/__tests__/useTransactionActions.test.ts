import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { useTransactionActions } from "../composables/useTransactionActions";

const createSupabaseMock = () => {
  return {
    rpc: vi.fn(() => Promise.resolve({ error: null })),
  };
};

describe("useTransactionActions", () => {
  it("blocks when required inputs are missing", async () => {
    const supabase = createSupabaseMock();
    const setStatus = vi.fn();
    const setErrorStatus = vi.fn();
    const setSuccessStatus = vi.fn();
    const refreshAccountData = vi.fn(async () => undefined);

    const { handleAddTransaction } = useTransactionActions({
      supabase,
      userId: ref(null),
      selectedAccountId: ref(null),
      amountInput: ref("1"),
      noteInput: ref("note"),
      loading: ref(false),
      setStatus,
      setErrorStatus,
      setSuccessStatus,
      refreshAccountData,
    });

    await handleAddTransaction("deposit");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("validates amount and note before calling rpc", async () => {
    const supabase = createSupabaseMock();
    const setStatus = vi.fn();
    const setErrorStatus = vi.fn();
    const setSuccessStatus = vi.fn();
    const refreshAccountData = vi.fn(async () => undefined);

    const amountInput = ref("0");
    const noteInput = ref(" ");

    const { handleAddTransaction } = useTransactionActions({
      supabase,
      userId: ref("parent"),
      selectedAccountId: ref("acc-1"),
      amountInput,
      noteInput,
      loading: ref(false),
      setStatus,
      setErrorStatus,
      setSuccessStatus,
      refreshAccountData,
    });

    await handleAddTransaction("deposit");
    expect(setStatus).toHaveBeenCalledWith("请输入有效金额。");
    expect(supabase.rpc).not.toHaveBeenCalled();

    amountInput.value = "5";
    await handleAddTransaction("deposit");
    expect(setStatus).toHaveBeenCalledWith("请输入备注。");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("calls rpc and resets inputs on success", async () => {
    const supabase = createSupabaseMock();
    const setStatus = vi.fn();
    const setErrorStatus = vi.fn();
    const setSuccessStatus = vi.fn();
    const refreshAccountData = vi.fn(async () => undefined);

    const amountInput = ref("20");
    const noteInput = ref("早餐");
    const loading = ref(false);

    const { handleAddTransaction } = useTransactionActions({
      supabase,
      userId: ref("parent"),
      selectedAccountId: ref("acc-1"),
      amountInput,
      noteInput,
      loading,
      setStatus,
      setErrorStatus,
      setSuccessStatus,
      refreshAccountData,
    });

    await handleAddTransaction("deposit");
    expect(supabase.rpc).toHaveBeenCalledWith("apply_transaction", {
      p_account_id: "acc-1",
      p_type: "deposit",
      p_amount: 20,
      p_note: "早餐",
      p_created_by: "parent",
    });
    expect(amountInput.value).toBe("");
    expect(noteInput.value).toBe("");
    expect(setSuccessStatus).toHaveBeenCalledWith("已保存交易。");
    expect(refreshAccountData).toHaveBeenCalled();
    expect(loading.value).toBe(false);
  });

  it("sets error status when rpc fails", async () => {
    const supabase = {
      rpc: vi.fn(() =>
        Promise.resolve({ error: { message: "boom" } }),
      ),
    };
    const setStatus = vi.fn();
    const setErrorStatus = vi.fn();
    const setSuccessStatus = vi.fn();
    const refreshAccountData = vi.fn(async () => undefined);

    const amountInput = ref("8");
    const noteInput = ref("车费");
    const loading = ref(false);

    const { handleAddTransaction } = useTransactionActions({
      supabase,
      userId: ref("parent"),
      selectedAccountId: ref("acc-1"),
      amountInput,
      noteInput,
      loading,
      setStatus,
      setErrorStatus,
      setSuccessStatus,
      refreshAccountData,
    });

    await handleAddTransaction("withdrawal");
    expect(setErrorStatus).toHaveBeenCalledWith("boom");
    expect(refreshAccountData).not.toHaveBeenCalled();
    expect(loading.value).toBe(false);
  });
});
