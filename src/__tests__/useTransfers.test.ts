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
    const setStatus = vi.fn();
    const setErrorStatus = vi.fn();
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
      setStatus,
      setErrorStatus,
      setSuccessStatus,
      refreshAccountData,
    });

    await handle.handleTransfer();
    expect(setStatus).toHaveBeenCalledWith("请输入有效转账金额。");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("executes transfer and clears form", async () => {
    const supabase = createSupabaseMock();
    const setStatus = vi.fn();
    const setErrorStatus = vi.fn();
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
      setStatus,
      setErrorStatus,
      setSuccessStatus,
      refreshAccountData,
    });

    await handleTransfer();
    expect(supabase.rpc).toHaveBeenCalled();
    expect(transferAmount.value).toBe("");
    expect(transferTargetId.value).toBe("");
    expect(transferNote.value).toBe("");
    expect(setSuccessStatus).toHaveBeenCalledWith("转账完成。");
    expect(refreshAccountData).toHaveBeenCalled();
  });
});
