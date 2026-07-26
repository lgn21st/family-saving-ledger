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
    const setSuccessStatus = vi.fn();
    const refreshAccountData = vi.fn(async () => undefined);

    const { handleAddTransaction } = useTransactionActions({
      supabase,
      userId: ref(null),
      selectedAccountId: ref(null),
      amountInput: ref("1"),
      noteInput: ref("note"),
      loading: ref(false),
      setSuccessStatus,
      refreshAccountData,
    });

    const result = await handleAddTransaction("deposit");
    expect(result).toEqual({ ok: false, message: "请选择可用账户。" });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("validates amount and note before calling rpc", async () => {
    const supabase = createSupabaseMock();
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
      setSuccessStatus,
      refreshAccountData,
    });

    expect(await handleAddTransaction("deposit")).toEqual({
      ok: false,
      message: "请输入有效金额。",
    });
    expect(supabase.rpc).not.toHaveBeenCalled();

    amountInput.value = "5";
    expect(await handleAddTransaction("deposit")).toEqual({
      ok: false,
      message: "请输入备注。",
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("calls rpc and resets inputs on success", async () => {
    const supabase = createSupabaseMock();
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
      setSuccessStatus,
      refreshAccountData,
    });

    expect(await handleAddTransaction("deposit")).toEqual({ ok: true });
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

  it("returns a displayable error when rpc fails", async () => {
    const supabase = {
      rpc: vi.fn(() =>
        Promise.resolve({ error: { message: "boom" } }),
      ),
    };
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
      setSuccessStatus,
      refreshAccountData,
    });

    expect(await handleAddTransaction("withdrawal")).toEqual({
      ok: false,
      message: "boom",
    });
    expect(refreshAccountData).not.toHaveBeenCalled();
    expect(loading.value).toBe(false);
  });
});
