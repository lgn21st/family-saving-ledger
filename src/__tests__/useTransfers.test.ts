import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { useTransfers } from "../composables/useTransfers";

const createSupabaseMock = () => {
  return {
    rpc: vi.fn(() => Promise.resolve({ error: null })),
  };
};

describe("useTransfers", () => {
  it("validates transfer inputs and blocks invalid requests", async () => {
    const supabase = createSupabaseMock();
    const setSuccessStatus = vi.fn();
    const refreshAccountData = vi.fn(async () => undefined);

    const handle = useTransfers({
      supabase,
      userId: ref("parent"),
      selectedAccountId: ref("acc-1"),
      transferAmount: ref("0"),
      transferTargetId: ref(""),
      transferNote: ref(""),
      accounts: ref([{ id: "acc-1", currency: "CNY" }]),
      balances: ref({ "acc-1": 10 }),
      loading: ref(false),
      setSuccessStatus,
      refreshAccountData,
    });

    expect(await handle.handleTransfer()).toEqual({
      ok: false,
      message: "请输入有效转账金额。",
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("executes transfer and clears form", async () => {
    const supabase = createSupabaseMock();
    const setSuccessStatus = vi.fn();
    const refreshAccountData = vi.fn(async () => undefined);

    const transferAmount = ref("5");
    const transferTargetId = ref("acc-2");
    const transferNote = ref("备注");

    const { handleTransfer } = useTransfers({
      supabase,
      userId: ref("parent"),
      selectedAccountId: ref("acc-1"),
      transferAmount,
      transferTargetId,
      transferNote,
      accounts: ref([
        { id: "acc-1", currency: "CNY" },
        { id: "acc-2", currency: "CNY" },
      ]),
      balances: ref({ "acc-1": 10 }),
      loading: ref(false),
      setSuccessStatus,
      refreshAccountData,
    });

    expect(await handleTransfer()).toEqual({ ok: true });
    expect(supabase.rpc).toHaveBeenCalledWith("transfer_between_accounts", {
      p_source_account_id: "acc-1",
      p_target_account_id: "acc-2",
      p_amount: 5,
      p_note: "备注",
      p_created_by: "parent",
    });
    expect(transferAmount.value).toBe("");
    expect(transferTargetId.value).toBe("");
    expect(transferNote.value).toBe("");
    expect(setSuccessStatus).toHaveBeenCalledWith("转账完成。");
    expect(refreshAccountData).toHaveBeenCalled();
  });

  it("returns a mapped error when the transfer RPC fails", async () => {
    const supabase = {
      rpc: vi.fn(() =>
        Promise.resolve({ error: { message: "Insufficient balance" } }),
      ),
    };
    const loading = ref(false);

    const { handleTransfer } = useTransfers({
      supabase,
      userId: ref("parent"),
      selectedAccountId: ref("acc-1"),
      transferAmount: ref("5"),
      transferTargetId: ref("acc-2"),
      transferNote: ref(""),
      accounts: ref([
        { id: "acc-1", currency: "CNY" },
        { id: "acc-2", currency: "CNY" },
      ]),
      balances: ref({ "acc-1": 10 }),
      loading,
      setSuccessStatus: vi.fn(),
      refreshAccountData: vi.fn(async () => undefined),
    });

    expect(await handleTransfer()).toEqual({
      ok: false,
      message: "余额不足。",
    });
    expect(loading.value).toBe(false);
  });
});
